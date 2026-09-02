import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler.js";
import { prisma } from "../lib/prisma.js";
import { NotFoundError, PaywallError, UnauthorizedError } from "../lib/errors.js";
import { optionalAuth, requireAuth, assertMicroDramaAllowed } from "../middleware/auth.js";
import {
  episodeIndexInList,
  isSeriesVisible,
  orderedEpisodesForSeries,
} from "../domain/catalog.js";
import { resolveEntitlement } from "../domain/entitlement.js";
import { getActivePack, paywallPayload } from "../lib/subscriptions.js";
import { idParamSchema, progressSchema } from "../validation/schemas.js";

export const playbackRouter = Router();

playbackRouter.get(
  "/episodes/:id",
  optionalAuth,
  asyncHandler(async (req, res) => {
    if (!req.auth) throw new UnauthorizedError("Login is required to play content");

    const { id } = idParamSchema.parse(req.params);
    const episode = await prisma.episode.findUnique({
      where: { id },
      include: { season: { include: { series: true } } },
    });
    if (!episode) throw new NotFoundError(`Episode ${id} not found`);

    const series = episode.season.series;
    if (!isSeriesVisible(series)) throw new NotFoundError(`Episode ${id} not found`);
    if (series.contentType === "MICRO_DRAMA") assertMicroDramaAllowed(req.auth);

    const episodes = await orderedEpisodesForSeries(series.id);
    const index = episodeIndexInList(episodes, episode.id);
    const pack = await getActivePack(req.auth.accountId);
    const access = resolveEntitlement({
      series: {
        contentType: series.contentType as "MICRO_DRAMA" | "VOD",
        freeEpisodeThreshold: series.freeEpisodeThreshold,
        entitlementGroupId: series.entitlementGroupId,
      },
      episodeIndex: index,
      pack,
    });

    if (!access.allowed) {
      throw new PaywallError("Subscribe to continue watching", {
        paywall: true,
        reason: access.reason,
        cliffhanger: episode.isCliffhanger || episodes[index - 2]?.isCliffhanger === true,
        seriesId: series.id,
        episodeId: episode.id,
        ...(await paywallPayload(req.auth.accountId)),
      });
    }

    const progress = await prisma.watchProgress.findUnique({
      where: {
        accountId_episodeId: { accountId: req.auth.accountId, episodeId: episode.id },
      },
    });

    const currentIdx = episodes.findIndex((e) => e.id === episode.id);
    const nextEpisode = currentIdx >= 0 ? episodes[currentIdx + 1] ?? null : null;
    const prevEpisode = currentIdx > 0 ? episodes[currentIdx - 1] ?? null : null;

    res.json({
      series: {
        id: series.id,
        title: series.title,
        contentType: series.contentType,
        category: series.category,
        freeEpisodeThreshold: series.freeEpisodeThreshold,
        posterUrl: series.posterUrl,
      },
      episode: {
        id: episode.id,
        number: episode.number,
        seasonNumber: episode.season.number,
        title: episode.title,
        synopsis: episode.synopsis,
        durationSeconds: episode.durationSeconds,
        isCliffhanger: episode.isCliffhanger,
        posterUrl: episode.posterUrl,
        videoUrl: episode.videoUrl,
        renditions: {
          low: episode.videoUrlLow ?? episode.videoUrl,
          medium: episode.videoUrl,
          high: episode.videoUrlHigh ?? episode.videoUrl,
        },
      },
      feed: episodes.map((item) => ({
        id: item.id,
        number: item.number,
        seasonNumber: item.seasonNumber,
        title: item.title,
        posterUrl: item.posterUrl,
        isCliffhanger: item.isCliffhanger,
      })),
      nextEpisodeId: nextEpisode?.id ?? null,
      prevEpisodeId: prevEpisode?.id ?? null,
      resumePositionSeconds: progress?.positionSeconds ?? 0,
      accessReason: access.reason,
    });
  }),
);

playbackRouter.post(
  "/progress",
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = progressSchema.parse(req.body);
    const episode = await prisma.episode.findUnique({
      where: { id: data.episodeId },
      include: { season: true },
    });
    if (!episode) throw new NotFoundError(`Episode ${data.episodeId} not found`);

    const completed =
      data.completed ?? data.positionSeconds >= data.durationSeconds * 0.95;

    const row = await prisma.watchProgress.upsert({
      where: {
        accountId_episodeId: {
          accountId: req.auth!.accountId,
          episodeId: data.episodeId,
        },
      },
      create: {
        accountId: req.auth!.accountId,
        seriesId: episode.season.seriesId,
        episodeId: data.episodeId,
        positionSeconds: Math.floor(data.positionSeconds),
        durationSeconds: Math.floor(data.durationSeconds),
        completed,
      },
      update: {
        positionSeconds: Math.floor(data.positionSeconds),
        durationSeconds: Math.floor(data.durationSeconds),
        completed,
      },
    });

    res.json(row);
  }),
);
