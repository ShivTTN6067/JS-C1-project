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

/** Returns true when the file's leading bytes match the declared image MIME type. */
export function matchesImageMimeType(filePath: string, mimetype: string): boolean {
  const header = fs.readFileSync(filePath);

  switch (mimetype) {
    case "image/jpeg":
      return (
        header.length >= 3 &&
        header[0] === 0xff &&
        header[1] === 0xd8 &&
        header[2] === 0xff
      );
    case "image/png":
      return (
        header.length >= 4 &&
        header[0] === 0x89 &&
        header[1] === 0x50 &&
        header[2] === 0x4e &&
        header[3] === 0x47
      );
    case "image/webp":
      return (
        header.length >= 12 &&
        header[0] === 0x52 &&
        header[1] === 0x49 &&
        header[2] === 0x46 &&
        header[3] === 0x46 &&
        header[8] === 0x57 &&
        header[9] === 0x45 &&
        header[10] === 0x42 &&
        header[11] === 0x50
      );
    default:
      return false;
  }
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
