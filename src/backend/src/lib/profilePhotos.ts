import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const backendRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

/** Root directory for uploaded profile photos. */
export function getUploadsRoot(): string {
  const configured = process.env.UPLOADS_DIR;
  if (configured) {
    return path.isAbsolute(configured)
      ? configured
      : path.resolve(backendRoot, configured);
  }
  return path.join(backendRoot, "uploads");
}

export function getAvatarsDir(): string {
  return path.join(getUploadsRoot(), "avatars");
}

export function ensureUploadDirs(): void {
  fs.mkdirSync(getAvatarsDir(), { recursive: true });
}

/** Build the public URL path stored on the user record. */
export function buildProfilePhotoUrl(filename: string): string {
  return `/uploads/avatars/${filename}`;
}

/** Remove a stored profile photo file if it exists on disk. */
export function deleteProfilePhotoFile(profilePhotoUrl: string | null | undefined): void {
  if (!profilePhotoUrl?.startsWith("/uploads/avatars/")) return;

  const filename = path.basename(profilePhotoUrl);
  const filePath = path.join(getAvatarsDir(), filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}
