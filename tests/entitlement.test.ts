import { describe, expect, it } from "vitest";
import {
  isEpisodeWithinFreeThreshold,
  nextBillingExpiry,
  resolveEntitlement,
  shouldAutoRenew,
  type EntitlementPack,
} from "../src/backend/src/domain/entitlement.js";

const pack1: EntitlementPack = {
  packCode: "PACK_1",
  status: "ACTIVE",
  expiresAt: new Date("2099-01-01"),
  coversVod: true,
  coversAllMd: true,
  entitlementGroupId: null,
};

const pack2GroupA: EntitlementPack = {
  packCode: "PACK_2",
  status: "ACTIVE",
  expiresAt: new Date("2099-01-01"),
  coversVod: false,
  coversAllMd: false,
  entitlementGroupId: 1,
};

const pack3: EntitlementPack = {
  packCode: "PACK_3",
  status: "ACTIVE",
  expiresAt: new Date("2099-01-01"),
  coversVod: true,
  coversAllMd: false,
  entitlementGroupId: null,
};

const mdSeries = {
  contentType: "MICRO_DRAMA" as const,
  freeEpisodeThreshold: 3,
  entitlementGroupId: 1,
};

describe("entitlement resolution", () => {
  it("allows episodes inside the CMS free threshold without a pack", () => {
    expect(isEpisodeWithinFreeThreshold(3, 3)).toBe(true);
    expect(isEpisodeWithinFreeThreshold(4, 3)).toBe(false);
    const decision = resolveEntitlement({
      series: mdSeries,
      episodeIndex: 2,
      pack: null,
    });
    expect(decision).toEqual({ allowed: true, reason: "FREE" });
  });

  it("paywalls paid micro-drama episodes for users without a covering pack", () => {
    expect(
      resolveEntitlement({ series: mdSeries, episodeIndex: 4, pack: null }).allowed,
    ).toBe(false);
    expect(
      resolveEntitlement({ series: mdSeries, episodeIndex: 4, pack: pack3 }).reason,
    ).toBe("PAYWALL");
  });

  it("resolves Pack 2 at the entitlement-group level", () => {
    expect(
      resolveEntitlement({ series: mdSeries, episodeIndex: 4, pack: pack2GroupA }).allowed,
    ).toBe(true);
    expect(
      resolveEntitlement({
        series: { ...mdSeries, entitlementGroupId: 2 },
        episodeIndex: 4,
        pack: pack2GroupA,
      }).allowed,
    ).toBe(false);
  });

  it("lets Pack 1 cover both VOD and micro-drama", () => {
    expect(
      resolveEntitlement({ series: mdSeries, episodeIndex: 8, pack: pack1 }).reason,
    ).toBe("PACK");
    expect(
      resolveEntitlement({
        series: { contentType: "VOD", freeEpisodeThreshold: 0, entitlementGroupId: null },
        episodeIndex: 1,
        pack: pack1,
      }).allowed,
    ).toBe(true);
  });

  it("renews VIP packs when auto-renew is on and the period elapsed", () => {
    const expired = new Date("2000-01-01");
    expect(
      shouldAutoRenew({ autoRenew: true, status: "ACTIVE", expiresAt: expired }),
    ).toBe(true);
    const weekly = nextBillingExpiry("WEEKLY", new Date("2026-01-01"));
    expect(weekly.toISOString().startsWith("2026-01-08")).toBe(true);
  });
});
