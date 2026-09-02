import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler.js";
import { prisma } from "../lib/prisma.js";
import { platformConfigSchema } from "../validation/schemas.js";

export const platformRouter = Router();

async function getOrCreateConfig() {
  const existing = await prisma.platformConfig.findUnique({ where: { id: 1 } });
  if (existing) return existing;
  return prisma.platformConfig.create({
    data: { id: 1, deploymentMode: "HYBRID", adSlotEveryN: 4 },
  });
}

platformRouter.get(
  "/config",
  asyncHandler(async (_req, res) => {
    const config = await getOrCreateConfig();
    res.json(config);
  }),
);

platformRouter.patch(
  "/config",
  asyncHandler(async (req, res) => {
    const data = platformConfigSchema.parse(req.body);
    await getOrCreateConfig();
    const config = await prisma.platformConfig.update({
      where: { id: 1 },
      data,
    });
    res.json(config);
  }),
);

platformRouter.get(
  "/packs",
  asyncHandler(async (_req, res) => {
    const [packs, groups] = await Promise.all([
      prisma.subscriptionPack.findMany({ orderBy: [{ code: "asc" }, { billingCycle: "asc" }] }),
      prisma.entitlementGroup.findMany({ orderBy: { code: "asc" } }),
    ]);
    res.json({ packs, entitlementGroups: groups });
  }),
);
