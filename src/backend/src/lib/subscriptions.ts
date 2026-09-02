import { prisma } from "../lib/prisma.js";
import type { EntitlementPack } from "../domain/entitlement.js";
import { isPackActive, nextBillingExpiry } from "../domain/entitlement.js";

export async function getActivePack(accountId: number): Promise<EntitlementPack | null> {
  const subs = await prisma.userSubscription.findMany({
    where: { accountId },
    orderBy: { expiresAt: "desc" },
  });
  if (subs.length === 0) return null;

  const now = new Date();
  for (const sub of subs) {
    if (sub.status === "ACTIVE" && sub.autoRenew && sub.expiresAt.getTime() <= now.getTime()) {
      const renewed = await prisma.userSubscription.update({
        where: { id: sub.id },
        data: {
          startsAt: now,
          expiresAt: nextBillingExpiry(sub.billingCycle as "WEEKLY" | "ANNUAL", now),
        },
      });
      Object.assign(sub, renewed);
    } else if (sub.status === "ACTIVE" && sub.expiresAt.getTime() <= now.getTime()) {
      await prisma.userSubscription.update({
        where: { id: sub.id },
        data: { status: "EXPIRED" },
      });
      sub.status = "EXPIRED";
    }
  }

  const live = subs.find((s) => isPackActive({
    packCode: s.packCode,
    status: s.status,
    expiresAt: s.expiresAt,
    coversVod: false,
    coversAllMd: false,
    entitlementGroupId: s.entitlementGroupId,
  }, now));
  if (!live) return null;

  const packDef = await prisma.subscriptionPack.findFirst({
    where: { code: live.packCode },
  });
  if (!packDef) return null;

  return {
    packCode: live.packCode,
    status: live.status,
    expiresAt: live.expiresAt,
    coversVod: packDef.coversVod,
    coversAllMd: packDef.coversAllMd,
    entitlementGroupId: live.entitlementGroupId,
  };
}

export async function paywallPayload(accountId: number | null) {
  const packs = await prisma.subscriptionPack.findMany({
    orderBy: [{ code: "asc" }, { billingCycle: "asc" }],
  });
  const groups = await prisma.entitlementGroup.findMany({ orderBy: { code: "asc" } });
  const active = accountId ? await getActivePack(accountId) : null;
  return { packs, entitlementGroups: groups, activePack: active };
}
