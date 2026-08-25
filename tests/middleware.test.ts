import type { NextFunction, Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { asyncHandler } from "../src/backend/src/lib/asyncHandler.js";
import { InvalidTransitionError, ValidationError } from "../src/backend/src/lib/errors.js";
import { errorHandler, notFoundHandler } from "../src/backend/src/middleware/errorHandler.js";
import { createTicketSchema } from "../src/backend/src/validation/schemas.js";

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

describe("notFoundHandler", () => {
  it("returns a 404 payload that includes the method and path", () => {
    const res = mockRes();
    notFoundHandler({ method: "PUT", path: "/api/nope" } as Request, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: { message: "Route not found: PUT /api/nope" },
    });
  });
});

describe("errorHandler", () => {
  it("maps ZodError to a 400 validation payload", () => {
    const res = mockRes();
    let zodErr: { flatten: () => unknown } | undefined;
    try {
      createTicketSchema.parse({});
    } catch (err) {
      zodErr = err as { flatten: () => unknown };
    }

    errorHandler(zodErr, {} as Request, res, vi.fn() as unknown as NextFunction);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        message: "Validation failed",
        details: zodErr!.flatten(),
      },
    });
  });

  it("maps AppError subclasses to their status code and optional details", () => {
    const res = mockRes();
    const err = new InvalidTransitionError("Cannot change status from OPEN to CLOSED", {
      from: "OPEN",
      to: "CLOSED",
      allowed: ["IN_PROGRESS", "CANCELLED"],
    });

    errorHandler(err, {} as Request, res, vi.fn() as unknown as NextFunction);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        message: "Cannot change status from OPEN to CLOSED",
        details: {
          from: "OPEN",
          to: "CLOSED",
          allowed: ["IN_PROGRESS", "CANCELLED"],
        },
      },
    });
  });

  it("omits details when an AppError does not include them", () => {
    const res = mockRes();
    errorHandler(
      new ValidationError("Invalid ticket id"),
      {} as Request,
      res,
      vi.fn() as unknown as NextFunction,
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: { message: "Invalid ticket id" },
    });
  });

  it("maps unknown errors to 500 without leaking the original message", () => {
    const res = mockRes();
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    errorHandler(
      new Error("secret connection string"),
      {} as Request,
      res,
      vi.fn() as unknown as NextFunction,
    );

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: { message: "Internal server error" },
    });
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

describe("asyncHandler", () => {
  it("forwards rejected promises to next so Express can handle them", async () => {
    const boom = new Error("db down");
    const wrapped = asyncHandler(async () => {
      throw boom;
    });
    const next = vi.fn();

    wrapped({} as Request, {} as Response, next);

    await vi.waitFor(() => {
      expect(next).toHaveBeenCalledWith(boom);
    });
  });
});
