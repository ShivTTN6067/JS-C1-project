import { prisma } from "../lib/prisma.js";
import type { ContentType } from "./entitlement.js";

export type Experience = "MD" | "VR";

export function contentTypeForExperience(experience: Experience): ContentType {
  return experience === "MD" ? "MICRO_DRAMA" : "VOD";
}

export function isSeriesVisible(series: {
  published: boolean;
  startDate: Date;
  endDate: Date | null;
}, now = new Date()): boolean {
  if (!series.published) return false;
  if (series.startDate.getTime() > now.getTime()) return false;
  if (series.endDate && series.endDate.getTime() < now.getTime()) return false;
  return true;
}

export async function orderedEpisodesForSeries(seriesId: number) {
  const seasons = await prisma.season.findMany({
    where: { seriesId },
    orderBy: { number: "asc" },
    include: { episodes: { orderBy: { number: "asc" } } },
  });
  return seasons.flatMap((season) =>
    season.episodes.map((episode) => ({
      ...episode,
      seasonNumber: season.number,
      seasonTitle: season.title,
    })),
  );
}

export function episodeIndexInList<T extends { id: number }>(
  episodes: T[],
  episodeId: number,
): number {
  const idx = episodes.findIndex((e) => e.id === episodeId);
  return idx === -1 ? -1 : idx + 1;
}

export function serializeSeriesCard(series: {
  id: number;
  title: string;
  synopsis: string;
  posterUrl: string;
  contentType: string;
  category: string;
  freeEpisodeThreshold: number;
  entitlementGroupId: number | null;
}) {
  return {
    id: series.id,
    title: series.title,
    synopsis: series.synopsis,
    posterUrl: series.posterUrl,
    contentType: series.contentType,
    category: series.category,
    freeEpisodeThreshold: series.freeEpisodeThreshold,
    entitlementGroupId: series.entitlementGroupId,
  };
}
