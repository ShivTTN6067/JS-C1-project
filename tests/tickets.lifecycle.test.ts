import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/backend/src/app.js";
import { prisma } from "../src/backend/src/lib/prisma.js";

/**
 * Complementary integration coverage for identity integrity, HTTP-level
 * field validation, status-lifecycle side effects, and remaining filters.
 * Kept in a separate file so it does not collide with other coverage PRs.
 */

let server: Server;
let baseUrl: string;

let reporterId: number;

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
  await prisma.user.create({
    data: { name: "Assignee", email: "assignee@test.local", role: "AGENT" },
  });
  reporterId = reporter.id;
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

describe("tickets API - identity integrity", () => {
  it("ignores client-supplied id, status, and timestamps on create", async () => {
    const res = await createTicket({
      id: 4242,
      status: "CLOSED",
      createdAt: "1999-01-01T00:00:00.000Z",
      updatedAt: "1999-01-01T00:00:00.000Z",
      comments: [{ message: "injected" }],
    });

    expect(res.status).toBe(201);
    expect(res.body.id).not.toBe(4242);
    expect(res.body.status).toBe("OPEN");
    expect(res.body.createdAt).not.toBe("1999-01-01T00:00:00.000Z");
    expect(res.body.comments).toBeUndefined();

    const detail = await http("GET", `/api/tickets/${res.body.id}`);
    expect(detail.body.status).toBe("OPEN");
    expect(detail.body.comments).toEqual([]);
  });

  it("does not re-home a comment when the body includes another ticketId", async () => {
    const alpha = await createTicket({ title: "Alpha" });
    const beta = await createTicket({ title: "Beta" });

    const comment = await http("POST", `/api/tickets/${alpha.body.id}/comments`, {
      message: "Belongs on Alpha",
      createdById: reporterId,
      ticketId: beta.body.id,
    });

    expect(comment.status).toBe(201);
    expect(comment.body.ticketId).toBe(alpha.body.id);
    expect(comment.body.message).toBe("Belongs on Alpha");

    const alphaDetail = await http("GET", `/api/tickets/${alpha.body.id}`);
    const betaDetail = await http("GET", `/api/tickets/${beta.body.id}`);
    expect(alphaDetail.body.comments).toHaveLength(1);
    expect(betaDetail.body.comments).toEqual([]);
  });

  it("keeps existing comments when the ticket status changes", async () => {
    const created = await createTicket();
    await http("POST", `/api/tickets/${created.body.id}/comments`, {
      message: "Still relevant",
      createdById: reporterId,
    });

    const moved = await http("PATCH", `/api/tickets/${created.body.id}/status`, {
      status: "IN_PROGRESS",
    });
    expect(moved.status).toBe(200);
    expect(moved.body.status).toBe("IN_PROGRESS");

    const detail = await http("GET", `/api/tickets/${created.body.id}`);
    expect(detail.body.comments).toHaveLength(1);
    expect(detail.body.comments[0].message).toBe("Still relevant");
  });
});

describe("tickets API - status PATCH contract", () => {
  it("returns allowedNextStatuses for the destination status, not the previous one", async () => {
    const created = await createTicket();
    const id = created.body.id;

    const inProgress = await http("PATCH", `/api/tickets/${id}/status`, {
      status: "IN_PROGRESS",
    });
    expect(inProgress.status).toBe(200);
    expect(inProgress.body.allowedNextStatuses).toEqual([
      "RESOLVED",
      "CANCELLED",
    ]);

    await http("PATCH", `/api/tickets/${id}/status`, { status: "RESOLVED" });
    const closed = await http("PATCH", `/api/tickets/${id}/status`, {
      status: "CLOSED",
    });
    expect(closed.status).toBe(200);
    expect(closed.body.status).toBe("CLOSED");
    expect(closed.body.allowedNextStatuses).toEqual([]);
  });

  it("rejects OPEN -> CLOSED without mutating the stored status", async () => {
    const created = await createTicket();
    const res = await http("PATCH", `/api/tickets/${created.body.id}/status`, {
      status: "CLOSED",
    });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/Cannot change status/);

    const detail = await http("GET", `/api/tickets/${created.body.id}`);
    expect(detail.body.status).toBe("OPEN");
  });
});

