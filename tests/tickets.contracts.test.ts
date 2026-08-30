import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/backend/src/app.js";
import { prisma } from "../src/backend/src/lib/prisma.js";

/**
 * Complementary integration coverage for payload contracts, timestamp
 * integrity, stored-input safety, and HTTP length limits. Kept in a
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

describe("tickets API - payload contracts", () => {
  it("keeps createdAt stable across field PATCH and returns numeric ids", async () => {
    const created = await createTicket();
    expect(created.status).toBe(201);
    expect(typeof created.body.id).toBe("number");
    expect(typeof created.body.createdById).toBe("number");
    expect(created.body.comments).toBeUndefined();
    expect(created.body.allowedNextStatuses).toBeUndefined();
    expect(Number.isNaN(Date.parse(created.body.createdAt))).toBe(false);

    const patched = await http("PATCH", `/api/tickets/${created.body.id}`, {
      title: "Renamed ticket",
    });
    expect(patched.status).toBe(200);
    expect(patched.body.createdAt).toBe(created.body.createdAt);
    expect(patched.body.title).toBe("Renamed ticket");
    expect(patched.body.comments).toBeUndefined();
    expect(patched.body.allowedNextStatuses).toBeUndefined();
  });

  it("does not change title, description, priority, or assignee on a status PATCH", async () => {
    const created = await createTicket({
      title: "Keep my title",
      description: "Keep my description",
      priority: "HIGH",
      assignedToId: assigneeId,
    });

    const moved = await http("PATCH", `/api/tickets/${created.body.id}/status`, {
      status: "IN_PROGRESS",
      title: "Hijacked",
      description: "Should not apply",
      priority: "LOW",
      assignedToId: null,
    });

    expect(moved.status).toBe(200);
    expect(moved.body.status).toBe("IN_PROGRESS");
    expect(moved.body.title).toBe("Keep my title");
    expect(moved.body.description).toBe("Keep my description");
    expect(moved.body.priority).toBe("HIGH");
    expect(moved.body.assignedToId).toBe(assigneeId);
    expect(moved.body.comments).toBeUndefined();
  });

  it("does not mutate ticket fields when a comment is added", async () => {
    const created = await createTicket({ title: "Unchanged" });
    const comment = await http("POST", `/api/tickets/${created.body.id}/comments`, {
      message: "Working on it",
      createdById: reporterId,
    });
    expect(comment.status).toBe(201);
    expect(typeof comment.body.id).toBe("number");
    expect(comment.body.ticketId).toBe(created.body.id);

    const detail = await http("GET", `/api/tickets/${created.body.id}`);
    expect(detail.body.title).toBe("Unchanged");
    expect(detail.body.status).toBe("OPEN");
    expect(detail.body.priority).toBe("MEDIUM");
  });

  it("lists users as id/name/email/role without ticket or comment relations", async () => {
    const res = await http("GET", "/api/users");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);

    for (const user of res.body) {
      expect(Object.keys(user).sort()).toEqual(["email", "id", "name", "role"]);
      expect(typeof user.id).toBe("number");
      expect(typeof user.name).toBe("string");
      expect(typeof user.email).toBe("string");
      expect(typeof user.role).toBe("string");
      expect(user.createdTickets).toBeUndefined();
      expect(user.assignedTickets).toBeUndefined();
      expect(user.comments).toBeUndefined();
    }
  });
});

describe("tickets API - stored input and HTTP limits", () => {
  it("persists HTML and script text as literals rather than interpreting them", async () => {
    const payload = {
      title: '<script>alert("xss")</script>',
      description: '<img src=x onerror="alert(1)">',
    };
    const created = await createTicket(payload);
    expect(created.status).toBe(201);
    expect(created.body.title).toBe(payload.title);
    expect(created.body.description).toBe(payload.description);

    const comment = await http("POST", `/api/tickets/${created.body.id}/comments`, {
      message: "<b>bold</b> & not html",
      createdById: reporterId,
    });
    expect(comment.status).toBe(201);
    expect(comment.body.message).toBe("<b>bold</b> & not html");

    const detail = await http("GET", `/api/tickets/${created.body.id}`);
    expect(detail.body.title).toBe(payload.title);
    expect(detail.body.description).toBe(payload.description);
    expect(detail.body.comments[0].message).toBe("<b>bold</b> & not html");
  });

  it("accepts a 5000-character description over HTTP and rejects 5001", async () => {
    const ok = await createTicket({ description: "d".repeat(5000) });
    expect(ok.status).toBe(201);
    expect(ok.body.description).toHaveLength(5000);

    const tooLong = await createTicket({ description: "d".repeat(5001) });
    expect(tooLong.status).toBe(400);
    expect(tooLong.body.error.message).toBe("Validation failed");

    const list = await http("GET", "/api/tickets");
    expect(list.body).toHaveLength(1);
  });

  it("accepts a 2000-character comment over HTTP and rejects 2001", async () => {
    const created = await createTicket();
    const ok = await http("POST", `/api/tickets/${created.body.id}/comments`, {
      message: "c".repeat(2000),
      createdById: reporterId,
    });
    expect(ok.status).toBe(201);
    expect(ok.body.message).toHaveLength(2000);

    const tooLong = await http("POST", `/api/tickets/${created.body.id}/comments`, {
      message: "c".repeat(2001),
      createdById: reporterId,
    });
    expect(tooLong.status).toBe(400);
    expect(tooLong.body.error.message).toBe("Validation failed");

    const detail = await http("GET", `/api/tickets/${created.body.id}`);
    expect(detail.body.comments).toHaveLength(1);
  });

  it("includes Zod fieldErrors in HTTP validation details", async () => {
    const res = await http("POST", "/api/tickets", {
      description: "Users cannot sign in",
      createdById: reporterId,
    });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe("Validation failed");
    expect(res.body.error.details.fieldErrors.title).toEqual(
      expect.arrayContaining([expect.any(String)]),
    );
  });
});

describe("tickets API - query and terminal-ticket contracts", () => {
  it("treats an empty search query as unfiltered", async () => {
    await createTicket({ title: "Alpha" });
    await createTicket({ title: "Beta" });

    const res = await http("GET", "/api/tickets?search=");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  it("rejects whitespace-padded status values on list and status PATCH", async () => {
    const created = await createTicket();

    const list = await http("GET", "/api/tickets?status=%20OPEN%20");
    expect(list.status).toBe(400);
    expect(list.body.error.message).toBe("Validation failed");

    const moved = await http("PATCH", `/api/tickets/${created.body.id}/status`, {
      status: " IN_PROGRESS ",
    });
    expect(moved.status).toBe(400);
    expect(moved.body.error.message).toBe("Validation failed");

    const detail = await http("GET", `/api/tickets/${created.body.id}`);
    expect(detail.body.status).toBe("OPEN");
  });

  it("still allows field edits on a CLOSED ticket without changing status", async () => {
    const created = await createTicket({ title: "Close me" });
    const id = created.body.id;
    await http("PATCH", `/api/tickets/${id}/status`, { status: "IN_PROGRESS" });
    await http("PATCH", `/api/tickets/${id}/status`, { status: "RESOLVED" });
    const closed = await http("PATCH", `/api/tickets/${id}/status`, {
      status: "CLOSED",
    });
    expect(closed.status).toBe(200);

    const patched = await http("PATCH", `/api/tickets/${id}`, {
      title: "Closed but corrected",
    });
    expect(patched.status).toBe(200);
    expect(patched.body.title).toBe("Closed but corrected");
    expect(patched.body.status).toBe("CLOSED");
  });

  it("still allows comments after a ticket is CANCELLED", async () => {
    const created = await createTicket();
    await http("PATCH", `/api/tickets/${created.body.id}/status`, {
      status: "CANCELLED",
    });

    const comment = await http("POST", `/api/tickets/${created.body.id}/comments`, {
      message: "Closing the loop",
      createdById: reporterId,
    });
    expect(comment.status).toBe(201);
    expect(comment.body.message).toBe("Closing the loop");

    const detail = await http("GET", `/api/tickets/${created.body.id}`);
    expect(detail.body.status).toBe("CANCELLED");
    expect(detail.body.comments).toHaveLength(1);
  });
});
