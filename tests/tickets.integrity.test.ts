import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/backend/src/app.js";
import { prisma } from "../src/backend/src/lib/prisma.js";

/**
 * Complementary integration coverage for search, immutable reporter,
 * terminal-state mutations, and detail/comment contracts. Kept in a
 * separate file so it does not collide with other coverage PRs that
 * extend tickets.integration.test.ts.
 */

let server: Server;
let baseUrl: string;

let reporterId: number;
let assigneeId: number;

interface HttpResult {
  status: number;
  body: any;
}

async function http(
  method: string,
  path: string,
  body?: unknown,
): Promise<HttpResult> {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : undefined };
}

async function resetDb() {
  await prisma.comment.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.user.deleteMany();

  const reporter = await prisma.user.create({
    data: { name: "Reporter", email: "reporter@test.local", role: "AGENT" },
  });
  const assignee = await prisma.user.create({
    data: { name: "Assignee", email: "assignee@test.local", role: "AGENT" },
  });
  reporterId = reporter.id;
  assigneeId = assignee.id;
}

async function createTicket(overrides: Record<string, unknown> = {}) {
  return http("POST", "/api/tickets", {
    title: "Test ticket",
    description: "A ticket used in tests",
    priority: "MEDIUM",
    createdById: reporterId,
    ...overrides,
  });
}

async function closeTicket(id: number) {
  for (const status of ["IN_PROGRESS", "RESOLVED", "CLOSED"]) {
    const res = await http("PATCH", `/api/tickets/${id}/status`, { status });
    expect(res.status).toBe(200);
  }
}

beforeAll(async () => {
  const app = createApp();
  await new Promise<void>((resolve) => {
    server = app.listen(0, resolve);
  });
  const { port } = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((err) => (err ? reject(err) : resolve())),
  );
  await prisma.$disconnect();
});

beforeEach(async () => {
  await resetDb();
});

describe("tickets API - search and list integrity", () => {
  it("finds a ticket by description when the title does not match", async () => {
    await createTicket({
      title: "Alpha",
      description: "unique-gateway-timeout-xyz",
    });
    await createTicket({
      title: "Beta",
      description: "unrelated printer jam",
    });

    const res = await http("GET", "/api/tickets?search=gateway-timeout-xyz");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe("Alpha");
  });

  it("matches search keywords case-insensitively", async () => {
    await createTicket({ title: "Payment Gateway" });
    await createTicket({ title: "Email delivery" });

    const lower = await http("GET", "/api/tickets?search=payment");
    const upper = await http("GET", "/api/tickets?search=GATEWAY");

    expect(lower.body).toHaveLength(1);
    expect(upper.body).toHaveLength(1);
    expect(lower.body[0].title).toBe("Payment Gateway");
    expect(upper.body[0].title).toBe("Payment Gateway");
  });

  it("returns a ticket only once when both title and description match", async () => {
    await createTicket({
      title: "timeout on checkout",
      description: "timeout while charging the card",
    });

    const res = await http("GET", "/api/tickets?search=timeout");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe("timeout on checkout");
  });
});

describe("tickets API - identity and terminal-state integrity", () => {
  it("creates a ticket with an explicit null assignee", async () => {
    const res = await createTicket({ assignedToId: null });
    expect(res.status).toBe(201);
    expect(res.body.assignedToId).toBeNull();
    expect(res.body.assignedTo).toBeNull();
  });

  it("does not change createdById when it is sent alongside a valid PATCH field", async () => {
    const created = await createTicket();
    const res = await http("PATCH", `/api/tickets/${created.body.id}`, {
      title: "Updated title",
      createdById: assigneeId,
    });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe("Updated title");
    expect(res.body.createdById).toBe(reporterId);
  });

  it("rejects OPEN -> OPEN without mutating the stored status", async () => {
    const created = await createTicket();
    const id = created.body.id;

    const res = await http("PATCH", `/api/tickets/${id}/status`, {
      status: "OPEN",
    });
    expect(res.status).toBe(400);

    const detail = await http("GET", `/api/tickets/${id}`);
    expect(detail.body.status).toBe("OPEN");
  });

  it("returns 404 for integer ids that cannot exist", async () => {
    const zero = await http("GET", "/api/tickets/0");
    expect(zero.status).toBe(404);

    const negative = await http("PATCH", "/api/tickets/-1", {
      title: "nope",
    });
    expect(negative.status).toBe(404);
  });

  it("still allows comments after a ticket is CLOSED", async () => {
    const created = await createTicket();
    await closeTicket(created.body.id);

    const res = await http("POST", `/api/tickets/${created.body.id}/comments`, {
      message: "Closing note",
      createdById: reporterId,
    });
    expect(res.status).toBe(201);
    expect(res.body.message).toBe("Closing note");
    expect(res.body.createdBy).toMatchObject({
      id: reporterId,
      name: "Reporter",
    });

    const detail = await http("GET", `/api/tickets/${created.body.id}`);
    expect(detail.body.status).toBe("CLOSED");
    expect(detail.body.comments).toHaveLength(1);
  });

  it("still allows field edits on a CANCELLED ticket without changing status", async () => {
    const created = await createTicket();
    await http("PATCH", `/api/tickets/${created.body.id}/status`, {
      status: "CANCELLED",
    });

    const res = await http("PATCH", `/api/tickets/${created.body.id}`, {
      title: "Cancelled but corrected",
      description: "Updated after cancellation",
    });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe("Cancelled but corrected");
    expect(res.body.status).toBe("CANCELLED");
  });
});

describe("tickets API - detail and comment contracts", () => {
  it("returns empty comments and OPEN next statuses on a new ticket", async () => {
    const created = await createTicket({ assignedToId: assigneeId });
    const detail = await http("GET", `/api/tickets/${created.body.id}`);

    expect(detail.status).toBe(200);
    expect(detail.body.comments).toEqual([]);
    expect(detail.body.allowedNextStatuses).toEqual([
      "IN_PROGRESS",
      "CANCELLED",
    ]);
    expect(detail.body.createdBy).toMatchObject({
      id: reporterId,
      name: "Reporter",
    });
    expect(detail.body.assignedTo).toMatchObject({
      id: assigneeId,
      name: "Assignee",
    });
  });

  it("includes the comment author on create", async () => {
    const created = await createTicket();
    const res = await http("POST", `/api/tickets/${created.body.id}/comments`, {
      message: "Looking into this",
      createdById: assigneeId,
    });

    expect(res.status).toBe(201);
    expect(res.body.createdBy).toMatchObject({
      id: assigneeId,
      name: "Assignee",
      email: "assignee@test.local",
    });
  });
});
