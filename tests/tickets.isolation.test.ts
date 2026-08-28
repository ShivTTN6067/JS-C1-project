import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/backend/src/app.js";
import { prisma } from "../src/backend/src/lib/prisma.js";

/**
 * Complementary integration coverage for cross-ticket isolation, priority
 * HTTP validation, list/detail payload contracts, and search injection.
 * Kept in a separate file so it does not collide with other coverage PRs
 * that extend tickets.integration.test.ts or tickets.integrity.test.ts.
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

describe("tickets API - isolation and payload contracts", () => {
  it("does not leak comments from one ticket onto another ticket's detail", async () => {
    const alpha = await createTicket({ title: "Alpha" });
    const beta = await createTicket({ title: "Beta" });

    const comment = await http("POST", `/api/tickets/${alpha.body.id}/comments`, {
      message: "Only on Alpha",
      createdById: reporterId,
    });
    expect(comment.status).toBe(201);

    const alphaDetail = await http("GET", `/api/tickets/${alpha.body.id}`);
    const betaDetail = await http("GET", `/api/tickets/${beta.body.id}`);

    expect(alphaDetail.body.comments).toHaveLength(1);
    expect(alphaDetail.body.comments[0].message).toBe("Only on Alpha");
    expect(betaDetail.body.comments).toEqual([]);
  });

  it("omits comments and allowedNextStatuses from the list payload", async () => {
    const created = await createTicket();
    await http("POST", `/api/tickets/${created.body.id}/comments`, {
      message: "Internal note",
      createdById: reporterId,
    });

    const list = await http("GET", "/api/tickets");
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(1);
    expect(list.body[0].comments).toBeUndefined();
    expect(list.body[0].allowedNextStatuses).toBeUndefined();
    expect(list.body[0].title).toBe("Test ticket");
  });

  it("returns IN_PROGRESS and RESOLVED next-status lists from the state machine", async () => {
    const created = await createTicket();
    const id = created.body.id;

    await http("PATCH", `/api/tickets/${id}/status`, { status: "IN_PROGRESS" });
    const inProgress = await http("GET", `/api/tickets/${id}`);
    expect(inProgress.body.allowedNextStatuses).toEqual([
      "RESOLVED",
      "CANCELLED",
    ]);

    await http("PATCH", `/api/tickets/${id}/status`, { status: "RESOLVED" });
    const resolved = await http("GET", `/api/tickets/${id}`);
    expect(resolved.body.allowedNextStatuses).toEqual(["CLOSED"]);
  });
});

describe("tickets API - search safety and filters", () => {
  it("treats SQL-like search text as a literal substring, not a query", async () => {
    await createTicket({ title: "Login timeout", description: "Users cannot sign in" });
    await createTicket({ title: "Printer jam", description: "Office printer is stuck" });

    const res = await http(
      "GET",
      `/api/tickets?search=${encodeURIComponent("' OR 1=1 --")}`,
    );

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("finds unicode titles by a unicode substring", async () => {
    await createTicket({
      title: "登录失败 🔐",
      description: "Cannot complete SSO",
    });
    await createTicket({ title: "Unrelated", description: "Printer" });

    const res = await http("GET", `/api/tickets?search=${encodeURIComponent("登录")}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe("登录失败 🔐");
  });

  it("returns an empty array when search matches nothing", async () => {
    await createTicket({ title: "Login timeout" });

    const res = await http("GET", "/api/tickets?search=no-such-keyword-zzz");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("filters by RESOLVED independently of OPEN tickets", async () => {
    const moving = await createTicket({ title: "Move me" });
    await createTicket({ title: "Leave me open" });

    await http("PATCH", `/api/tickets/${moving.body.id}/status`, {
      status: "IN_PROGRESS",
    });
    await http("PATCH", `/api/tickets/${moving.body.id}/status`, {
      status: "RESOLVED",
    });

    const resolved = await http("GET", "/api/tickets?status=RESOLVED");
    expect(resolved.status).toBe(200);
    expect(resolved.body).toHaveLength(1);
    expect(resolved.body[0].title).toBe("Move me");

    const open = await http("GET", "/api/tickets?status=OPEN");
    expect(open.body).toHaveLength(1);
    expect(open.body[0].title).toBe("Leave me open");
  });

  it("ignores unknown list query params instead of rejecting the request", async () => {
    await createTicket({ title: "Still listed" });

    const res = await http("GET", "/api/tickets?foo=bar&priority=HIGH");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe("Still listed");
  });
});

describe("tickets API - priority and identity writes", () => {
  it("persists LOW and HIGH priorities through create and PATCH", async () => {
    const created = await createTicket({ priority: "HIGH" });
    expect(created.status).toBe(201);
    expect(created.body.priority).toBe("HIGH");

    const updated = await http("PATCH", `/api/tickets/${created.body.id}`, {
      priority: "LOW",
    });
    expect(updated.status).toBe(200);
    expect(updated.body.priority).toBe("LOW");
    expect(updated.body.title).toBe("Test ticket");
  });

  it("rejects an invalid PATCH priority without mutating stored fields", async () => {
    const created = await createTicket({ priority: "MEDIUM" });
    const res = await http("PATCH", `/api/tickets/${created.body.id}`, {
      priority: "URGENT",
    });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe("Validation failed");

    const detail = await http("GET", `/api/tickets/${created.body.id}`);
    expect(detail.body.priority).toBe("MEDIUM");
  });

  it("ignores id in a PATCH body and updates the ticket identified by the path", async () => {
    const alpha = await createTicket({ title: "Alpha" });
    const beta = await createTicket({ title: "Beta" });

    const res = await http("PATCH", `/api/tickets/${alpha.body.id}`, {
      id: beta.body.id,
      title: "Alpha corrected",
    });
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(alpha.body.id);
    expect(res.body.title).toBe("Alpha corrected");

    const betaDetail = await http("GET", `/api/tickets/${beta.body.id}`);
    expect(betaDetail.body.title).toBe("Beta");
  });

  it("allows a reporter to assign a ticket to themselves", async () => {
    const res = await createTicket({ assignedToId: reporterId });
    expect(res.status).toBe(201);
    expect(res.body.assignedToId).toBe(reporterId);
    expect(res.body.assignedTo).toMatchObject({
      id: reporterId,
      name: "Reporter",
    });
  });
});

describe("tickets API - request shape rejections", () => {
  it("rejects an array JSON body on create", async () => {
    const arrayBody = await http("POST", "/api/tickets", []);
    expect(arrayBody.status).toBe(400);
    expect(arrayBody.body.error.message).toBe("Validation failed");
  });

  it("rejects a comment missing createdById", async () => {
    const created = await createTicket();
    const res = await http("POST", `/api/tickets/${created.body.id}/comments`, {
      message: "No author",
    });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe("Validation failed");
  });

  it("rejects a status change with a null status", async () => {
    const created = await createTicket();
    const res = await http("PATCH", `/api/tickets/${created.body.id}/status`, {
      status: null,
    });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe("Validation failed");

    const detail = await http("GET", `/api/tickets/${created.body.id}`);
    expect(detail.body.status).toBe("OPEN");
  });

  it("returns 404 for DELETE and PUT on a ticket", async () => {
    const created = await createTicket();

    const del = await http("DELETE", `/api/tickets/${created.body.id}`);
    expect(del.status).toBe(404);
    expect(del.body.error.message).toMatch(/Route not found/);

    const put = await http("PUT", `/api/tickets/${created.body.id}`, {
      title: "replaced",
    });
    expect(put.status).toBe(404);

    const detail = await http("GET", `/api/tickets/${created.body.id}`);
    expect(detail.body.title).toBe("Test ticket");
  });
});
