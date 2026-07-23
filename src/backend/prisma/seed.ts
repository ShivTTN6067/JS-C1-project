import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Seeds the database with sample users, tickets, and comments.
 * Safe to run repeatedly: it clears existing rows first so the seed
 * data is deterministic.
 */
async function main() {
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

  console.log("Seed complete: 3 users, 3 tickets, 1 comment.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
