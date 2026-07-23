import type { NextFunction, Request, Response } from "express";

/**
 * Wraps an async route handler so that rejected promises are forwarded
 * to Express's error-handling middleware instead of crashing the process.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}
