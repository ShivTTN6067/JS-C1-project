# Project Context (Cursor)

Persistent context provided to Cursor so it works from a stable understanding of
the project rather than re-deriving it each session.

## What this project is

A Core-scope Support Ticket Management System built for the JS AI Capability
Exercise. Small application surface; the lifecycle artifacts are the focus.

## Stack

- Frontend: React 18 + Vite + TypeScript + Tailwind CSS, React Router.
- Backend: Node + Express + TypeScript (ESM), Zod validation.
- Database: SQLite via Prisma ORM.
- Tests: Vitest (+ React Testing Library on the frontend).

## Repository map

- `src/backend/` — Express app, routes, domain, validation, Prisma.
- `src/frontend/` — React app (pages, components, api client).
- `tests/` — backend unit + integration tests and Vitest global setup.
- `database/` — schema mirror, seed snapshot, setup notes.
- Root `*.md`, `ai-prompts/`, `tool-specific/` — lifecycle artifacts.

## Non-negotiables (rules)

1. The backend is the single authority for status transitions; the frontend only
   renders `allowedNextStatuses` returned by the API. Never duplicate the rules
   client-side.
2. All status changes go through `PATCH /api/tickets/:id/status`; the generic
   update endpoint must not change status.
3. Validate all input with Zod; return the consistent
   `{ error: { message, details? } }` envelope.
4. No secrets in the repo. `.env` and `data/*.db` are gitignored; only
   `.env.example` and schema/seed mirrors are committed.
5. Keep changes minimal and within Core scope; record decisions in the artifacts.

## Key contracts

- API: `api-contract.md`
- Data model + state machine: `data-model.md`
- UI flow: `ui-flow.md`

## Current status

Feature-complete for Core; 18 backend tests + 3 frontend tests passing; both
packages type-check and build; API and frontend proxy smoke-tested.
