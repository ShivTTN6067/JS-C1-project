import fs from "node:fs";
import path from "node:path";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/backend/src/app.js";
import { prisma } from "../src/backend/src/lib/prisma.js";
import { getAvatarsDir } from "../src/backend/src/lib/profilePhotos.js";

/**
 * Complementary coverage for profile photos (PR #8) that is not in the
 * original JPEG suite or the unmerged validation draft (PR #15):
 * per-user isolation, orphan-file cleanup, MIME aliases, and ticket
 * relation blast radius.
 */

let server: Server;
let baseUrl: string;
let aliceId: number;
let bobId: number;

interface HttpResult {
  status: number;
  body: any;
}

const PNG_1x1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

const JPEG_1x1 = Buffer.from(
  "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA//2Q==",
  "base64",
);

async function json(
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
  id: number | string,
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

function avatarFiles(): string[] {
  return fs.readdirSync(getAvatarsDir()).filter((name) => name !== ".gitkeep");
}

async function resetDb() {
  await prisma.comment.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.user.deleteMany();

  const alice = await prisma.user.create({
    data: { name: "Alice Nguyen", email: "alice@test.local", role: "AGENT" },
  });
  const bob = await prisma.user.create({
    data: { name: "Bob Martinez", email: "bob@test.local", role: "AGENT" },
  });
  aliceId = alice.id;
  bobId = bob.id;
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
  for (const file of avatarFiles()) {
    fs.unlinkSync(path.join(getAvatarsDir(), file));
  }
  await resetDb();
});

describe("profile photo isolation and cleanup", () => {
  it("keeps each user's photo independent across upload and delete", async () => {
    const alice = await uploadPhoto(aliceId, {
      filename: "alice.png",
      contentType: "image/png",
      data: PNG_1x1,
    });
    const bob = await uploadPhoto(bobId, {
      filename: "bob.png",
      contentType: "image/png",
      data: PNG_1x1,
    });

    expect(alice.status).toBe(200);
    expect(bob.status).toBe(200);
    expect(alice.body.profilePhotoUrl).not.toBe(bob.body.profilePhotoUrl);

    const deletedAlice = await json("DELETE", `/api/users/${aliceId}/profile-photo`);
    expect(deletedAlice.status).toBe(200);
    expect(deletedAlice.body.profilePhotoUrl).toBeNull();

    const bobAfter = await json("GET", `/api/users/${bobId}`);
    expect(bobAfter.body.profilePhotoUrl).toBe(bob.body.profilePhotoUrl);

    const bobFile = path.join(
      getAvatarsDir(),
      path.basename(bob.body.profilePhotoUrl),
    );
    expect(fs.existsSync(bobFile)).toBe(true);
    expect(avatarFiles()).toEqual([path.basename(bob.body.profilePhotoUrl)]);
  });

  it("does not leave an orphan file when uploading for a missing user", async () => {
    const before = avatarFiles();
    const res = await uploadPhoto(9999, {
      filename: "ghost.png",
      contentType: "image/png",
      data: PNG_1x1,
    });

    expect(res.status).toBe(404);
    expect(avatarFiles()).toEqual(before);
  });

  it("stops serving the previous URL after a replace", async () => {
    const first = await uploadPhoto(aliceId, {
      filename: "first.png",
      contentType: "image/png",
      data: PNG_1x1,
    });
    const firstUrl = first.body.profilePhotoUrl as string;

    const second = await uploadPhoto(aliceId, {
      filename: "second.png",
      contentType: "image/png",
      data: PNG_1x1,
    });
    const secondUrl = second.body.profilePhotoUrl as string;

    expect(secondUrl).not.toBe(firstUrl);
    expect((await fetch(`${baseUrl}${firstUrl}`)).status).toBe(404);
    expect((await fetch(`${baseUrl}${secondUrl}`)).status).toBe(200);
  });

  it("embeds the numeric user id in the stored filename", async () => {
    const res = await uploadPhoto(aliceId, {
      filename: "avatar.png",
      contentType: "image/png",
      data: PNG_1x1,
    });

    expect(res.status).toBe(200);
    expect(res.body.profilePhotoUrl).toMatch(
      new RegExp(`^/uploads/avatars/user-${aliceId}-\\d+\\.png$`),
    );
  });
});

