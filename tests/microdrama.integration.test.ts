import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/backend/src/app.js";
import { prisma } from "../src/backend/src/lib/prisma.js";
import { hashPassword } from "../src/backend/src/lib/password.js";

let server: Server;
let baseUrl: string;

async function http(method: string, path: string, body?: unknown, token?: string) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : undefined };
}

async function resetCatalog() {
  await prisma.watchProgress.deleteMany();
  await prisma.watchlistItem.deleteMany();
  await prisma.userSubscription.deleteMany();
  await prisma.session.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.account.deleteMany();
  await prisma.railItem.deleteMany();
  await prisma.rail.deleteMany();
  await prisma.episode.deleteMany();
  await prisma.season.deleteMany();
  await prisma.series.deleteMany();
  await prisma.packGroupAccess.deleteMany();
  await prisma.subscriptionPack.deleteMany();
  await prisma.entitlementGroup.deleteMany();
  await prisma.platformConfig.deleteMany();

  await prisma.platformConfig.create({
    data: { id: 1, deploymentMode: "HYBRID", adSlotEveryN: 3 },
  });
  const groupA = await prisma.entitlementGroup.create({
    data: { code: "GROUP_A", name: "Group A" },
  });
  const groupB = await prisma.entitlementGroup.create({
    data: { code: "GROUP_B", name: "Group B" },
  });
  await prisma.subscriptionPack.createMany({
    data: [
      {
        code: "PACK_1",
        name: "All Access",
        billingCycle: "WEEKLY",
        description: "All",
        priceCents: 100,
        coversVod: true,
        coversAllMd: true,
      },
      {
        code: "PACK_2",
        name: "MD Group",
        billingCycle: "WEEKLY",
        description: "Group",
        priceCents: 100,
        coversVod: false,
        coversAllMd: false,
      },
    ],
  });

  const md = await prisma.series.create({
    data: {
      title: "Hooked",
      synopsis: "A cliffhanger series",
      posterUrl: "https://example.com/p.jpg",
      contentType: "MICRO_DRAMA",
      category: "Romance",
      freeEpisodeThreshold: 2,
      startDate: new Date("2020-01-01"),
      entitlementGroupId: groupA.id,
      seasons: {
        create: {
          number: 1,
          title: "S1",
          episodes: {
            create: [
              {
                number: 1,
                title: "E1",
                synopsis: "Free",
                durationSeconds: 60,
                isCliffhanger: false,
                videoUrl: "https://example.com/1.mp4",
                posterUrl: "https://example.com/p.jpg",
              },
              {
                number: 2,
                title: "E2",
                synopsis: "Cliff",
                durationSeconds: 60,
                isCliffhanger: true,
                videoUrl: "https://example.com/2.mp4",
                posterUrl: "https://example.com/p.jpg",
              },
              {
                number: 3,
                title: "E3",
                synopsis: "Paid",
                durationSeconds: 60,
                isCliffhanger: false,
                videoUrl: "https://example.com/3.mp4",
                posterUrl: "https://example.com/p.jpg",
              },
            ],
          },
        },
      },
    },
  });

  await prisma.series.create({
    data: {
      title: "Other Group Drama",
      synopsis: "Group B",
      posterUrl: "https://example.com/b.jpg",
      contentType: "MICRO_DRAMA",
      category: "Thriller",
      freeEpisodeThreshold: 0,
      startDate: new Date("2020-01-01"),
      entitlementGroupId: groupB.id,
      seasons: {
        create: {
          number: 1,
          title: "S1",
          episodes: {
            create: [
              {
                number: 1,
                title: "Locked",
                synopsis: "Paid",
                durationSeconds: 60,
                videoUrl: "https://example.com/x.mp4",
                posterUrl: "https://example.com/b.jpg",
              },
            ],
          },
        },
      },
    },
  });

  await prisma.series.create({
    data: {
      title: "Ocean Film",
      synopsis: "VOD title",
      posterUrl: "https://example.com/v.jpg",
      contentType: "VOD",
      category: "Documentary",
      freeEpisodeThreshold: 1,
      startDate: new Date("2020-01-01"),
      seasons: {
        create: {
          number: 1,
          title: "S1",
          episodes: {
            create: [
              {
                number: 1,
                title: "Part 1",
                synopsis: "Free VOD",
                durationSeconds: 60,
                videoUrl: "https://example.com/v.mp4",
                posterUrl: "https://example.com/v.jpg",
              },
            ],
          },
        },
      },
    },
  });

  await prisma.series.create({
    data: {
      title: "Future Drop",
      synopsis: "Not yet scheduled",
      posterUrl: "https://example.com/f.jpg",
      contentType: "MICRO_DRAMA",
      category: "Romance",
      freeEpisodeThreshold: 1,
      startDate: new Date("2099-01-01"),
      entitlementGroupId: groupA.id,
    },
  });

  const rail = await prisma.rail.create({
    data: { experience: "MD", title: "Romance", type: "CATEGORY", category: "Romance", sortOrder: 1 },
  });
  await prisma.railItem.create({ data: { railId: rail.id, seriesId: md.id, sortOrder: 0 } });

  const freeUser = await prisma.account.create({
    data: {
      email: "free@test.local",
      name: "Free User",
      passwordHash: hashPassword("password123"),
      profiles: { create: { name: "Free", type: "REGULAR" } },
    },
  });
  const vip = await prisma.account.create({
    data: {
      email: "vip@test.local",
      name: "VIP User",
      passwordHash: hashPassword("password123"),
      profiles: {
        create: [
          { name: "VIP", type: "REGULAR" },
          { name: "Kid", type: "KIDS" },
        ],
      },
    },
  });
  await prisma.userSubscription.create({
    data: {
      accountId: vip.id,
      packCode: "PACK_1",
      billingCycle: "WEEKLY",
      status: "ACTIVE",
      expiresAt: new Date("2099-01-01"),
    },
  });

  return { md, freeUser, vip, groupA };
}

