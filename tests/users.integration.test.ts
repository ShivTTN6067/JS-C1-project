import fs from "node:fs";
import path from "node:path";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/backend/src/app.js";
import { prisma } from "../src/backend/src/lib/prisma.js";
import {
  getAvatarsDir,
  getUploadsRoot,
} from "../src/backend/src/lib/profilePhotos.js";

let server: Server;
let baseUrl: string;
let userId: number;

interface HttpResult {
  status: number;
  body: any;
}

async function http(
  method: string,
  pathName: string,
  body?: unknown,
): Promise<HttpResult> {
  const res = await fetch(`${baseUrl}${pathName}`, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : undefined };
}

async function uploadPhoto(
  id: number,
  file: { filename: string; contentType: string; data: Buffer },
): Promise<HttpResult> {
  const form = new FormData();
  form.append(
    "photo",
    new Blob([file.data], { type: file.contentType }),
    file.filename,
  );

  const res = await fetch(`${baseUrl}/api/users/${id}/profile-photo`, {
    method: "POST",
    body: form,
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : undefined };
}

async function resetDb() {
  await prisma.comment.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.user.deleteMany();

  const user = await prisma.user.create({
    data: { name: "Alice Nguyen", email: "alice@test.local", role: "AGENT" },
  });
  userId = user.id;
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
  for (const file of fs.readdirSync(getAvatarsDir())) {
    fs.unlinkSync(path.join(getAvatarsDir(), file));
  }
  await resetDb();
});

describe("User profile photo API", () => {
  it("GET /api/users includes profilePhotoUrl", async () => {
    const res = await http("GET", "/api/users");
    expect(res.status).toBe(200);
    expect(res.body[0]).toMatchObject({
      id: userId,
      profilePhotoUrl: null,
    });
  });

  it("GET /api/users/:id returns a single user", async () => {
    const res = await http("GET", `/api/users/${userId}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: userId,
      name: "Alice Nguyen",
      profilePhotoUrl: null,
    });
  });

  it("GET /api/users/:id returns 404 for missing user", async () => {
    const res = await http("GET", "/api/users/9999");
    expect(res.status).toBe(404);
  });

  it("POST /api/users/:id/profile-photo uploads a JPEG and stores the file", async () => {
    const jpeg = Buffer.from(
      "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA//2Q==",
      "base64",
    );

    const res = await uploadPhoto(userId, {
      filename: "avatar.jpg",
      contentType: "image/jpeg",
      data: jpeg,
    });

    expect(res.status).toBe(200);
    expect(res.body.profilePhotoUrl).toMatch(/^\/uploads\/avatars\/user-/);

    const filePath = path.join(getAvatarsDir(), path.basename(res.body.profilePhotoUrl));
    expect(fs.existsSync(filePath)).toBe(true);

    const served = await fetch(`${baseUrl}${res.body.profilePhotoUrl}`);
    expect(served.status).toBe(200);
  });

  it("POST /api/users/:id/profile-photo replaces an existing photo", async () => {
    const jpeg = Buffer.from(
      "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA//2Q==",
      "base64",
    );

    const first = await uploadPhoto(userId, {
      filename: "first.jpg",
      contentType: "image/jpeg",
      data: jpeg,
    });
    const firstPath = path.join(getAvatarsDir(), path.basename(first.body.profilePhotoUrl));

    const second = await uploadPhoto(userId, {
      filename: "second.jpg",
      contentType: "image/jpeg",
      data: jpeg,
    });

    expect(second.body.profilePhotoUrl).not.toBe(first.body.profilePhotoUrl);
    expect(fs.existsSync(firstPath)).toBe(false);
  });

  it("POST /api/users/:id/profile-photo rejects unsupported file types", async () => {
    const res = await uploadPhoto(userId, {
      filename: "notes.txt",
      contentType: "text/plain",
      data: Buffer.from("not an image"),
    });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/JPEG, PNG, or WebP/i);
  });

  it("POST with path traversal in user id rejects without writing outside avatars", async () => {
    const jpeg = Buffer.from(
      "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA//2Q==",
      "base64",
    );

    const avatarsBefore = fs.readdirSync(getAvatarsDir());
    const uploadsBefore = fs
      .readdirSync(getUploadsRoot())
      .filter((name) => name.endsWith(".png") || name.endsWith(".jpg"));

    const form = new FormData();
    form.append(
      "photo",
      new Blob([jpeg], { type: "image/jpeg" }),
      "avatar.jpg",
    );

    const res = await fetch(
      `${baseUrl}/api/users/${encodeURIComponent("../../..")}/profile-photo`,
      { method: "POST", body: form },
    );
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.message).toMatch(/validation failed|invalid user id/i);
    expect(fs.readdirSync(getAvatarsDir())).toEqual(avatarsBefore);
    expect(
      fs
        .readdirSync(getUploadsRoot())
        .filter((name) => name.endsWith(".png") || name.endsWith(".jpg")),
    ).toEqual(uploadsBefore);
  });

  it("POST /api/users/:id/profile-photo returns 404 for missing user", async () => {
    const res = await uploadPhoto(9999, {
      filename: "avatar.jpg",
      contentType: "image/jpeg",
      data: Buffer.from("fake"),
    });

    expect(res.status).toBe(404);
  });

  it("DELETE /api/users/:id/profile-photo removes the stored photo", async () => {
    const jpeg = Buffer.from(
      "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA//2Q==",
      "base64",
    );

    const uploaded = await uploadPhoto(userId, {
      filename: "avatar.jpg",
      contentType: "image/jpeg",
      data: jpeg,
    });
    const filePath = path.join(
      getAvatarsDir(),
      path.basename(uploaded.body.profilePhotoUrl),
    );

    const res = await http("DELETE", `/api/users/${userId}/profile-photo`);
    expect(res.status).toBe(200);
    expect(res.body.profilePhotoUrl).toBeNull();
    expect(fs.existsSync(filePath)).toBe(false);
  });
});
