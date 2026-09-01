import type { NextFunction, Request, Response } from "express";
import { MulterError } from "multer";
import { ZodError } from "zod";
import { AppError } from "../lib/errors.js";

/** 404 handler for unmatched routes. */
export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    error: { message: `Route not found: ${req.method} ${req.path}` },
  });
}

/**
 * Centralized error handler. Maps Zod validation errors and AppError
 * subclasses to consistent JSON responses; everything else becomes a 500.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        message: "Validation failed",
        details: err.flatten(),
      },
    });
  }

  if (err instanceof MulterError) {
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "Profile photo must be 2 MB or smaller"
        : err.message;
    return res.status(400).json({ error: { message } });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
    });
  }

  console.error("Unhandled error:", err);
  return res.status(500).json({
    error: { message: "Internal server error" },
  });
}
