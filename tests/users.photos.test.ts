import fs from "node:fs";
import path from "node:path";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/backend/src/app.js";
import { prisma } from "../src/backend/src/lib/prisma.js";
import { getAvatarsDir } from "../src/backend/src/lib/profilePhotos.js";

/**
 * Complementary coverage for the profile-photo API merged in PR #8.
 * The original suite covers JPEG upload, replace, unsupported type, and delete.
 * These cases lock down remaining validation, format, and identity edges.
 */

let server: Server;
let baseUrl: string;
let userId: number;

interface HttpResult {
  status: number;
  body: any;
}

const PNG_1x1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

const WEBP_1x1 = Buffer.from(
  "UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA",
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
  file: { filename: string; contentType: string; data: Buffer } | null,
  fieldName = "photo",
): Promise<HttpResult> {
  const form = new FormData();
  if (file) {
    form.append(
      fieldName,
      new Blob([file.data], { type: file.contentType }),
      file.filename,
    );
  }

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

describe("User profile photo validation and formats", () => {
  it("accepts PNG uploads and serves them from the stored URL", async () => {
    const res = await uploadPhoto(userId, {
      filename: "avatar.png",
      contentType: "image/png",
      data: PNG_1x1,
    });

    expect(res.status).toBe(200);
    expect(res.body.profilePhotoUrl).toMatch(/^\/uploads\/avatars\/user-\d+-.*\.png$/);

    const served = await fetch(`${baseUrl}${res.body.profilePhotoUrl}`);
    expect(served.status).toBe(200);
    expect(served.headers.get("content-type")).toMatch(/image\/png/i);
  });

  it("accepts WebP uploads", async () => {
    const res = await uploadPhoto(userId, {
      filename: "avatar.webp",
      contentType: "image/webp",
      data: WEBP_1x1,
    });

    expect(res.status).toBe(200);
    expect(res.body.profilePhotoUrl).toMatch(/\.webp$/);
  });

  it("rejects GIF even when the payload looks like an image", async () => {
    const res = await uploadPhoto(userId, {
      filename: "avatar.gif",
      contentType: "image/gif",
      data: Buffer.from("GIF89a"),
    });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/JPEG, PNG, or WebP/i);
  });

  it("rejects SVG uploads", async () => {
    const res = await uploadPhoto(userId, {
      filename: "avatar.svg",
      contentType: "image/svg+xml",
      data: Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'></svg>"),
    });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/JPEG, PNG, or WebP/i);
  });

  it("rejects HTML disguised as JPEG and does not persist a .html avatar", async () => {
    const before = fs.readdirSync(getAvatarsDir());

    const res = await uploadPhoto(userId, {
      filename: "evil.html",
      contentType: "image/jpeg",
      data: Buffer.from("<html><body><script>alert(1)</script></body></html>"),
    });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/JPEG, PNG, or WebP/i);
    expect(fs.readdirSync(getAvatarsDir())).toEqual(before);
  });

  it("stores uploads with an extension derived from MIME type, not original filename", async () => {
    const res = await uploadPhoto(userId, {
      filename: "avatar.html",
      contentType: "image/png",
      data: PNG_1x1,
    });

    expect(res.status).toBe(200);
    expect(res.body.profilePhotoUrl).toMatch(/\.png$/);
    expect(res.body.profilePhotoUrl).not.toMatch(/\.html$/);
  });

  it("rejects a payload larger than 2 MB with a size-specific message", async () => {
    const oversized = Buffer.alloc(2 * 1024 * 1024 + 1, 0xff);
    const res = await uploadPhoto(userId, {
      filename: "huge.jpg",
      contentType: "image/jpeg",
      data: oversized,
    });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/2 MB or smaller/i);
  });

  it("rejects a multipart request with no photo field", async () => {
    const res = await uploadPhoto(userId, null);

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/photo/i);
  });

  it("rejects a file sent under the wrong field name", async () => {
    const res = await uploadPhoto(
      userId,
      {
        filename: "avatar.png",
        contentType: "image/png",
        data: PNG_1x1,
      },
      "file",
    );

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/unexpected field/i);
  });

  it("rejects a JSON body that is not a multipart upload", async () => {
    const res = await json("POST", `/api/users/${userId}/profile-photo`, {
      photo: "not-a-file",
    });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/photo/i);
  });
});

describe("User profile photo identity and persistence", () => {
  it("reflects the uploaded URL on both list and detail GETs", async () => {
    const uploaded = await uploadPhoto(userId, {
      filename: "avatar.png",
      contentType: "image/png",
      data: PNG_1x1,
    });
    const url = uploaded.body.profilePhotoUrl;

    const detail = await json("GET", `/api/users/${userId}`);
    expect(detail.status).toBe(200);
    expect(detail.body.profilePhotoUrl).toBe(url);

    const list = await json("GET", "/api/users");
    expect(list.status).toBe(200);
    const listed = list.body.find((u: { id: number }) => u.id === userId);
    expect(listed.profilePhotoUrl).toBe(url);
  });

  it("DELETE is idempotent when the user has no photo", async () => {
    const res = await json("DELETE", `/api/users/${userId}/profile-photo`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: userId,
      name: "Alice Nguyen",
      profilePhotoUrl: null,
    });
  });

  it("DELETE returns 404 for a missing user", async () => {
    const res = await json("DELETE", "/api/users/9999/profile-photo");
    expect(res.status).toBe(404);
  });

  it("clears the stored URL on GET after a successful delete", async () => {
    await uploadPhoto(userId, {
      filename: "avatar.png",
      contentType: "image/png",
      data: PNG_1x1,
    });

    const deleted = await json("DELETE", `/api/users/${userId}/profile-photo`);
    expect(deleted.status).toBe(200);

    const detail = await json("GET", `/api/users/${userId}`);
    expect(detail.body.profilePhotoUrl).toBeNull();
  });

  it("rejects non-positive and non-integer user ids on photo routes", async () => {
    const cases = ["0", "-1", "1.5", "abc"];

    for (const id of cases) {
      const get = await json("GET", `/api/users/${id}`);
      expect(get.status, `GET id=${id}`).toBe(400);

      const post = await uploadPhoto(id, {
        filename: "avatar.png",
        contentType: "image/png",
        data: PNG_1x1,
      });
      expect(post.status, `POST id=${id}`).toBe(400);

      const del = await json("DELETE", `/api/users/${id}/profile-photo`);
      expect(del.status, `DELETE id=${id}`).toBe(400);
    }
  });

  it("returns 404 for a missing avatar file path", async () => {
    const res = await fetch(`${baseUrl}/uploads/avatars/does-not-exist.jpg`);
    expect(res.status).toBe(404);
  });
});