describe("profile photo MIME aliases and limits", () => {
  it("stores a .jpeg extension from the original filename", async () => {
    const res = await uploadPhoto(aliceId, {
      filename: "portrait.jpeg",
      contentType: "image/jpeg",
      data: JPEG_1x1,
    });

    expect(res.status).toBe(200);
    expect(res.body.profilePhotoUrl).toMatch(/\.jpeg$/);
  });

  it("defaults a missing filename extension to .jpg", async () => {
    const res = await uploadPhoto(aliceId, {
      filename: "avatar",
      contentType: "image/jpeg",
      data: JPEG_1x1,
    });

    expect(res.status).toBe(200);
    expect(res.body.profilePhotoUrl).toMatch(/\.jpg$/);
  });

  it.each([
    ["image/jpg", "alias.jpg"],
    ["image/bmp", "avatar.bmp"],
    ["image/heic", "avatar.heic"],
    ["application/octet-stream", "avatar.bin"],
  ])("rejects %s uploads", async (contentType, filename) => {
    const res = await uploadPhoto(aliceId, {
      filename,
      contentType,
      data: PNG_1x1,
    });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/JPEG, PNG, or WebP/i);
  });

  it("normalizes an uppercase filename extension", async () => {
    const res = await uploadPhoto(aliceId, {
      filename: "avatar.PNG",
      contentType: "image/png",
      data: PNG_1x1,
    });

    expect(res.status).toBe(200);
    expect(res.body.profilePhotoUrl).toMatch(/\.png$/);
    expect(res.body.profilePhotoUrl).not.toMatch(/\.PNG$/);
  });

  it("returns 404 for GET, PUT, and PATCH on the photo route", async () => {
    for (const method of ["GET", "PUT", "PATCH"] as const) {
      const res = await json(method, `/api/users/${aliceId}/profile-photo`);
      expect(res.status, method).toBe(404);
    }
  });
});

describe("ticket relations include live profile photos", () => {
  it("exposes profilePhotoUrl on assignee, reporter, and comment author", async () => {
    const uploaded = await uploadPhoto(aliceId, {
      filename: "alice.png",
      contentType: "image/png",
      data: PNG_1x1,
    });
    const photoUrl = uploaded.body.profilePhotoUrl as string;

    const created = await json("POST", "/api/tickets", {
      title: "Photo blast-radius ticket",
      description: "Must carry nested user photos",
      priority: "MEDIUM",
      createdById: aliceId,
      assignedToId: aliceId,
    });
    expect(created.status).toBe(201);
    expect(created.body.createdBy.profilePhotoUrl).toBe(photoUrl);
    expect(created.body.assignedTo.profilePhotoUrl).toBe(photoUrl);

    const listed = await json("GET", "/api/tickets");
    expect(listed.status).toBe(200);
    expect(listed.body[0].assignedTo.profilePhotoUrl).toBe(photoUrl);

    const comment = await json("POST", `/api/tickets/${created.body.id}/comments`, {
      message: "Working on it",
      createdById: aliceId,
    });
    expect(comment.status).toBe(201);
    expect(comment.body.createdBy.profilePhotoUrl).toBe(photoUrl);

    const detail = await json("GET", `/api/tickets/${created.body.id}`);
    expect(detail.body.comments[0].createdBy.profilePhotoUrl).toBe(photoUrl);
  });

  it("reflects a replaced photo on subsequent ticket reads", async () => {
    const first = await uploadPhoto(bobId, {
      filename: "first.png",
      contentType: "image/png",
      data: PNG_1x1,
    });

    const created = await json("POST", "/api/tickets", {
      title: "Stale photo check",
      description: "Assignee photo should not be cached on the ticket",
      createdById: aliceId,
      assignedToId: bobId,
    });
    expect(created.body.assignedTo.profilePhotoUrl).toBe(first.body.profilePhotoUrl);

    const second = await uploadPhoto(bobId, {
      filename: "second.png",
      contentType: "image/png",
      data: PNG_1x1,
    });

    const detail = await json("GET", `/api/tickets/${created.body.id}`);
    expect(detail.status).toBe(200);
    expect(detail.body.assignedTo.profilePhotoUrl).toBe(second.body.profilePhotoUrl);
    expect(detail.body.assignedTo.profilePhotoUrl).not.toBe(
      first.body.profilePhotoUrl,
    );
  });
});
