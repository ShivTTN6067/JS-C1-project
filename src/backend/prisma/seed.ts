import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password.js";

const prisma = new PrismaClient();

const VIDEOS = {
  a: "/media/clip-01.mp4",
  b: "/media/clip-02.mp4",
  c: "/media/clip-03.mp4",
  d: "/media/clip-04.mp4",
  e: "/media/clip-05.mp4",
  f: "/media/clip-06.mp4",
  g: "/media/clip-07.mp4",
  h: "/media/clip-08.mp4",
};

const posters = {
  midnight: "/media/poster-midnight.jpg",
  contract: "/media/poster-contract.jpg",
  office: "/media/poster-office.jpg",
  ocean: "/media/poster-ocean.jpg",
  classic: "/media/poster-classic.jpg",
};

/**
 * Seeds tickets (assessment app) plus VideoReady / Micro-Drama Phase 1 data.
 * Safe to run repeatedly: it clears existing rows first so the seed is deterministic.
 */
async function main() {
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
  await prisma.comment.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.user.deleteMany();

  const [alice, bob, carol] = await Promise.all([
    prisma.user.create({
      data: { name: "Alice Nguyen", email: "alice@example.com", role: "AGENT" },
    }),
    prisma.user.create({
      data: { name: "Bob Martinez", email: "bob@example.com", role: "AGENT" },
    }),
    prisma.user.create({
      data: { name: "Carol Smith", email: "carol@example.com", role: "ADMIN" },
    }),
  ]);

  const loginTicket = await prisma.ticket.create({
    data: {
      title: "Cannot log in after password reset",
      description:
        "User reports the login page rejects the new password immediately after resetting it.",
      priority: "HIGH",
      status: "OPEN",
      createdById: carol.id,
      assignedToId: alice.id,
    },
  });

  await prisma.ticket.create({
    data: {
      title: "Dashboard chart renders blank on Safari",
      description:
        "The analytics chart shows an empty canvas on Safari 17 but works in Chrome and Firefox.",
      priority: "MEDIUM",
      status: "IN_PROGRESS",
      createdById: bob.id,
      assignedToId: bob.id,
    },
  });

  await prisma.ticket.create({
    data: {
      title: "Add CSV export to reports page",
      description: "Support exporting the filtered report table to CSV.",
      priority: "LOW",
      status: "OPEN",
      createdById: alice.id,
      assignedToId: null,
    },
  });

  await prisma.comment.create({
    data: {
      ticketId: loginTicket.id,
      message: "Reproduced on staging. Looks like a caching issue on the auth token.",
      createdById: alice.id,
    },
  });

  await prisma.platformConfig.create({
    data: { id: 1, deploymentMode: "HYBRID", adSlotEveryN: 4 },
  });

  const groupA = await prisma.entitlementGroup.create({
    data: { code: "GROUP_A", name: "Group A — flagship micro-dramas" },
  });
  const groupB = await prisma.entitlementGroup.create({
    data: { code: "GROUP_B", name: "Group B — mid-tier micro-dramas" },
  });

  await prisma.subscriptionPack.createMany({
    data: [
      {
        code: "PACK_1",
        name: "All Access VIP",
        billingCycle: "WEEKLY",
        description: "VOD + all micro-drama series",
        priceCents: 299,
        coversVod: true,
        coversAllMd: true,
      },
      {
        code: "PACK_1",
        name: "All Access VIP",
        billingCycle: "ANNUAL",
        description: "VOD + all micro-drama series",
        priceCents: 9999,
        coversVod: true,
        coversAllMd: true,
      },
      {
        code: "PACK_2",
        name: "Micro Drama VIP",
        billingCycle: "WEEKLY",
        description: "Micro-drama access by entitlement group",
        priceCents: 199,
        coversVod: false,
        coversAllMd: false,
      },
      {
        code: "PACK_2",
        name: "Micro Drama VIP",
        billingCycle: "ANNUAL",
        description: "Micro-drama access by entitlement group",
        priceCents: 6999,
        coversVod: false,
        coversAllMd: false,
      },
      {
        code: "PACK_3",
        name: "VideoReady VIP",
        billingCycle: "WEEKLY",
        description: "Standard VOD content only",
        priceCents: 149,
        coversVod: true,
        coversAllMd: false,
      },
      {
        code: "PACK_3",
        name: "VideoReady VIP",
        billingCycle: "ANNUAL",
        description: "Standard VOD content only",
        priceCents: 4999,
        coversVod: true,
        coversAllMd: false,
      },
    ],
  });

  await prisma.packGroupAccess.createMany({
    data: [
      { packCode: "PACK_2", entitlementGroupId: groupA.id },
      { packCode: "PACK_2", entitlementGroupId: groupB.id },
    ],
  });

  const start = new Date("2026-01-01T00:00:00.000Z");
  const unpublishedStart = new Date("2027-01-01T00:00:00.000Z");

  const midnight = await createSeries({
    title: "Midnight Alley",
    synopsis: "A street magician falls for a detective hunting the same ghost.",
    posterUrl: posters.midnight,
    contentType: "MICRO_DRAMA",
    category: "Romance",
    freeEpisodeThreshold: 3,
    startDate: start,
    entitlementGroupId: groupA.id,
    episodes: romanceEpisodes("Midnight Alley"),
  });

  const contract = await createSeries({
    title: "The Last Contract",
    synopsis: "A fixer has one week to erase a life she used to protect.",
    posterUrl: posters.contract,
    contentType: "MICRO_DRAMA",
    category: "Thriller",
    freeEpisodeThreshold: 2,
    startDate: start,
    entitlementGroupId: groupA.id,
    episodes: thrillerEpisodes(),
  });

  const office = await createSeries({
    title: "Office Secrets",
    synopsis: "Two rivals share a desk, a secret, and a promotion.",
    posterUrl: posters.office,
    contentType: "MICRO_DRAMA",
    category: "Romance",
    freeEpisodeThreshold: 5,
    startDate: start,
    entitlementGroupId: groupB.id,
    episodes: officeEpisodes(),
  });

  await createSeries({
    title: "Coming Soon: Neon Harbor",
    synopsis: "A scheduled series that must stay hidden until its start date.",
    posterUrl: posters.midnight,
    contentType: "MICRO_DRAMA",
    category: "Thriller",
    freeEpisodeThreshold: 1,
    startDate: unpublishedStart,
    entitlementGroupId: groupB.id,
    episodes: [{ title: "Pilot", synopsis: "Not yet released.", cliffhanger: false, video: VIDEOS.a }],
  });

  const ocean = await createSeries({
    title: "Ocean Worlds",
    synopsis: "A nature documentary following a year under the Pacific.",
    posterUrl: posters.ocean,
    contentType: "VOD",
    category: "Documentary",
    freeEpisodeThreshold: 1,
    startDate: start,
    entitlementGroupId: null,
    episodes: [
      { title: "Surface", synopsis: "Light and plankton.", cliffhanger: false, video: VIDEOS.g },
      { title: "The Drop", synopsis: "Into the midnight zone.", cliffhanger: false, video: VIDEOS.a },
    ],
  });

  const classic = await createSeries({
    title: "Classic Cinema Hour",
    synopsis: "Restored shorts from the studio vault.",
    posterUrl: posters.classic,
    contentType: "VOD",
    category: "Drama",
    freeEpisodeThreshold: 0,
    startDate: start,
    entitlementGroupId: null,
    episodes: [
      { title: "The Gate", synopsis: "A silent-era restoration.", cliffhanger: false, video: VIDEOS.h },
    ],
  });

  const mdContinue = await prisma.rail.create({
    data: { experience: "MD", title: "Continue Watching", type: "CONTINUE_WATCHING", sortOrder: 0 },
  });
  const mdTrending = await prisma.rail.create({
    data: { experience: "MD", title: "Trending Micro Dramas", type: "EDITORIAL", sortOrder: 1 },
  });
  const mdRomance = await prisma.rail.create({
    data: {
      experience: "MD",
      title: "Romance",
      type: "CATEGORY",
      category: "Romance",
      sortOrder: 2,
    },
  });
  const mdThriller = await prisma.rail.create({
    data: {
      experience: "MD",
      title: "Thriller",
      type: "CATEGORY",
      category: "Thriller",
      sortOrder: 3,
    },
  });

  await prisma.railItem.createMany({
    data: [
      { railId: mdTrending.id, seriesId: midnight.id, sortOrder: 0 },
      { railId: mdTrending.id, seriesId: contract.id, sortOrder: 1 },
      { railId: mdTrending.id, seriesId: office.id, sortOrder: 2 },
      { railId: mdRomance.id, seriesId: midnight.id, sortOrder: 0 },
      { railId: mdRomance.id, seriesId: office.id, sortOrder: 1 },
      { railId: mdThriller.id, seriesId: contract.id, sortOrder: 0 },
    ],
  });

  const vrContinue = await prisma.rail.create({
    data: { experience: "VR", title: "Continue Watching", type: "CONTINUE_WATCHING", sortOrder: 0 },
  });
  const vrDocs = await prisma.rail.create({
    data: {
      experience: "VR",
      title: "Documentaries",
      type: "CATEGORY",
      category: "Documentary",
      sortOrder: 1,
    },
  });
  const vrDrama = await prisma.rail.create({
    data: { experience: "VR", title: "Drama", type: "CATEGORY", category: "Drama", sortOrder: 2 },
  });

  await prisma.railItem.createMany({
    data: [
      { railId: vrDocs.id, seriesId: ocean.id, sortOrder: 0 },
      { railId: vrDrama.id, seriesId: classic.id, sortOrder: 0 },
    ],
  });

  void mdContinue;
  void vrContinue;

  const priya = await prisma.account.create({
    data: {
      email: "priya@example.com",
      name: "Priya Shah",
      passwordHash: hashPassword("password123"),
      profiles: {
        create: [
          { name: "Priya", type: "REGULAR" },
          { name: "Kids", type: "KIDS" },
        ],
      },
    },
  });

  const arjun = await prisma.account.create({
    data: {
      email: "arjun@example.com",
      name: "Arjun Mehta",
      passwordHash: hashPassword("password123"),
      profiles: { create: { name: "Arjun", type: "REGULAR" } },
    },
  });

  const meera = await prisma.account.create({
    data: {
      email: "meera@example.com",
      name: "Meera Kapoor",
      passwordHash: hashPassword("password123"),
      profiles: { create: { name: "Meera", type: "REGULAR" } },
    },
  });

  const yearFromNow = new Date();
  yearFromNow.setFullYear(yearFromNow.getFullYear() + 1);
  const weekFromNow = new Date();
  weekFromNow.setDate(weekFromNow.getDate() + 7);

  await prisma.userSubscription.create({
    data: {
      accountId: priya.id,
      packCode: "PACK_1",
      billingCycle: "ANNUAL",
      autoRenew: true,
      status: "ACTIVE",
      purchaseChannel: "WEB",
      expiresAt: yearFromNow,
    },
  });

  await prisma.userSubscription.create({
    data: {
      accountId: meera.id,
      packCode: "PACK_2",
      billingCycle: "WEEKLY",
      autoRenew: true,
      status: "ACTIVE",
      purchaseChannel: "WEB",
      entitlementGroupId: groupA.id,
      expiresAt: weekFromNow,
    },
  });

  const midnightEp1 = await prisma.episode.findFirstOrThrow({
    where: { title: "Midnight Alley 1" },
  });
  const contractEp1 = await prisma.episode.findFirstOrThrow({
    where: { title: "Hour 1" },
  });
  await prisma.watchProgress.createMany({
    data: [
      {
        accountId: priya.id,
        seriesId: midnight.id,
        episodeId: midnightEp1.id,
        positionSeconds: 2,
        durationSeconds: 5,
        completed: false,
      },
      {
        accountId: priya.id,
        seriesId: contract.id,
        episodeId: contractEp1.id,
        positionSeconds: 1,
        durationSeconds: 5,
        completed: false,
      },
    ],
  });

  console.log(
    "Seed complete: tickets plus playable Micro Drama catalog. Demo logins: priya@example.com / arjun@example.com / meera@example.com (password123).",
  );
}

