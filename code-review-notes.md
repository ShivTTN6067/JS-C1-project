# Code Review Notes

## AI-Assisted Review Summary

After the feature code was working and tests were green, I asked the AI to review
the diff for correctness, security, and consistency, focusing on the state
machine, validation, and error handling. Key points raised:

1. **State machine as single source of truth.** Confirmed the frontend derives
   transition options only from the backend's `allowedNextStatuses`, so business
   rules are not duplicated client-side. Good — kept.
2. **Foreign-key errors leaking to clients.** Original create/update relied on
   Prisma to fail on bad `createdById`/`assignedToId`, which would surface as a
   generic 500. Recommendation: pre-check user existence and return a `400` with
   a clear message. Applied.
3. **Consistent error envelope.** Verified every path (Zod, AppError, unexpected)
   funnels through one middleware and returns the same `{ error: { message } }`
   shape. Good.
4. **Async error handling.** Confirmed all async routes are wrapped so rejected
   promises reach the error middleware rather than hanging the request.
5. **Terminal-state handling.** Checked that CLOSED/CANCELLED expose an empty
   `allowedNextStatuses`, so the UI shows a terminal message and offers no
   buttons; the backend also rejects any attempt.
6. **Security defaults.** No secrets in code; `.env` gitignored; Prisma
   parameterizes queries (no raw SQL / injection surface); CORS restricted to the
   configured origin.

## My Review Observations

- The `PATCH /tickets/:id` update intentionally excludes `status`; status changes
  go through the dedicated `/status` endpoint so the state machine can't be
  bypassed by a plain field update. This separation is deliberate and worth
  keeping.
- Search uses `contains` without a Prisma `mode` because SQLite's `LIKE` is
  already case-insensitive for ASCII; noted so a future move to Postgres adds
  `mode: 'insensitive'`.
- Ticket ids from the URL are parsed and integer-checked before hitting the DB.

## Changes Made After Review

- Added explicit `assertUserExists` checks in create/update/comment paths,
  returning a `400 ValidationError` instead of a raw FK/500.
- Ensured `updateTicketSchema` rejects an empty body ("at least one field").
- Confirmed `.gitignore` excludes `.env` and `data/*.db`; only `.env.example`
  and the schema/seed mirrors are committed.

## Suggestions Rejected (and why)

- **Add a data-fetching library (React Query) now.** Rejected for Core: the app
  has three pages and simple local state is sufficient; adding it would be scope
  creep. Noted as a future improvement instead.
- **Introduce a service layer between routes and Prisma.** Rejected at this size;
  routes are thin and readable. Would revisit if the domain grew.
- **Store status/priority as integers/coded enums.** Rejected; strings are
  readable in the DB and validity is already enforced centrally. SQLite lacks
  native enums anyway.
