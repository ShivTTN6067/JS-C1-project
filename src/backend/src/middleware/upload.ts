import type { Request } from "express";
import multer from "multer";
import path from "node:path";
import { ValidationError } from "../lib/errors.js";
import { getAvatarsDir } from "../lib/profilePhotos.js";
import { userIdParamSchema } from "../validation/schemas.js";

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024;

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, getAvatarsDir());
  },
  filename: (req, file, cb) => {
    const parsed = userIdParamSchema.safeParse(req.params);
    if (!parsed.success) {
      return cb(new ValidationError("Invalid user id"));
    }
    const userId = parsed.data.id;
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
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
