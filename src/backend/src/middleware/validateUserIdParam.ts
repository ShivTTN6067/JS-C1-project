import type { NextFunction, Request, Response } from "express";
import { userIdParamSchema } from "../validation/schemas.js";

/**
 * Validates `:id` before multer writes to disk. Without this, a crafted
 * path segment (e.g. `../../..`) is embedded in the upload filename and
 * escapes the avatars directory via path normalization.
 */
export function validateUserIdParam(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  userIdParamSchema.parse(req.params);
  next();
}
