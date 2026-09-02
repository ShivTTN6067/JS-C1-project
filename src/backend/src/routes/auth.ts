import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler.js";
import { prisma } from "../lib/prisma.js";
import { ForbiddenError, UnauthorizedError, ValidationError } from "../lib/errors.js";
import { createSessionToken, hashPassword, passwordsMatch, sessionExpiry } from "../lib/password.js";
import { requireAuth } from "../middleware/auth.js";
import {
  loginSchema,
  registerSchema,
  selectProfileSchema,
} from "../validation/schemas.js";

export const authRouter = Router();

function serializeAccount(
  account: {
    id: number;
    email: string;
    name: string;
    profiles: { id: number; name: string; type: string }[];
  },
  session: { token: string; profileId: number | null; expiresAt: Date },
) {
  const profile =
    account.profiles.find((p) => p.id === session.profileId) ??
    account.profiles.find((p) => p.type === "REGULAR") ??
    account.profiles[0] ??
    null;
  return {
    token: session.token,
    expiresAt: session.expiresAt,
    account: {
      id: account.id,
      email: account.email,
      name: account.name,
    },
    profile,
    profiles: account.profiles,
  };
}

authRouter.post(
  "/register",
  asyncHandler(async (req, res) => {
    const data = registerSchema.parse(req.body);
    const existing = await prisma.account.findUnique({ where: { email: data.email.toLowerCase() } });
    if (existing) throw new ValidationError("An account with that email already exists");

    const account = await prisma.account.create({
      data: {
        email: data.email.toLowerCase(),
        name: data.name,
        passwordHash: hashPassword(data.password),
        profiles: { create: { name: data.name, type: "REGULAR" } },
      },
      include: { profiles: true },
    });

    const regular = account.profiles[0];
    const session = await prisma.session.create({
      data: {
        token: createSessionToken(),
        accountId: account.id,
        profileId: regular.id,
        expiresAt: sessionExpiry(),
      },
    });

    res.status(201).json(serializeAccount(account, session));
  }),
);

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const data = loginSchema.parse(req.body);
    const account = await prisma.account.findUnique({
      where: { email: data.email.toLowerCase() },
      include: { profiles: true },
    });
    if (!account || !passwordsMatch(data.password, account.passwordHash)) {
      throw new UnauthorizedError("Invalid email or password");
    }

    const regular = account.profiles.find((p) => p.type === "REGULAR") ?? account.profiles[0];
    const session = await prisma.session.create({
      data: {
        token: createSessionToken(),
        accountId: account.id,
        profileId: regular?.id ?? null,
        expiresAt: sessionExpiry(),
      },
    });

    res.json(serializeAccount(account, session));
  }),
);

authRouter.post(
  "/logout",
  requireAuth,
  asyncHandler(async (req, res) => {
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7).trim() : "";
    if (token) {
      await prisma.session.deleteMany({ where: { token } });
    }
    res.status(204).end();
  }),
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const account = await prisma.account.findUnique({
      where: { id: req.auth!.accountId },
      include: { profiles: true, subscriptions: { orderBy: { expiresAt: "desc" } } },
    });
    if (!account) throw new UnauthorizedError();
    res.json({
      account: { id: account.id, email: account.email, name: account.name },
      profileId: req.auth!.profileId,
      profileType: req.auth!.profileType,
      profiles: account.profiles,
      subscriptions: account.subscriptions,
    });
  }),
);

authRouter.post(
  "/profile",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { profileId } = selectProfileSchema.parse(req.body);
    const profile = await prisma.profile.findFirst({
      where: { id: profileId, accountId: req.auth!.accountId },
    });
    if (!profile) throw new ForbiddenError("Profile not found on this account");

    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7).trim() : "";
    await prisma.session.updateMany({
      where: { token },
      data: { profileId: profile.id },
    });

    res.json({ profile });
  }),
);
