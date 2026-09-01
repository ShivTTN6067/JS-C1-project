import express from "express";
import cors from "cors";
import { usersRouter } from "./routes/users.js";
import { ticketsRouter } from "./routes/tickets.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { getUploadsRoot } from "./lib/profilePhotos.js";

/**
 * Builds and configures the Express application. Kept separate from the
 * server bootstrap so tests can import the app without opening a port.
 */
export function createApp() {
  const app = express();

  const corsOrigin = process.env.CORS_ORIGIN?.split(",").map((o) => o.trim());
  app.use(cors({ origin: corsOrigin && corsOrigin.length > 0 ? corsOrigin : true }));
  app.use(express.json());
  app.use("/uploads", express.static(getUploadsRoot()));

  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

  app.use("/api/users", usersRouter);
  app.use("/api/tickets", ticketsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
