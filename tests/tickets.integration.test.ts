import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/backend/src/app.js";
import { prisma } from "../src/backend/src/lib/prisma.js";

/**
 * Integration tests exercising the API against the SQLite test database.
 * The mandatory tier: proving the state-machine rules end-to-end (valid
 * transitions succeed, invalid transitions are rejected with 400).
 *
 * The Express app is booted on an ephemeral port and driven with fetch,
 * which avoids ESM interop issues with HTTP test clients.
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

describe("tickets API - CRUD & search", () => {
  it("creates a ticket in OPEN status", async () => {
    const res = await createTicket();
    expect(res.status).toBe(201);
    expect(res.body.status).toBe("OPEN");
    expect(res.body.title).toBe("Test ticket");
  });

  it("rejects creation with missing required fields", async () => {
    const res = await http("POST", "/api/tickets", {
      description: "no title",
      createdById: reporterId,
    });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe("Validation failed");
  });

  it("rejects creation referencing a non-existent user", async () => {
    const res = await createTicket({ createdById: 999999 });
    expect(res.status).toBe(400);
  });

  it("rejects creation when assignedToId does not exist", async () => {
    const res = await createTicket({ assignedToId: 999999 });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/assignedToId/);
  });

  it("rejects whitespace-only title and defaults omitted priority to MEDIUM", async () => {
    const blank = await createTicket({ title: "   " });
    expect(blank.status).toBe(400);

    const created = await http("POST", "/api/tickets", {
      title: "No priority sent",
      description: "Priority should default",
      createdById: reporterId,
    });
    expect(created.status).toBe(201);
    expect(created.body.priority).toBe("MEDIUM");
    expect(created.body.status).toBe("OPEN");
  });

  it("lists tickets and filters by status", async () => {
    const a = await createTicket({ title: "Alpha" });
    await createTicket({ title: "Beta" });
    await http("PATCH", `/api/tickets/${a.body.id}/status`, {
      status: "IN_PROGRESS",
    });

    const all = await http("GET", "/api/tickets");
    expect(all.body).toHaveLength(2);

    const inProgress = await http("GET", "/api/tickets?status=IN_PROGRESS");
    expect(inProgress.body).toHaveLength(1);
    expect(inProgress.body[0].title).toBe("Alpha");
  });

  it("searches tickets by keyword in title/description", async () => {
    await createTicket({ title: "Payment gateway timeout" });
    await createTicket({
      title: "Email delivery delay",
      description: "SMTP handshake fails in checkout",
    });

    const byTitle = await http("GET", "/api/tickets?search=payment");
    expect(byTitle.body).toHaveLength(1);
    expect(byTitle.body[0].title).toBe("Payment gateway timeout");

    const byDescription = await http("GET", "/api/tickets?search=checkout");
    expect(byDescription.body).toHaveLength(1);
    expect(byDescription.body[0].title).toBe("Email delivery delay");
  });

  it("rejects an unknown status query with 400", async () => {
    const res = await http("GET", "/api/tickets?status=NOPE");
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe("Validation failed");
  });

  it("updates editable fields and reassigns", async () => {
    const created = await createTicket();
    const res = await http("PATCH", `/api/tickets/${created.body.id}`, {
      title: "Updated",
      priority: "HIGH",
      assignedToId: assigneeId,
    });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe("Updated");
    expect(res.body.priority).toBe("HIGH");
    expect(res.body.assignedToId).toBe(assigneeId);
  });

  it("unassigns a ticket and rejects an empty update body", async () => {
    const created = await createTicket({ assignedToId: assigneeId });
    expect(created.body.assignedToId).toBe(assigneeId);

    const unassigned = await http("PATCH", `/api/tickets/${created.body.id}`, {
      assignedToId: null,
    });
    expect(unassigned.status).toBe(200);
    expect(unassigned.body.assignedToId).toBeNull();

    const empty = await http("PATCH", `/api/tickets/${created.body.id}`, {});
    expect(empty.status).toBe(400);
  });

  it("does not allow PATCH to change status and bypass the state machine", async () => {
    const created = await createTicket();
    const res = await http("PATCH", `/api/tickets/${created.body.id}`, {
      title: "Still open",
      status: "CLOSED",
    });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe("Still open");
    expect(res.body.status).toBe("OPEN");
  });

  it("returns 400 for a non-integer ticket id", async () => {
    const res = await http("GET", "/api/tickets/abc");
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/Invalid ticket id/);
  });

  it("returns 404 when mutating a missing ticket", async () => {
    const update = await http("PATCH", "/api/tickets/999999", { title: "Nope" });
    expect(update.status).toBe(404);

    const status = await http("PATCH", "/api/tickets/999999/status", {
      status: "IN_PROGRESS",
    });
    expect(status.status).toBe(404);

    const comment = await http("POST", "/api/tickets/999999/comments", {
      message: "orphan comment",
      createdById: reporterId,
    });
    expect(comment.status).toBe(404);
  });

  it("adds a comment to a ticket", async () => {
    const created = await createTicket();
    const res = await http("POST", `/api/tickets/${created.body.id}/comments`, {
      message: "Looking into this",
      createdById: reporterId,
    });
    expect(res.status).toBe(201);
    expect(res.body.message).toBe("Looking into this");

    const detail = await http("GET", `/api/tickets/${created.body.id}`);
    expect(detail.body.comments).toHaveLength(1);
    expect(detail.body.allowedNextStatuses).toEqual(["IN_PROGRESS", "CANCELLED"]);
  });

  it("rejects a blank comment and a comment from a missing user", async () => {
    const created = await createTicket();
    const blank = await http("POST", `/api/tickets/${created.body.id}/comments`, {
      message: "   ",
      createdById: reporterId,
    });
    expect(blank.status).toBe(400);

    const missingUser = await http(
      "POST",
      `/api/tickets/${created.body.id}/comments`,
      { message: "hello", createdById: 999999 },
    );
    expect(missingUser.status).toBe(400);
  });

  it("lists users for assignee and reporter dropdowns", async () => {
    const res = await http("GET", "/api/users");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body.map((u: { name: string }) => u.name).sort()).toEqual([
      "Assignee",
      "Reporter",
    ]);
  });

  it("returns 404 for a missing ticket", async () => {
    const res = await http("GET", "/api/tickets/999999");
    expect(res.status).toBe(404);
  });
});

describe("tickets API - status state machine", () => {
  it("allows OPEN -> IN_PROGRESS -> RESOLVED -> CLOSED", async () => {
    const created = await createTicket();
    const id = created.body.id;

    for (const status of ["IN_PROGRESS", "RESOLVED", "CLOSED"]) {
      const res = await http("PATCH", `/api/tickets/${id}/status`, { status });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe(status);
    }
  });

  it("allows OPEN -> CANCELLED", async () => {
    const created = await createTicket();
    const res = await http("PATCH", `/api/tickets/${created.body.id}/status`, {
      status: "CANCELLED",
    });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("CANCELLED");
    expect(res.body.allowedNextStatuses).toEqual([]);
  });

  it("allows IN_PROGRESS -> CANCELLED", async () => {
    const created = await createTicket();
    await http("PATCH", `/api/tickets/${created.body.id}/status`, {
      status: "IN_PROGRESS",
    });
    const res = await http("PATCH", `/api/tickets/${created.body.id}/status`, {
      status: "CANCELLED",
    });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("CANCELLED");
  });

  it("rejects OPEN -> RESOLVED (invalid transition) with 400", async () => {
    const created = await createTicket();
    const res = await http("PATCH", `/api/tickets/${created.body.id}/status`, {
      status: "RESOLVED",
    });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/Cannot change status/);
    expect(res.body.error.details).toEqual({
      from: "OPEN",
      to: "RESOLVED",
      allowed: ["IN_PROGRESS", "CANCELLED"],
    });
  });

  it("rejects transitions out of a terminal state", async () => {
    const created = await createTicket();
    const id = created.body.id;
    await http("PATCH", `/api/tickets/${id}/status`, { status: "CANCELLED" });

    const res = await http("PATCH", `/api/tickets/${id}/status`, {
      status: "IN_PROGRESS",
    });
    expect(res.status).toBe(400);
  });

  it("rejects an unknown status value with 400", async () => {
    const created = await createTicket();
    const res = await http("PATCH", `/api/tickets/${created.body.id}/status`, {
      status: "BOGUS",
    });
    expect(res.status).toBe(400);
  });
});
