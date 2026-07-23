/**
 * Application error types used to produce consistent HTTP responses.
 * The centralized error handler (see middleware/errorHandler.ts) maps
 * these to status codes and JSON bodies.
 */

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(404, message);
  }
}

export class ValidationError extends AppError {
  constructor(message = "Invalid request", details?: unknown) {
    super(400, message, details);
  }
}

/** Raised when a status change violates the state machine rules. */
export class InvalidTransitionError extends AppError {
  constructor(message: string, details?: unknown) {
    super(400, message, details);
  }
}