describe("tickets API - HTTP validation", () => {
  it("rejects create when description is missing even if title and reporter are set", async () => {
    const res = await http("POST", "/api/tickets", {
      title: "Broken login",
      createdById: reporterId,
    });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe("Validation failed");
  });

  it("rejects create when createdById is missing", async () => {
    const res = await http("POST", "/api/tickets", {
      title: "Broken login",
      description: "Users cannot sign in",
    });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe("Validation failed");
  });

  it("rejects an invalid create priority without persisting a ticket", async () => {
    const res = await createTicket({ priority: "URGENT" });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe("Validation failed");

    const list = await http("GET", "/api/tickets");
    expect(list.body).toEqual([]);
  });

  it("accepts a 200-character title over HTTP and rejects 201", async () => {
    const ok = await createTicket({ title: "a".repeat(200) });
    expect(ok.status).toBe(201);
    expect(ok.body.title).toHaveLength(200);

    const tooLong = await createTicket({ title: "a".repeat(201) });
    expect(tooLong.status).toBe(400);
    expect(tooLong.body.error.message).toBe("Validation failed");
  });

  it("rejects a whitespace-only PATCH description without mutating stored fields", async () => {
    const created = await createTicket({ description: "Original description" });
    const res = await http("PATCH", `/api/tickets/${created.body.id}`, {
      description: "   ",
    });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe("Validation failed");

    const detail = await http("GET", `/api/tickets/${created.body.id}`);
    expect(detail.body.description).toBe("Original description");
  });

  it("rejects a null PATCH title without mutating stored fields", async () => {
    const created = await createTicket({ title: "Keep me" });
    const res = await http("PATCH", `/api/tickets/${created.body.id}`, {
      title: null,
    });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe("Validation failed");

    const detail = await http("GET", `/api/tickets/${created.body.id}`);
    expect(detail.body.title).toBe("Keep me");
  });

  it("rejects a numeric title and a boolean createdById", async () => {
    const numericTitle = await http("POST", "/api/tickets", {
      title: 123,
      description: "Users cannot sign in",
      createdById: reporterId,
    });
    expect(numericTitle.status).toBe(400);

    const booleanReporter = await http("POST", "/api/tickets", {
      title: "Broken login",
      description: "Users cannot sign in",
      createdById: true,
    });
    expect(booleanReporter.status).toBe(400);

    const list = await http("GET", "/api/tickets");
    expect(list.body).toEqual([]);
  });

  it("returns 400 for a non-numeric ticket id on GET", async () => {
    const res = await http("GET", "/api/tickets/not-a-number");
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe("Invalid ticket id");
  });

  it("trims comment messages before persisting them", async () => {
    const created = await createTicket();
    const res = await http("POST", `/api/tickets/${created.body.id}/comments`, {
      message: "  looking into this  ",
      createdById: reporterId,
    });
    expect(res.status).toBe(201);
    expect(res.body.message).toBe("looking into this");
  });
});

describe("tickets API - filters and surface", () => {
  it("filters CLOSED and CANCELLED tickets independently", async () => {
    const closing = await createTicket({ title: "Close me" });
    const cancelling = await createTicket({ title: "Cancel me" });
    await createTicket({ title: "Leave me open" });

    await http("PATCH", `/api/tickets/${closing.body.id}/status`, {
      status: "IN_PROGRESS",
    });
    await http("PATCH", `/api/tickets/${closing.body.id}/status`, {
      status: "RESOLVED",
    });
    await http("PATCH", `/api/tickets/${closing.body.id}/status`, {
      status: "CLOSED",
    });
    await http("PATCH", `/api/tickets/${cancelling.body.id}/status`, {
      status: "CANCELLED",
    });

    const closed = await http("GET", "/api/tickets?status=CLOSED");
    expect(closed.status).toBe(200);
    expect(closed.body).toHaveLength(1);
    expect(closed.body[0].title).toBe("Close me");

    const cancelled = await http("GET", "/api/tickets?status=CANCELLED");
    expect(cancelled.body).toHaveLength(1);
    expect(cancelled.body[0].title).toBe("Cancel me");
  });

  it("finds a mid-title substring that includes an ampersand", async () => {
    await createTicket({
      title: "Auth & SSO timeout",
      description: "Users cannot complete login",
    });
    await createTicket({ title: "Printer jam", description: "Office printer" });

    const res = await http(
      "GET",
      `/api/tickets?search=${encodeURIComponent("Auth & SSO")}`,
    );
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe("Auth & SSO timeout");
  });

  it("returns an empty users list when no users exist", async () => {
    await prisma.comment.deleteMany();
    await prisma.ticket.deleteMany();
    await prisma.user.deleteMany();

    const res = await http("GET", "/api/users");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("returns 404 for POST /api/users and GET ticket comments collection", async () => {
    const created = await createTicket();

    const createUser = await http("POST", "/api/users", {
      name: "Intruder",
      email: "intruder@test.local",
      role: "ADMIN",
    });
    expect(createUser.status).toBe(404);
    expect(createUser.body.error.message).toMatch(/Route not found/);

    const comments = await http("GET", `/api/tickets/${created.body.id}/comments`);
    expect(comments.status).toBe(404);
    expect(comments.body.error.message).toMatch(/Route not found/);
  });
});
