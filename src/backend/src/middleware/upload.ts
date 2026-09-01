import type { Request } from "express";
import multer from "multer";
import { ValidationError } from "../lib/errors.js";
import { getAvatarsDir } from "../lib/profilePhotos.js";

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024;

/** Map validated MIME types to safe extensions (never trust `originalname`). */
const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, getAvatarsDir());
  },
  filename: (req, file, cb) => {
    const userId = req.params.id;
    const ext = MIME_TO_EXT[file.mimetype] ?? ".jpg";
    cb(null, `user-${userId}-${Date.now()}${ext}`);
  },
});

function fileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    return cb(
      new ValidationError("Profile photo must be a JPEG, PNG, or WebP image"),
    );
  }
  cb(null, true);
}

export const profilePhotoUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
});
