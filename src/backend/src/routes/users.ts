import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler.js";
import { NotFoundError, ValidationError } from "../lib/errors.js";
import { prisma } from "../lib/prisma.js";
import {
  buildProfilePhotoUrl,
  deleteProfilePhotoFile,
  ensureUploadDirs,
} from "../lib/profilePhotos.js";
import { profilePhotoUpload } from "../middleware/upload.js";
import { userIdParamSchema } from "../validation/schemas.js";

export const usersRouter = Router();

ensureUploadDirs();

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

/** GET /api/users/:id - fetch a single user. */
usersRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = userIdParamSchema.parse(req.params);
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundError(`User not found (id=${id})`);
    res.json(user);
  }),
);

/** POST /api/users/:id/profile-photo - upload or replace a user's profile photo. */
usersRouter.post(
  "/:id/profile-photo",
  profilePhotoUpload.single("photo"),
  asyncHandler(async (req, res) => {
    const { id } = userIdParamSchema.parse(req.params);

    if (!req.file) {
      throw new ValidationError("A profile photo file is required (field name: photo)");
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      deleteProfilePhotoFile(buildProfilePhotoUrl(req.file.filename));
      throw new NotFoundError(`User not found (id=${id})`);
    }

    deleteProfilePhotoFile(existing.profilePhotoUrl);

    const profilePhotoUrl = buildProfilePhotoUrl(req.file.filename);
    const user = await prisma.user.update({
      where: { id },
      data: { profilePhotoUrl },
    });

    res.json(user);
  }),
);

/** DELETE /api/users/:id/profile-photo - remove a user's profile photo. */
usersRouter.delete(
  "/:id/profile-photo",
  asyncHandler(async (req, res) => {
    const { id } = userIdParamSchema.parse(req.params);

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError(`User not found (id=${id})`);

    deleteProfilePhotoFile(existing.profilePhotoUrl);

    const user = await prisma.user.update({
      where: { id },
      data: { profilePhotoUrl: null },
    });

    res.json(user);
  }),
);
