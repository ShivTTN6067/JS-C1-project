import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler.js";
import { prisma } from "../lib/prisma.js";
import { NotFoundError } from "../lib/errors.js";
import { assertMicroDramaAllowed, optionalAuth } from "../middleware/auth.js";
import {
  contentTypeForExperience,
  episodeIndexInList,
  isSeriesVisible,
  orderedEpisodesForSeries,
  serializeSeriesCard,
} from "../domain/catalog.js";
import { resolveEntitlement } from "../domain/entitlement.js";
import { getActivePack } from "../lib/subscriptions.js";
import { experienceQuerySchema, idParamSchema, searchQuerySchema } from "../validation/schemas.js";

export const catalogRouter = Router();

catalogRouter.get(
  "/home",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { experience } = experienceQuerySchema.parse(req.query);
    if (experience === "MD") assertMicroDramaAllowed(req.auth);
    const contentType = contentTypeForExperience(experience);
    const config = await prisma.platformConfig.findUnique({ where: { id: 1 } });
    const adSlotEveryN = config?.adSlotEveryN ?? 4;

    const rails = await prisma.rail.findMany({
      where: { experience },
      orderBy: { sortOrder: "asc" },
      include: {
        items: {
          orderBy: { sortOrder: "asc" },
          include: { series: true },
        },
      },
    });

    const continueWatching =
      req.auth && experience
        ? await buildContinueWatching(req.auth.accountId, contentType)
        : [];

    const payload = [];
    for (const rail of rails) {
      if (rail.type === "CONTINUE_WATCHING") {
        payload.push({
          id: rail.id,
          title: rail.title,
          type: rail.type,
          category: rail.category,
          items: continueWatching,
        });
        continue;
      }
      const items = rail.items
        .filter((item) => item.series.contentType === contentType)
        .filter((item) => isSeriesVisible(item.series))
        .map((item, index) => ({
          ...serializeSeriesCard(item.series),
          adSlot: adSlotEveryN > 0 && (index + 1) % adSlotEveryN === 0,
        }));
      payload.push({
        id: rail.id,
        title: rail.title,
        type: rail.type,
        category: rail.category,
        items,
      });
    }

    res.json({ experience, adSlotEveryN, rails: payload });
  }),
);

catalogRouter.get(
  "/search",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { experience, q } = searchQuerySchema.parse(req.query);
    if (experience === "MD") assertMicroDramaAllowed(req.auth);
    const contentType = contentTypeForExperience(experience);
    const rows = await prisma.series.findMany({
      where: {
        contentType,
        OR: [{ title: { contains: q } }, { synopsis: { contains: q } }, { category: { contains: q } }],
      },
      orderBy: { title: "asc" },
    });
    res.json(rows.filter((s) => isSeriesVisible(s)).map(serializeSeriesCard));
  }),
);

catalogRouter.get(
  "/series/:id",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { id } = idParamSchema.parse(req.params);
    const series = await prisma.series.findUnique({
      where: { id },
      include: {
        seasons: {
          orderBy: { number: "asc" },
          include: { episodes: { orderBy: { number: "asc" } } },
        },
        entitlementGroup: true,
      },
    });
    if (!series || !isSeriesVisible(series)) throw new NotFoundError(`Series ${id} not found`);
    if (series.contentType === "MICRO_DRAMA") assertMicroDramaAllowed(req.auth);

    const episodes = await orderedEpisodesForSeries(series.id);
    const pack = req.auth ? await getActivePack(req.auth.accountId) : null;
    const inWatchlist = req.auth
      ? Boolean(
          await prisma.watchlistItem.findUnique({
            where: { accountId_seriesId: { accountId: req.auth.accountId, seriesId: series.id } },
          }),
        )
      : false;
    const progressRows = req.auth
      ? await prisma.watchProgress.findMany({
          where: { accountId: req.auth.accountId, seriesId: series.id },
        })
      : [];
    const progressByEpisode = new Map(progressRows.map((p) => [p.episodeId, p]));

    res.json({
      ...serializeSeriesCard(series),
      inWatchlist,
      entitlementGroup: series.entitlementGroup,
      seasons: series.seasons.map((season) => ({
        id: season.id,
        number: season.number,
        title: season.title,
        episodes: season.episodes.map((episode) => {
          const index = episodeIndexInList(episodes, episode.id);
          const access = resolveEntitlement({
            series: {
              contentType: series.contentType as "MICRO_DRAMA" | "VOD",
              freeEpisodeThreshold: series.freeEpisodeThreshold,
              entitlementGroupId: series.entitlementGroupId,
            },
            episodeIndex: index,
            pack,
          });
          const progress = progressByEpisode.get(episode.id);
          return {
            id: episode.id,
            number: episode.number,
            title: episode.title,
            synopsis: episode.synopsis,
            durationSeconds: episode.durationSeconds,
            isCliffhanger: episode.isCliffhanger,
            posterUrl: episode.posterUrl,
            locked: !access.allowed,
            accessReason: access.reason,
            progress: progress
              ? {
                  positionSeconds: progress.positionSeconds,
                  completed: progress.completed,
                }
              : null,
          };
        }),
      })),
    });
  }),
);

async function buildContinueWatching(accountId: number, contentType: string) {
  const rows = await prisma.watchProgress.findMany({
    where: { accountId, completed: false, series: { contentType } },
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
      positionSeconds: row.positionSeconds,
      durationSeconds: row.durationSeconds,
    });
  }
  return items;
}
