# Tasks (Cursor)

Task list Cursor worked through, with status. Mirrors `implementation-plan.md`.

- [x] Scaffold backend (Express + TS + Prisma + Zod) and frontend
      (React + Vite + TS + Tailwind) with configs, `.env.example`, `.gitignore`.
- [x] Define Prisma schema (User/Ticket/Comment) on SQLite; create initial
      migration; write deterministic seed; mirror schema/seed into `database/`.
- [x] Implement the status state machine as the single source of truth.
- [x] Implement Express routes (users; tickets: list/search/filter, create,
      detail, update, status transition, comment) with Zod validation and
      centralized error handling.
- [x] Build the React UI: list (search + status filter), create form, detail
      (edit/reassign, status transitions, comments), with loading/empty/error
      states.
- [x] Write tests: state-machine unit, API integration (incl. invalid-transition
      rejection), and one frontend component test.
- [x] Install deps, run migrate + seed, run both test suites, boot both servers,
      and smoke-test the flows.
- [x] Author lifecycle documentation (root `*.md`, `ai-prompts/`,
      `tool-specific/cursor-workflow/`); leave personal files as templates.

## Traceability

Each task maps to acceptance criteria in `acceptance-criteria.md` and to code
under `src/` and `tests/`. Deviations from the initial plan (dropping supertest,
scoping the backend tsconfig) are recorded in `debugging-notes.md` and
`review-fixes.md`.