async function login(email: string) {
  const res = await http("POST", "/api/auth/login", { email, password: "password123" });
  expect(res.status).toBe(200);
  return res.body.token as string;
}

beforeAll(async () => {
  const app = createApp();
  await new Promise<void>((resolve) => {
    server = app.listen(0, resolve);
  });
  const { port } = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((err) => (err ? reject(err) : resolve())),
  );
});

describe("Micro Drama Phase 1 API", () => {
  beforeEach(async () => {
    await resetCatalog();
  });

  it("keeps scheduled series hidden until the start date", async () => {
    const home = await http("GET", "/api/catalog/home?experience=MD");
    expect(home.status).toBe(200);
    const titles = home.body.rails.flatMap((r: { items: { title: string }[] }) =>
      r.items.map((i) => i.title),
    );
    expect(titles).toContain("Hooked");
    expect(titles).not.toContain("Future Drop");
  });

  it("isolates search to the active experience", async () => {
    const md = await http("GET", "/api/catalog/search?experience=MD&q=Ocean");
    const vr = await http("GET", "/api/catalog/search?experience=VR&q=Ocean");
    expect(md.body).toHaveLength(0);
    expect(vr.body[0].title).toBe("Ocean Film");
  });

  it("requires login before playback even for free episodes", async () => {
    const series = await prisma.series.findFirst({ where: { title: "Hooked" } });
    const episode = await prisma.episode.findFirst({
      where: { season: { seriesId: series!.id }, number: 1 },
    });
    const res = await http("GET", `/api/playback/episodes/${episode!.id}`);
    expect(res.status).toBe(401);
  });

  it("plays free episodes and paywalls the episode after a cliffhanger", async () => {
    const token = await login("free@test.local");
    const series = await prisma.series.findFirst({ where: { title: "Hooked" } });
    const episodes = await prisma.episode.findMany({
      where: { season: { seriesId: series!.id } },
      orderBy: { number: "asc" },
    });
    const free = await http("GET", `/api/playback/episodes/${episodes[1].id}`, undefined, token);
    expect(free.status).toBe(200);
    expect(free.body.episode.title).toBe("E2");

    const paid = await http("GET", `/api/playback/episodes/${episodes[2].id}`, undefined, token);
    expect(paid.status).toBe(402);
    expect(paid.body.error.details.paywall).toBe(true);
    expect(paid.body.error.details.cliffhanger).toBe(true);
  });

  it("lets Pack 1 skip the paywall and stores watchlist + progress", async () => {
    const token = await login("vip@test.local");
    const series = await prisma.series.findFirst({ where: { title: "Hooked" } });
    const episode = await prisma.episode.findFirst({
      where: { season: { seriesId: series!.id }, number: 3 },
    });
    const play = await http("GET", `/api/playback/episodes/${episode!.id}`, undefined, token);
    expect(play.status).toBe(200);

    const added = await http("POST", "/api/library/watchlist", { seriesId: series!.id }, token);
    expect(added.status).toBe(201);
    const list = await http("GET", "/api/library/watchlist?experience=MD", undefined, token);
    expect(list.body).toHaveLength(1);

    const progress = await http(
      "POST",
      "/api/playback/progress",
      { episodeId: episode!.id, positionSeconds: 12, durationSeconds: 60 },
      token,
    );
    expect(progress.status).toBe(200);
    const again = await http("GET", `/api/playback/episodes/${episode!.id}`, undefined, token);
    expect(again.body.resumePositionSeconds).toBe(12);
  });
});
