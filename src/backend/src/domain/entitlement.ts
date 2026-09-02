/**
 * Entitlement resolution for VideoReady / Micro-Drama packs.
 * Pack 1: VOD + all micro-drama
 * Pack 2: micro-drama only, resolved per entitlement group
 * Pack 3: VOD only
 * Free episodes (CMS threshold) always play without a pack.
 */

export type ContentType = "MICRO_DRAMA" | "VOD";

export interface EntitlementPack {
  packCode: string;
  status: string;
  expiresAt: Date;
  coversVod: boolean;
  coversAllMd: boolean;
  entitlementGroupId: number | null;
}

export interface EntitlementSeries {
  contentType: ContentType;
  freeEpisodeThreshold: number;
  entitlementGroupId: number | null;
}

export type EntitlementReason = "FREE" | "PACK" | "PAYWALL" | "EXPIRED";

export interface EntitlementDecision {
  allowed: boolean;
  reason: EntitlementReason;
}

export function isPackActive(pack: EntitlementPack | null, now = new Date()): boolean {
  if (!pack) return false;
  if (pack.status !== "ACTIVE") return false;
  return pack.expiresAt.getTime() > now.getTime();
}

/** 1-based episode index within the series (season + episode order). */
export function isEpisodeWithinFreeThreshold(
  episodeIndex: number,
  threshold: number,
): boolean {
  return episodeIndex >= 1 && episodeIndex <= threshold;
}

export function resolveEntitlement(input: {
  series: EntitlementSeries;
  episodeIndex: number;
  pack: EntitlementPack | null;
  now?: Date;
}): EntitlementDecision {
  const now = input.now ?? new Date();

  if (isEpisodeWithinFreeThreshold(input.episodeIndex, input.series.freeEpisodeThreshold)) {
    return { allowed: true, reason: "FREE" };
  }

  if (!input.pack) {
    return { allowed: false, reason: "PAYWALL" };
  }

  if (!isPackActive(input.pack, now)) {
    return { allowed: false, reason: "EXPIRED" };
  }

  if (input.series.contentType === "VOD") {
    return input.pack.coversVod
      ? { allowed: true, reason: "PACK" }
      : { allowed: false, reason: "PAYWALL" };
  }

  if (input.pack.coversAllMd) {
    return { allowed: true, reason: "PACK" };
  }

  if (
    input.pack.entitlementGroupId != null &&
    input.series.entitlementGroupId != null &&
    input.pack.entitlementGroupId === input.series.entitlementGroupId
  ) {
    return { allowed: true, reason: "PACK" };
  }

  return { allowed: false, reason: "PAYWALL" };
}

export function nextBillingExpiry(cycle: "WEEKLY" | "ANNUAL", from = new Date()): Date {
  const expires = new Date(from);
  if (cycle === "WEEKLY") {
    expires.setDate(expires.getDate() + 7);
  } else {
    expires.setFullYear(expires.getFullYear() + 1);
  }
  return expires;
}

export function shouldAutoRenew(pack: {
  autoRenew: boolean;
  status: string;
  expiresAt: Date;
}, now = new Date()): boolean {
  return pack.autoRenew && pack.status === "ACTIVE" && pack.expiresAt.getTime() <= now.getTime();
}