async function createSeries(input: {
  title: string;
  synopsis: string;
  posterUrl: string;
  contentType: "MICRO_DRAMA" | "VOD";
  category: string;
  freeEpisodeThreshold: number;
  startDate: Date;
  entitlementGroupId: number | null;
  episodes: { title: string; synopsis: string; cliffhanger: boolean; video: string }[];
}) {
  return prisma.series.create({
    data: {
      title: input.title,
      synopsis: input.synopsis,
      posterUrl: input.posterUrl,
      contentType: input.contentType,
      category: input.category,
      freeEpisodeThreshold: input.freeEpisodeThreshold,
      startDate: input.startDate,
      entitlementGroupId: input.entitlementGroupId,
      seasons: {
        create: {
          number: 1,
          title: "Season 1",
          episodes: {
            create: input.episodes.map((ep, i) => ({
              number: i + 1,
              title: ep.title,
              synopsis: ep.synopsis,
              durationSeconds: 5,
              isCliffhanger: ep.cliffhanger,
              videoUrl: ep.video,
              videoUrlLow: ep.video,
              videoUrlHigh: ep.video,
              posterUrl: input.posterUrl,
            })),
          },
        },
      },
    },
  });
}

function romanceEpisodes(prefix: string) {
  return [
    { title: `${prefix} 1`, synopsis: "A chance meeting in the rain.", cliffhanger: false, video: VIDEOS.a },
    { title: `${prefix} 2`, synopsis: "The alley remembers names.", cliffhanger: false, video: VIDEOS.b },
    { title: `${prefix} 3`, synopsis: "A kiss, then a warning.", cliffhanger: true, video: VIDEOS.c },
    { title: `${prefix} 4`, synopsis: "The detective's case file.", cliffhanger: false, video: VIDEOS.d },
    { title: `${prefix} 5`, synopsis: "Magic that costs blood.", cliffhanger: false, video: VIDEOS.e },
    { title: `${prefix} 6`, synopsis: "The ghost chooses a side.", cliffhanger: false, video: VIDEOS.f },
    { title: `${prefix} 7`, synopsis: "A deal in neon light.", cliffhanger: false, video: VIDEOS.a },
    { title: `${prefix} 8`, synopsis: "The last trick.", cliffhanger: false, video: VIDEOS.b },
  ];
}

