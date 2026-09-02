import type { Request } from "express";
import { prisma } from "../lib/prisma.js";
import { ForbiddenError, UnauthorizedError } from "../lib/errors.js";
import { asyncHandler } from "../lib/asyncHandler.js";

export interface AuthContext {
  accountId: number;
  profileId: number | null;
  email: string;
  name: string;
  profileType: string | null;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

function readBearer(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice(7).trim();
  const queryToken = typeof req.query.token === "string" ? req.query.token : null;
  return queryToken;
}

export async function loadAuth(token: string): Promise<AuthContext | null> {
  const session = await prisma.session.findUnique({
    where: { token },
    include: { account: { include: { profiles: true } } },
  });
  if (!session) return null;
  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }
  const profile = session.profileId
    ? session.account.profiles.find((p) => p.id === session.profileId) ?? null
    : session.account.profiles.find((p) => p.type === "REGULAR") ??
      session.account.profiles[0] ??
      null;

  return {
    accountId: session.accountId,
    profileId: profile?.id ?? null,
    email: session.account.email,
    name: session.account.name,
    profileType: profile?.type ?? null,
  };
}

/** Optional auth: populates req.auth when a valid token is present. */
export const optionalAuth = asyncHandler(async (req, _res, next) => {
  const token = readBearer(req);
  if (token) {
    const auth = await loadAuth(token);
    if (auth) req.auth = auth;
  }
  next();
});

/** Kids profiles must not access Micro Drama catalog, playback, or MD packs. */
export function assertMicroDramaAllowed(auth: AuthContext | undefined): void {
  if (auth?.profileType === "KIDS") {
    throw new ForbiddenError("Micro Drama is not available for Kids profiles");
  }
}

/** Required auth. */
export const requireAuth = asyncHandler(async (req, _res, next) => {
  const token = readBearer(req);
  if (!token) throw new UnauthorizedError();
  const auth = await loadAuth(token);
  if (!auth) throw new UnauthorizedError("Session expired");
  req.auth = auth;
  next();
});

/** Platform config mutations require a dedicated admin token (not a user session). */
export const requirePlatformAdmin = asyncHandler(async (req, _res, next) => {
  const expected = process.env.PLATFORM_ADMIN_TOKEN;
  if (!expected) throw new UnauthorizedError("Platform admin access is not configured");
  const token = readBearer(req);
  if (!token || token !== expected) throw new UnauthorizedError("Invalid platform admin credentials");
  next();
});
