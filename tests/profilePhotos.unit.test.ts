import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildProfilePhotoUrl,
  deleteProfilePhotoFile,
  ensureUploadDirs,
  getAvatarsDir,
  getUploadsRoot,
} from "../src/backend/src/lib/profilePhotos.js";

const originalUploadsDir = process.env.UPLOADS_DIR;

afterEach(() => {
  if (originalUploadsDir === undefined) {
    delete process.env.UPLOADS_DIR;
  } else {
    process.env.UPLOADS_DIR = originalUploadsDir;
  }
});

describe("profilePhotos helpers", () => {
  it("builds the public URL from a stored filename", () => {
    expect(buildProfilePhotoUrl("user-3-123.png")).toBe(
      "/uploads/avatars/user-3-123.png",
    );
  });

  it("uses an absolute UPLOADS_DIR as-is", () => {
    process.env.UPLOADS_DIR = "/tmp/ticket-avatars-test";
    expect(getUploadsRoot()).toBe("/tmp/ticket-avatars-test");
    expect(getAvatarsDir()).toBe(path.join("/tmp/ticket-avatars-test", "avatars"));
  });

  it("deleteProfilePhotoFile is a no-op for missing, empty, or non-avatar URLs", () => {
    expect(() => deleteProfilePhotoFile(null)).not.toThrow();
    expect(() => deleteProfilePhotoFile(undefined)).not.toThrow();
    expect(() => deleteProfilePhotoFile("")).not.toThrow();
    expect(() =>
      deleteProfilePhotoFile("https://cdn.example/avatars/user.jpg"),
    ).not.toThrow();
    expect(() => deleteProfilePhotoFile("/uploads/other/user.jpg")).not.toThrow();
  });

  it("deletes a file that lives under the avatars directory", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "avatars-unit-"));
    process.env.UPLOADS_DIR = root;
    ensureUploadDirs();

    const filename = "user-1-photo.jpg";
    const filePath = path.join(getAvatarsDir(), filename);
    fs.writeFileSync(filePath, "photo");

    deleteProfilePhotoFile(buildProfilePhotoUrl(filename));
    expect(fs.existsSync(filePath)).toBe(false);
  });

  it("does not follow path traversal out of the avatars directory", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "avatars-unit-"));
    process.env.UPLOADS_DIR = root;
    ensureUploadDirs();

    const secretPath = path.join(root, "secret.txt");
    fs.writeFileSync(secretPath, "keep-me");

    deleteProfilePhotoFile("/uploads/avatars/../../secret.txt");
    deleteProfilePhotoFile("/uploads/avatars/../../../secret.txt");

    expect(fs.existsSync(secretPath)).toBe(true);
  });

  it("does not throw when the avatar file is already gone", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "avatars-unit-"));
    process.env.UPLOADS_DIR = root;
    ensureUploadDirs();

    expect(() =>
      deleteProfilePhotoFile("/uploads/avatars/already-deleted.jpg"),
    ).not.toThrow();
  });
});
