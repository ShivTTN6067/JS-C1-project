import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler.js";
import { prisma } from "../lib/prisma.js";

export const usersRouter = Router();

/** GET /api/users - list all users (used to populate assignee dropdowns). */
usersRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({
      orderBy: { name: "asc" },
    });
    res.json(users);
  }),
);
