# PR Description

## Summary

Implements the Core Support Ticket Management System: a React + TypeScript
frontend, an Express + TypeScript REST API, and a SQLite database (Prisma). The
centerpiece is an enforced status state machine that the backend validates and
the frontend renders from. Includes seed data, input validation, consistent error
handling, keyword search + status filter, and a test suite (state-machine unit
tests + API integration tests + one frontend component test).

## Features Implemented

- Create, list, view, and update tickets (title, description, priority, assignee).
- Add comments to tickets.
- Keyword search (title/description) and filter by status.
- Enforced status transitions: OPEN -> IN_PROGRESS/CANCELLED,
  IN_PROGRESS -> RESOLVED/CANCELLED, RESOLVED -> CLOSED; CLOSED/CANCELLED terminal.
- Backend validation (Zod) with a consistent JSON error envelope.
- Loading / empty / error states throughout the UI.

## Technical Changes

- **Backend:** Express app (`createApp()` split from the server bootstrap),
  `users` + `tickets` routers, `asyncHandler`, centralized error middleware, typed
  error hierarchy, and the `statusMachine` domain module as the single source of
  truth for transitions.
- **Frontend:** React Router with three pages, a typed `fetch` API client, shared
  state components, and color-coded status/priority badges (Tailwind).
- **Tooling:** Vitest for both packages; Prisma migrations + seed.

## Database Changes

- New SQLite schema via Prisma: `User`, `Ticket`, `Comment` (see `data-model.md`).
- Initial migration under `src/backend/prisma/migrations/` and a plain-SQL mirror
  at `database/schema.sql`.
- Deterministic seed (`prisma/seed.ts`): 3 users, 3 tickets, 1 comment.
- `Ticket.status` indexed for filtering; comments cascade-delete with their ticket.

## Testing Done

- 18 backend tests (5 state-machine unit, 13 API integration) — all passing.
- 3 frontend component tests — all passing.
- Type-check (`tsc`) clean for both packages; frontend production build succeeds.
- Manual API + frontend-proxy smoke test (see `test-results.md`).

## AI Usage Summary

Cursor was used across the lifecycle: requirement analysis, planning, code
generation from a written spec, test authoring (including the exhaustive
transition matrix), debugging tooling issues, and review. Every AI suggestion was
reviewed and validated by running the tests and smoke tests; see `tool-workflow.md`
and `ai-prompts/`.

## Screenshots / Demo Notes

Run both dev servers (`README.md`) and open http://localhost:5173:
image.png
- Ticket list with search + status chips.
- Create form with validation.
- Detail page: inline edit, comments, and status buttons that reflect only the
  legal next transitions.

## Known Limitations

- No authentication (optional Stretch); the acting user is chosen from a dropdown.
- No pagination/sorting; filter is by status only (priority/assignee filters are
  Stretch).
- Frontend automated tests cover the list page; create/detail are smoke-tested
  manually.

## Future Improvements

- Add auth + protected routes and derive the current user from the session.
- Add priority/assignee filters, sorting, and pagination.
- Add detail-page component tests and browser-level E2E tests.
- Add OpenAPI/Swagger docs and a CI workflow.
