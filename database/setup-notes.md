# Database Setup Notes

## Choice

SQLite via Prisma ORM. SQLite was chosen because it is zero-configuration,
file-based (data persists across restarts with no external service), and fully
supported by Prisma for migrations, seeding, and local development. This keeps
the reviewer's setup to a single `npm install` plus a migrate + seed step.

## Where things live

- Prisma schema (authoritative): `src/backend/prisma/schema.prisma`
- Migrations (authoritative): `src/backend/prisma/migrations/`
- Seed script (authoritative): `src/backend/prisma/seed.ts`
- Human-readable schema mirror: `database/schema.sql`
- Human-readable seed snapshot: `database/seed-data.json`

The application always runs against the Prisma migrations. The files in
`database/` are convenience mirrors for review.

## Environment variables

Copy `src/backend/.env.example` to `src/backend/.env`:

```
DATABASE_URL="file:../data/dev.db"   # path is relative to the prisma/ directory
PORT=4000
CORS_ORIGIN="http://localhost:5173"
```

The real `.env` and the generated `data/*.db` files are gitignored, so no
secrets or database binaries are committed.

## First-time setup

From `src/backend/`:

```bash
npm install
cp .env.example .env
npx prisma migrate dev      # applies migrations and runs the seed
```

`prisma migrate dev` creates `data/dev.db`, applies the `init` migration, and
automatically runs the seed (configured via the `prisma.seed` field in
`package.json`).

## Re-seeding / resetting

```bash
npm run db:seed     # re-run the seed (it clears + repopulates deterministically)
npm run db:reset    # drop, re-migrate, and re-seed from scratch
```

## Persistence check

Data survives a restart because it is stored in the `data/dev.db` file. Stop the
API server, start it again, and previously created tickets are still returned by
`GET /api/tickets`.

## Schema summary

- `User` (seeded only): `id`, `name`, `email` (unique), `role`.
- `Ticket`: `id`, `title`, `description`, `priority`, `status`, `createdById`,
  `assignedToId` (nullable), `createdAt`, `updatedAt`. Indexed on `status`.
- `Comment`: `id`, `ticketId`, `message`, `createdById`, `createdAt`. Indexed on
  `ticketId`; deleted automatically when its ticket is deleted (cascade).

`priority` and `status` are stored as strings because SQLite has no native enum
type; valid values are enforced in the application layer
(`src/backend/src/domain/statusMachine.ts` and
`src/backend/src/validation/schemas.ts`).

## Test database

Integration tests use a separate `data/test.db`, provisioned automatically by
`tests/globalSetup.ts` via `prisma db push --force-reset`, so tests never touch
development data.
