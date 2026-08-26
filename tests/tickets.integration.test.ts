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
    await createTicket({ title: "Email delivery delay" });

    const res = await http("GET", "/api/tickets?search=payment");
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe("Payment gateway timeout");
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
  });

  it("rejects OPEN -> RESOLVED (invalid transition) with 400", async () => {
    const created = await createTicket();
    const res = await http("PATCH", `/api/tickets/${created.body.id}/status`, {
      status: "RESOLVED",
    });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/Cannot change status/);
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

describe("tickets API - integrity and persistence", () => {
  it("leaves the stored status unchanged when a transition is rejected", async () => {
    const created = await createTicket();
    const id = created.body.id;

    const res = await http("PATCH", `/api/tickets/${id}/status`, {
      status: "CLOSED",
    });
    expect(res.status).toBe(400);

    const detail = await http("GET", `/api/tickets/${id}`);
    expect(detail.status).toBe(200);
    expect(detail.body.status).toBe("OPEN");
  });

  it("rejects skip-ahead and reverse transitions without mutating the ticket", async () => {
    const created = await createTicket();
    const id = created.body.id;
    await http("PATCH", `/api/tickets/${id}/status`, { status: "IN_PROGRESS" });

    const skip = await http("PATCH", `/api/tickets/${id}/status`, {
      status: "CLOSED",
    });
    expect(skip.status).toBe(400);
    expect(skip.body.error.details).toEqual({
      from: "IN_PROGRESS",
      to: "CLOSED",
      allowed: ["RESOLVED", "CANCELLED"],
    });

    const reverse = await http("PATCH", `/api/tickets/${id}/status`, {
      status: "OPEN",
    });
    expect(reverse.status).toBe(400);

    await http("PATCH", `/api/tickets/${id}/status`, { status: "RESOLVED" });
    const cancelResolved = await http("PATCH", `/api/tickets/${id}/status`, {
      status: "CANCELLED",
    });
    expect(cancelResolved.status).toBe(400);
    expect(cancelResolved.body.error.details).toEqual({
      from: "RESOLVED",
      to: "CANCELLED",
      allowed: ["CLOSED"],
    });

    const detail = await http("GET", `/api/tickets/${id}`);
    expect(detail.body.status).toBe("RESOLVED");
  });

  it("does not clear unspecified fields on a partial update", async () => {
    const created = await createTicket({
      title: "Keep me",
      description: "Original body",
      priority: "LOW",
      assignedToId: assigneeId,
    });

    const res = await http("PATCH", `/api/tickets/${created.body.id}`, {
      priority: "HIGH",
    });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      title: "Keep me",
      description: "Original body",
      priority: "HIGH",
      assignedToId: assigneeId,
      status: "OPEN",
    });
  });

  it("rejects string user ids instead of coercing them", async () => {
    const res = await http("POST", "/api/tickets", {
      title: "Coerce",
      description: "Ids must be numbers",
      createdById: String(reporterId),
    });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe("Validation failed");
  });

  it("rejects a status change with no status field", async () => {
    const created = await createTicket();
    const res = await http("PATCH", `/api/tickets/${created.body.id}/status`, {});
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe("Validation failed");
  });

  it("rejects a lowercase status query", async () => {
    const res = await http("GET", "/api/tickets?status=open");
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe("Validation failed");
  });

  it("includes reporter and assignee relations on create, list, and detail", async () => {
    const created = await createTicket({ assignedToId: assigneeId });
    expect(created.status).toBe(201);
    expect(created.body.createdBy).toMatchObject({
      id: reporterId,
      name: "Reporter",
    });
    expect(created.body.assignedTo).toMatchObject({
      id: assigneeId,
      name: "Assignee",
    });

    const list = await http("GET", "/api/tickets");
    expect(list.body[0].createdBy.name).toBe("Reporter");
    expect(list.body[0].assignedTo.name).toBe("Assignee");

    const comment = await http("POST", `/api/tickets/${created.body.id}/comments`, {
      message: "noted",
      createdById: assigneeId,
    });
    expect(comment.status).toBe(201);
    expect(comment.body.createdBy.name).toBe("Assignee");

    const detail = await http("GET", `/api/tickets/${created.body.id}`);
    expect(detail.body.comments[0].createdBy.name).toBe("Assignee");
    expect(detail.body.allowedNextStatuses).toEqual(["IN_PROGRESS", "CANCELLED"]);
  });

  it("lists users in ascending name order", async () => {
    await prisma.user.create({
      data: { name: "Zed", email: "zed@test.local", role: "AGENT" },
    });
    await prisma.user.create({
      data: { name: "Amy", email: "amy@test.local", role: "AGENT" },
    });

    const res = await http("GET", "/api/users");
    expect(res.status).toBe(200);
    expect(res.body.map((u: { name: string }) => u.name)).toEqual([
      "Amy",
      "Assignee",
      "Reporter",
      "Zed",
    ]);
  });
});