function thrillerEpisodes() {
  return [
    { title: "Hour 1", synopsis: "The contract arrives.", cliffhanger: false, video: VIDEOS.c },
    { title: "Hour 2", synopsis: "A face from the old life.", cliffhanger: true, video: VIDEOS.d },
    { title: "Hour 3", synopsis: "The safe house burns.", cliffhanger: false, video: VIDEOS.e },
    { title: "Hour 4", synopsis: "Who wrote the name?", cliffhanger: false, video: VIDEOS.f },
    { title: "Hour 5", synopsis: "One hour left.", cliffhanger: false, video: VIDEOS.a },
    { title: "Hour 6", synopsis: "The last contract.", cliffhanger: false, video: VIDEOS.b },
  ];
}

function officeEpisodes() {
  return [
    { title: "Monday", synopsis: "Shared desk, shared silence.", cliffhanger: false, video: VIDEOS.e },
    { title: "Tuesday", synopsis: "The missing slide deck.", cliffhanger: false, video: VIDEOS.f },
    { title: "Wednesday", synopsis: "Late night, one elevator.", cliffhanger: false, video: VIDEOS.a },
    { title: "Thursday", synopsis: "A rumor in HR.", cliffhanger: false, video: VIDEOS.b },
    { title: "Friday", synopsis: "The promotion list leaks.", cliffhanger: true, video: VIDEOS.c },
    { title: "Monday again", synopsis: "Choose a side.", cliffhanger: false, video: VIDEOS.d },
  ];
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
