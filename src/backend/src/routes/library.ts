import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler.js";
import { prisma } from "../lib/prisma.js";
import { NotFoundError, ValidationError } from "../lib/errors.js";
import { requireAuth } from "../middleware/auth.js";
import { isSeriesVisible, serializeSeriesCard, contentTypeForExperience } from "../domain/catalog.js";
import { nextBillingExpiry } from "../domain/entitlement.js";
import { getActivePack } from "../lib/subscriptions.js";
import {
  experienceQuerySchema,
  idParamSchema,
  subscribeSchema,
  watchlistSchema,
} from "../validation/schemas.js";

export const libraryRouter = Router();

libraryRouter.get(
  "/watchlist",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { experience } = experienceQuerySchema.parse(req.query);
    const contentType = contentTypeForExperience(experience);
    const rows = await prisma.watchlistItem.findMany({
      where: { accountId: req.auth!.accountId, series: { contentType } },
      orderBy: { createdAt: "desc" },
      include: { series: true },
    });
    res.json(
      rows.filter((row) => isSeriesVisible(row.series)).map((row) => serializeSeriesCard(row.series)),
    );
  }),
);

libraryRouter.post(
  "/watchlist",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { seriesId } = watchlistSchema.parse(req.body);
    const series = await prisma.series.findUnique({ where: { id: seriesId } });
    if (!series || !isSeriesVisible(series)) throw new NotFoundError(`Series ${seriesId} not found`);

    const item = await prisma.watchlistItem.upsert({
      where: {
        accountId_seriesId: { accountId: req.auth!.accountId, seriesId },
      },
      create: { accountId: req.auth!.accountId, seriesId },
      update: {},
    });
    res.status(201).json({ ...item, message: "Added to watchlist" });
  }),
);

libraryRouter.delete(
  "/watchlist/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const existing = await prisma.watchlistItem.findFirst({
      where: { accountId: req.auth!.accountId, seriesId: id },
    });
    if (!existing) throw new NotFoundError("Watchlist item not found");
    await prisma.watchlistItem.delete({ where: { id: existing.id } });
    res.json({ message: "Removed from watchlist" });
  }),
);

libraryRouter.get(
  "/continue-watching",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { experience } = experienceQuerySchema.parse(req.query);
    const contentType = contentTypeForExperience(experience);
    const rows = await prisma.watchProgress.findMany({
      where: { accountId: req.auth!.accountId, completed: false, series: { contentType } },
      orderBy: { updatedAt: "desc" },
      include: { series: true, episode: true },
    });
    const seen = new Set<number>();
    const items = [];
    for (const row of rows) {
      if (seen.has(row.seriesId)) continue;
      if (!isSeriesVisible(row.series)) continue;
      seen.add(row.seriesId);
      items.push({
        ...serializeSeriesCard(row.series),
        resumeEpisodeId: row.episodeId,
        episodeTitle: row.episode.title,
        positionSeconds: row.positionSeconds,
        durationSeconds: row.durationSeconds,
      });
    }
    res.json(items);
  }),
);

libraryRouter.get(
  "/subscription",
  requireAuth,
  asyncHandler(async (req, res) => {
    const active = await getActivePack(req.auth!.accountId);
    const history = await prisma.userSubscription.findMany({
      where: { accountId: req.auth!.accountId },
      orderBy: { startsAt: "desc" },
    });
    res.json({ active, history });
  }),
);

libraryRouter.post(
  "/subscribe",
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = subscribeSchema.parse(req.body);
    const pack = await prisma.subscriptionPack.findUnique({
      where: { code_billingCycle: { code: data.packCode, billingCycle: data.billingCycle } },
    });
    if (!pack) throw new NotFoundError("Subscription pack not found");

    if (data.packCode === "PACK_2" && !data.entitlementGroupId) {
      throw new ValidationError("Pack 2 requires an entitlement group");
    }

    if (data.packCode === "PACK_2") {
      const allowed = await prisma.packGroupAccess.findFirst({
        where: {
          packCode: data.packCode,
          entitlementGroupId: data.entitlementGroupId!,
        },
      });
      if (!allowed) {
        throw new ValidationError("Invalid entitlement group for this pack");
      }
    }

    const sub = await prisma.$transaction(async (tx) => {
      await tx.userSubscription.updateMany({
        where: { accountId: req.auth!.accountId, status: "ACTIVE" },
        data: { status: "CANCELLED", autoRenew: false },
      });

      return tx.userSubscription.create({
        data: {
          accountId: req.auth!.accountId,
          packCode: data.packCode,
          billingCycle: data.billingCycle,
          autoRenew: true,
          status: "ACTIVE",
          purchaseChannel: data.purchaseChannel,
          entitlementGroupId: data.packCode === "PACK_2" ? data.entitlementGroupId ?? null : null,
          expiresAt: nextBillingExpiry(data.billingCycle),
        },
      });
    });

    res.status(201).json(sub);
  }),
);

libraryRouter.post(
  "/subscribe/cancel",
  requireAuth,
  asyncHandler(async (req, res) => {
    await prisma.userSubscription.updateMany({
      where: { accountId: req.auth!.accountId, status: "ACTIVE" },
      data: { autoRenew: false },
    });
    res.json({ message: "Subscription cancelled. Access remains until the period ends." });
  }),
);
