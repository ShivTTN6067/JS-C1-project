-- Support Ticket Management System - SQLite schema
--
-- This file mirrors the authoritative Prisma migration at
-- src/backend/prisma/migrations/<timestamp>_init/migration.sql
-- It is provided for reviewers who want to read the schema without
-- running Prisma. The application always uses the Prisma migrations.

-- Users are seeded only; there is no user-management UI.
CREATE TABLE "User" (
    "id"    INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name"  TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role"  TEXT NOT NULL
);

CREATE TABLE "Ticket" (
    "id"           INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title"        TEXT NOT NULL,
    "description"  TEXT NOT NULL,
    "priority"     TEXT NOT NULL DEFAULT 'MEDIUM',   -- LOW | MEDIUM | HIGH
    "status"       TEXT NOT NULL DEFAULT 'OPEN',      -- OPEN | IN_PROGRESS | RESOLVED | CLOSED | CANCELLED
    "createdById"  INTEGER NOT NULL,
    "assignedToId" INTEGER,
    "createdAt"    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    DATETIME NOT NULL,
    CONSTRAINT "Ticket_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Ticket_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "Comment" (
    "id"          INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ticketId"    INTEGER NOT NULL,
    "message"     TEXT NOT NULL,
    "createdById" INTEGER NOT NULL,
    "createdAt"   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Comment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Comment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "Ticket_status_idx" ON "Ticket"("status");
CREATE INDEX "Comment_ticketId_idx" ON "Comment"("ticketId");
