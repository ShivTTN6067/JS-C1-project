-- AlterTable
-- VideoReady / Micro-Drama Phase 1 catalog, entitlements, and playback.

CREATE TABLE "PlatformConfig" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "deploymentMode" TEXT NOT NULL DEFAULT 'HYBRID',
    "adSlotEveryN" INTEGER NOT NULL DEFAULT 4
);

CREATE TABLE "Account" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "Account_email_key" ON "Account"("email");

CREATE TABLE "Profile" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "accountId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    CONSTRAINT "Profile_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "Profile_accountId_idx" ON "Profile"("accountId");

CREATE TABLE "Session" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "token" TEXT NOT NULL,
    "accountId" INTEGER NOT NULL,
    "profileId" INTEGER,
    "expiresAt" DATETIME NOT NULL,
    CONSTRAINT "Session_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");
CREATE INDEX "Session_accountId_idx" ON "Session"("accountId");

CREATE TABLE "EntitlementGroup" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL
);

CREATE UNIQUE INDEX "EntitlementGroup_code_key" ON "EntitlementGroup"("code");

CREATE TABLE "Series" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "synopsis" TEXT NOT NULL,
    "posterUrl" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "freeEpisodeThreshold" INTEGER NOT NULL DEFAULT 3,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME,
    "entitlementGroupId" INTEGER,
    "published" BOOLEAN NOT NULL DEFAULT 1,
    CONSTRAINT "Series_entitlementGroupId_fkey" FOREIGN KEY ("entitlementGroupId") REFERENCES "EntitlementGroup" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "Series_contentType_idx" ON "Series"("contentType");
CREATE INDEX "Series_category_idx" ON "Series"("category");

CREATE TABLE "Season" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "seriesId" INTEGER NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    CONSTRAINT "Season_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Season_seriesId_number_key" ON "Season"("seriesId", "number");

CREATE TABLE "Episode" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "seasonId" INTEGER NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "synopsis" TEXT NOT NULL,
    "durationSeconds" INTEGER NOT NULL,
    "isCliffhanger" BOOLEAN NOT NULL DEFAULT 0,
    "videoUrl" TEXT NOT NULL,
    "videoUrlLow" TEXT,
    "videoUrlHigh" TEXT,
    "posterUrl" TEXT NOT NULL,
    CONSTRAINT "Episode_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Episode_seasonId_number_key" ON "Episode"("seasonId", "number");

CREATE TABLE "Rail" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "experience" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT,
    "sortOrder" INTEGER NOT NULL
);

CREATE INDEX "Rail_experience_idx" ON "Rail"("experience");

CREATE TABLE "RailItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "railId" INTEGER NOT NULL,
    "seriesId" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    CONSTRAINT "RailItem_railId_fkey" FOREIGN KEY ("railId") REFERENCES "Rail" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RailItem_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "SubscriptionPack" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "billingCycle" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "coversVod" BOOLEAN NOT NULL,
    "coversAllMd" BOOLEAN NOT NULL
);

CREATE UNIQUE INDEX "SubscriptionPack_code_billingCycle_key" ON "SubscriptionPack"("code", "billingCycle");

CREATE TABLE "PackGroupAccess" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "packCode" TEXT NOT NULL,
    "entitlementGroupId" INTEGER NOT NULL
);

CREATE TABLE "UserSubscription" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "accountId" INTEGER NOT NULL,
    "packCode" TEXT NOT NULL,
    "billingCycle" TEXT NOT NULL,
    "autoRenew" BOOLEAN NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "purchaseChannel" TEXT NOT NULL DEFAULT 'WEB',
    "entitlementGroupId" INTEGER,
    "startsAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL,
    CONSTRAINT "UserSubscription_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "UserSubscription_accountId_idx" ON "UserSubscription"("accountId");

CREATE TABLE "WatchProgress" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "accountId" INTEGER NOT NULL,
    "seriesId" INTEGER NOT NULL,
    "episodeId" INTEGER NOT NULL,
    "positionSeconds" INTEGER NOT NULL DEFAULT 0,
    "durationSeconds" INTEGER NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WatchProgress_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WatchProgress_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WatchProgress_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "WatchProgress_accountId_episodeId_key" ON "WatchProgress"("accountId", "episodeId");
CREATE INDEX "WatchProgress_accountId_updatedAt_idx" ON "WatchProgress"("accountId", "updatedAt");

CREATE TABLE "WatchlistItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "accountId" INTEGER NOT NULL,
    "seriesId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WatchlistItem_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WatchlistItem_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "WatchlistItem_accountId_seriesId_key" ON "WatchlistItem"("accountId", "seriesId");
