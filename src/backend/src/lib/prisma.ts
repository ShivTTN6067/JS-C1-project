import { PrismaClient } from "@prisma/client";

/**
 * Shared Prisma client instance. A single client is reused across the
 * process to avoid exhausting database connections.
 */
export const prisma = new PrismaClient();
