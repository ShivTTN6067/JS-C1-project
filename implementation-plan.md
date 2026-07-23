# Implementation Plan

## Overview

Deliver the Core Support Ticket Management System as two npm packages under
`src/` (backend API, frontend app) plus a shared `tests/` directory and the
lifecycle documentation. Build bottom-up: model and domain rules first, then the
API, then the UI, with tests written alongside the code they cover.

## Task Breakdown

1. **Scaffold** — backend (Express + TS + Prisma + Zod) and frontend
   (React + Vite + TS + Tailwind) packages, tsconfig, `.env.example`, `.gitignore`.
2. **Data model** — Prisma schema for `User`, `Ticket`, `Comment` on SQLite;
   initial migration; deterministic seed script; mirror schema/seed into `database/`.
3. **State machine** — `statusMachine.ts` as the single source of truth for
   allowed transitions and terminal states.
4. **API** — routes for users and tickets (list/search/filter, create, detail,
   update, status transition, comment), Zod validation, centralized error handler.
5. **Frontend** — list page (search + status filter), create page (validated
   form), detail page (view/edit/reassign, status transitions, comments), with
   loading/empty/error states and a modern Tailwind UI.
6. **Tests** — unit tests for the state machine, integration tests for the API
   (including invalid-transition rejection), one frontend component test.
7. **Run & verify** — install, migrate, seed, run both test suites, boot both
   servers, and smoke-test the full flow.
8. **Documentation** — author the required lifecycle artifacts.

## Milestones

- **M1 – Foundation:** scaffolding + data model + migration + seed run.
- **M2 – Domain + API:** state machine and all endpoints working against SQLite.
- **M3 – UI:** all three pages functional and styled, wired to the API.
- **M4 – Verified:** all tests green, servers boot, smoke test passes.
- **M5 – Documented:** all Markdown artifacts complete.

## AI Usage Plan

- Use Cursor to generate boilerplate (config, Prisma schema, route handlers,
  React components) from a written spec, then review and adjust each output.
- Use AI to enumerate state-machine edge cases and draft the exhaustive test
  matrix, then verify the transitions against the brief by hand.
- Use AI for debugging environment/tooling issues (e.g. test-runner interop) and
  validate each suggested fix by re-running the suite.
- Keep prompt history grouped by activity under `ai-prompts/`.

## Risks

- **State-machine correctness** — the highest-value, highest-judgment area; a
  subtle mistake would let invalid data through.
- **Tooling interop** — ESM/TS + test runner + Prisma can produce non-obvious
  resolution errors.
- **Scope creep** — over-building the app at the expense of the artifacts.
- **Secret/data leakage** — committing `.env` or the SQLite binary.

## Mitigation

- Centralize transitions in one module and cover them with an exhaustive unit
  test plus end-to-end integration tests.
- Prefer a real ephemeral server + `fetch` for integration tests to sidestep
  fragile HTTP-client interop (see `debugging-notes.md`).
- Keep the app to the Core feature list; invest remaining effort in docs/tests.
- Gitignore `.env` and `data/*.db`; commit only `.env.example`.
