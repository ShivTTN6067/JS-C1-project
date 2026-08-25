import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/backend/src/app.js";

/**
 * Platform-level HTTP tests that do not need the ticket database:
 * health checks, unknown routes, and body-parser failures.
 */

let server: Server;
let baseUrl: string;

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
});

describe("HTTP platform", () => {
  it("reports health without touching ticket storage", async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });

  it("returns 404 for unknown API routes", async () => {
    const missing = await fetch(`${baseUrl}/api/does-not-exist`);
    expect(missing.status).toBe(404);
    expect(await missing.json()).toEqual({
      error: { message: "Route not found: GET /api/does-not-exist" },
    });

    const nested = await fetch(`${baseUrl}/api/tickets/1/nope`, { method: "POST" });
    expect(nested.status).toBe(404);
    const nestedBody = await nested.json();
    expect(nestedBody.error.message).toMatch(/Route not found: POST /);
  });

  it("does not crash the process on malformed JSON bodies", async () => {
    const res = await fetch(`${baseUrl}/api/tickets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: '{"title":',
    });
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({
      error: { message: "Internal server error" },
    });
  });
});
