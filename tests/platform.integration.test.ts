import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/backend/src/app.js";
import { prisma } from "../src/backend/src/lib/prisma.js";

const ADMIN_TOKEN = "test-platform-admin-token";

let server: Server;
let baseUrl: string;
let originalAdminToken: string | undefined;

async function http(method: string, path: string, body?: unknown, token?: string) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : undefined };
}

beforeAll(async () => {
  originalAdminToken = process.env.PLATFORM_ADMIN_TOKEN;
  process.env.PLATFORM_ADMIN_TOKEN = ADMIN_TOKEN;

  await prisma.platformConfig.upsert({
    where: { id: 1 },
    create: { id: 1, deploymentMode: "HYBRID", adSlotEveryN: 4 },
    update: { deploymentMode: "HYBRID", adSlotEveryN: 4 },
  });

  const app = createApp();
  await new Promise<void>((resolve) => {
    server = app.listen(0, resolve);
  });
  const { port } = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
  if (originalAdminToken === undefined) delete process.env.PLATFORM_ADMIN_TOKEN;
  else process.env.PLATFORM_ADMIN_TOKEN = originalAdminToken;

  await new Promise<void>((resolve, reject) =>
    server.close((err) => (err ? reject(err) : resolve())),
  );
});

describe("Platform config API", () => {
  it("allows unauthenticated reads of platform config", async () => {
    const res = await http("GET", "/api/platform/config");
    expect(res.status).toBe(200);
    expect(res.body.deploymentMode).toBe("HYBRID");
  });

  it("rejects unauthenticated platform config updates", async () => {
    const res = await http("PATCH", "/api/platform/config", { deploymentMode: "VR_ONLY" });
    expect(res.status).toBe(401);

    const config = await http("GET", "/api/platform/config");
    expect(config.body.deploymentMode).toBe("HYBRID");
  });

  it("rejects platform config updates with a user session token", async () => {
    const res = await http("PATCH", "/api/platform/config", { deploymentMode: "VR_ONLY" }, "not-admin");
    expect(res.status).toBe(401);
  });

  it("allows platform config updates with the admin token", async () => {
    const res = await http(
      "PATCH",
      "/api/platform/config",
      { deploymentMode: "MD_ONLY", adSlotEveryN: 5 },
      ADMIN_TOKEN,
    );
    expect(res.status).toBe(200);
    expect(res.body.deploymentMode).toBe("MD_ONLY");
    expect(res.body.adSlotEveryN).toBe(5);
  });
});
