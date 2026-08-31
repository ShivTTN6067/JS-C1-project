import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/backend/src/app.js";
import { prisma } from "../src/backend/src/lib/prisma.js";

/**
 * Complementary integration coverage for list-order side effects, unknown-field
 * PATCH isolation, trim persistence, and assignment/search contracts. Kept in a
 * separate file so it does not collide with other coverage PRs.
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

describe("tickets API - list order side effects", () => {
  it("does not reorder the list when a comment is added, but does after a field PATCH", async () => {
    const first = await createTicket({ title: "First" });
    const second = await createTicket({ title: "Second" });
    await prisma.ticket.update({
      where: { id: first.body.id },
      data: { updatedAt: new Date("2026-01-01T00:00:00.000Z") },
    });
    await prisma.ticket.update({
      where: { id: second.body.id },
      data: { updatedAt: new Date("2026-01-02T00:00:00.000Z") },
    });

    const comment = await http("POST", `/api/tickets/${first.body.id}/comments`, {
      message: "Should not bump list order",
      createdById: reporterId,
    });
    expect(comment.status).toBe(201);

    let list = await http("GET", "/api/tickets");
    expect(list.body.map((t: { title: string }) => t.title)).toEqual([
      "Second",
      "First",
    ]);

    const patched = await http("PATCH", `/api/tickets/${first.body.id}`, {
      title: "First updated",
    });
    expect(patched.status).toBe(200);

    list = await http("GET", "/api/tickets");
    expect(list.body.map((t: { title: string }) => t.title)).toEqual([
      "First updated",
      "Second",
    ]);
  });

  it("returns an empty array when no tickets exist", async () => {
    const res = await http("GET", "/api/tickets");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe("tickets API - unknown PATCH fields and trim persistence", () => {
  it("rejects a status-only field PATCH as empty and leaves the ticket OPEN", async () => {
    const created = await createTicket();
    const res = await http("PATCH", `/api/tickets/${created.body.id}`, {
      status: "CLOSED",
    });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe("Validation failed");

    const detail = await http("GET", `/api/tickets/${created.body.id}`);
    expect(detail.body.status).toBe("OPEN");
    expect(detail.body.title).toBe("Test ticket");
  });

  it("rejects a createdById-only PATCH without changing the reporter", async () => {
    const created = await createTicket();
    const res = await http("PATCH", `/api/tickets/${created.body.id}`, {
      createdById: assigneeId,
    });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe("Validation failed");

    const detail = await http("GET", `/api/tickets/${created.body.id}`);
    expect(detail.body.createdById).toBe(reporterId);
  });

  it("persists trimmed title and description on create and PATCH", async () => {
    const created = await createTicket({
      title: "  Padded title  ",
      description: "  Padded description  ",
    });
    expect(created.status).toBe(201);
    expect(created.body.title).toBe("Padded title");
    expect(created.body.description).toBe("Padded description");

    const patched = await http("PATCH", `/api/tickets/${created.body.id}`, {
      title: "  Renamed  ",
      description: "  Updated body  ",
    });
    expect(patched.status).toBe(200);
    expect(patched.body.title).toBe("Renamed");
    expect(patched.body.description).toBe("Updated body");
  });

  it("accepts a 200-character PATCH title and rejects 201 without mutating storage", async () => {
    const created = await createTicket({ title: "Original" });
    const ok = await http("PATCH", `/api/tickets/${created.body.id}`, {
      title: "t".repeat(200),
    });
    expect(ok.status).toBe(200);
    expect(ok.body.title).toHaveLength(200);

    const tooLong = await http("PATCH", `/api/tickets/${created.body.id}`, {
      title: "t".repeat(201),
    });
    expect(tooLong.status).toBe(400);
    expect(tooLong.body.error.message).toBe("Validation failed");

    const detail = await http("GET", `/api/tickets/${created.body.id}`);
    expect(detail.body.title).toHaveLength(200);
  });
});

describe("tickets API - search, assignment, and comments", () => {
  it("matches a mid-word substring rather than requiring a whole-word token", async () => {
    await createTicket({ title: "Payment gateway timeout" });
    await createTicket({ title: "Email delivery delay" });

    const res = await http("GET", "/api/tickets?search=gate");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe("Payment gateway timeout");
  });

  it("returns no rows when search and status filters match nothing together", async () => {
    await createTicket({ title: "Payment timeout" });

    const res = await http("GET", "/api/tickets?search=payment&status=CLOSED");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("supports assign, unassign, and reassign with matching relations", async () => {
    const created = await createTicket();
    expect(created.body.assignedToId).toBeNull();
    expect(created.body.assignedTo).toBeNull();

    const assigned = await http("PATCH", `/api/tickets/${created.body.id}`, {
      assignedToId: assigneeId,
    });
    expect(assigned.status).toBe(200);
    expect(assigned.body.assignedToId).toBe(assigneeId);
    expect(assigned.body.assignedTo.name).toBe("Assignee");

    const unassigned = await http("PATCH", `/api/tickets/${created.body.id}`, {
      assignedToId: null,
    });
    expect(unassigned.status).toBe(200);
    expect(unassigned.body.assignedToId).toBeNull();
    expect(unassigned.body.assignedTo).toBeNull();

    const reassigned = await http("PATCH", `/api/tickets/${created.body.id}`, {
      assignedToId: reporterId,
    });
    expect(reassigned.status).toBe(200);
    expect(reassigned.body.assignedToId).toBe(reporterId);
    expect(reassigned.body.assignedTo.name).toBe("Reporter");
  });

  it("ignores a client-supplied comment id and still records the author", async () => {
    const created = await createTicket();
    const res = await http("POST", `/api/tickets/${created.body.id}/comments`, {
      id: 99999,
      message: "Taking this over",
      createdById: assigneeId,
    });
    expect(res.status).toBe(201);
    expect(res.body.id).not.toBe(99999);
    expect(typeof res.body.id).toBe("number");
    expect(res.body.message).toBe("Taking this over");
    expect(res.body.createdById).toBe(assigneeId);
    expect(res.body.createdBy.name).toBe("Assignee");
    expect(res.body.ticketId).toBe(created.body.id);
  });

  it("rejects a lowercase create priority without persisting a ticket", async () => {
    const res = await createTicket({ priority: "high" });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe("Validation failed");

    const list = await http("GET", "/api/tickets");
    expect(list.body).toHaveLength(0);
  });
});
