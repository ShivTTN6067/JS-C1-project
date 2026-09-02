import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import type { NextFunction, Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { errorHandler } from "../src/backend/src/middleware/errorHandler.js";

// Resolve multer from the backend package, matching errorHandler's import.
const { MulterError } = createRequire(
  fileURLToPath(new URL("../src/backend/src/middleware/errorHandler.ts", import.meta.url)),
)("multer") as { MulterError: new (code: string, field?: string) => Error & { code: string } };

function mockRes() {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
  };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res as unknown as Response & {
    status: ReturnType<typeof vi.fn>;
    json: ReturnType<typeof vi.fn>;
  };
}

describe("errorHandler MulterError mapping", () => {
  it("maps LIMIT_FILE_SIZE to a 2 MB validation message", () => {
    const res = mockRes();
    errorHandler(
      new MulterError("LIMIT_FILE_SIZE"),
      {} as Request,
      res,
      vi.fn() as unknown as NextFunction,
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: { message: "Profile photo must be 2 MB or smaller" },
    });
  });

  it("maps other Multer errors to 400 using the library message", () => {
    const res = mockRes();
    const err = new MulterError("LIMIT_UNEXPECTED_FILE", "avatar");
    errorHandler(err, {} as Request, res, vi.fn() as unknown as NextFunction);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: { message: err.message },
    });
  });
});
