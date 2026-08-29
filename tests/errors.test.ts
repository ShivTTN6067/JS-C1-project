import { describe, expect, it } from "vitest";
import {
  AppError,
  InvalidTransitionError,
  NotFoundError,
  ValidationError,
} from "../src/backend/src/lib/errors.js";

/**
 * Guards the HTTP status codes and names of shared error types so a
 * subclass change cannot silently remap 404/400/500 contracts.
 */

describe("application error types", () => {
  it("maps each subclass to the documented HTTP status code and class name", () => {
    expect(new NotFoundError("Ticket 1 not found")).toMatchObject({
      statusCode: 404,
      message: "Ticket 1 not found",
      name: "NotFoundError",
    });

    expect(new ValidationError("Invalid ticket id")).toMatchObject({
      statusCode: 400,
      message: "Invalid ticket id",
      name: "ValidationError",
    });

    const transition = new InvalidTransitionError("Cannot change status", {
      from: "OPEN",
      to: "CLOSED",
      allowed: ["IN_PROGRESS", "CANCELLED"],
    });
    expect(transition).toMatchObject({
      statusCode: 400,
      name: "InvalidTransitionError",
      details: {
        from: "OPEN",
        to: "CLOSED",
        allowed: ["IN_PROGRESS", "CANCELLED"],
      },
    });

    expect(new AppError(500, "Internal server error")).toMatchObject({
      statusCode: 500,
      name: "AppError",
    });
  });
});
