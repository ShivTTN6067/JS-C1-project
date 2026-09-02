import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

export function passwordsMatch(password: string, passwordHash: string): boolean {
  const incoming = Buffer.from(hashPassword(password), "hex");
  const stored = Buffer.from(passwordHash, "hex");
  if (incoming.length !== stored.length) return false;
  return timingSafeEqual(incoming, stored);
}

export function createSessionToken(): string {
  return randomBytes(32).toString("hex");
}

export function sessionExpiry(days = 14): Date {
  const expires = new Date();
  expires.setDate(expires.getDate() + days);
  return expires;
}
