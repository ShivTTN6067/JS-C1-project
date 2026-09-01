# Support Ticket Management System

A small full-stack application for managing internal support tickets. Users can
create, view, update, comment on, search, and progress tickets through an
enforced status lifecycle (state machine).

Built for the JS AI Capability Exercise. The application surface is intentionally
small; the lifecycle artifacts (planning, design, testing, review, reflection)
are documented in the Markdown files at the repository root, in `ai-prompts/`,
and in `tool-specific/`.

## Tech Stack

| Layer     | Technology                                        |
| --------- | ------------------------------------------------- |
| Frontend  | React 18 + Vite + TypeScript + Tailwind CSS       |
| Backend   | Node.js + Express + TypeScript                     |
| Database  | SQLite via Prisma ORM                              |
| Validation| Zod                                                |
| Tests     | Vitest (backend integration + unit, frontend RTL)  |

## Repository Layout

```
README.md                     Project overview + setup (this file)
candidate-info.md             Candidate details (template)
tool-workflow.md              How AI was used across the lifecycle
requirements-analysis.md      Requirement breakdown
acceptance-criteria.md        Acceptance checklist
implementation-plan.md        Task breakdown, milestones, risks
design-notes.md               Architecture + design decisions
api-contract.md               Endpoint-by-endpoint API spec
data-model.md                 Entities, relationships, state machine
ui-flow.md                    Screens and user flows
test-strategy.md              What is tested and why
test-results.md               Recorded test + smoke-test results
debugging-notes.md            Issues hit and how they were fixed
code-review-notes.md          AI-assisted review summary
review-fixes.md               Fixes applied after review
pr-description.md             PR summary
reflection.md                 Personal reflection (template)
final-ai-usage-summary.md     Final AI usage summary (template)
src/backend/                  Express API + Prisma + tests helpers
src/frontend/                 React app
tests/                        Backend integration + unit tests
database/                     Schema mirror, seed snapshot, setup notes
ai-prompts/                   Prompt history grouped by activity
tool-specific/cursor-workflow/ Persistent project context for Cursor
```

## Prerequisites

- Node.js 18+ (developed on Node 22/25)
- npm 9+

## Setup & Run

The backend and frontend are separate npm packages. Open two terminals.

### 1. Backend API

```bash
cd src/backend
npm install
cp .env.example .env            # DATABASE_URL, PORT, CORS_ORIGIN
npx prisma migrate dev          # creates data/dev.db, applies migration, runs seed
npm run dev                     # http://localhost:4000
```

The seed runs automatically as part of `prisma migrate dev`. To re-seed later:

```bash
npm run db:seed
```

### 2. Frontend

```bash
cd src/frontend
npm install
npm run dev                     # http://localhost:5173
```

The Vite dev server proxies `/api/*` to `http://localhost:4000`, so no extra
configuration is needed in development.

Open http://localhost:5173 in your browser.

### 3. Profile photos

1. Click **Profiles** in the header.
2. Select a team member.
3. Upload a JPEG, PNG, or WebP image (max 2 MB).
4. Avatars appear on ticket lists, ticket details, and comments.

Uploaded files are stored under `src/backend/uploads/avatars/` (gitignored).

## Running Tests

Backend (state-machine unit tests + API integration tests):

```bash
cd src/backend
npm test
```

Frontend (component test):

```bash
cd src/frontend
npm test
```

End-to-end regression (Playwright — full app in the browser):

```bash
npm install
npx playwright install chromium
npm run test:e2e
```

See [`e2e/README.md`](e2e/README.md) for headed/UI mode and troubleshooting.

The backend tests use a separate `data/test.db` that is created and reset
automatically; they never touch development data.

## Key Features

- Create, list, view, and update tickets (title, description, priority, assignee).
- Add comments to a ticket.
- Upload profile photos for team members (`/users`).
- Keyword search (title/description) and filter by status.
- Enforced status state machine (invalid transitions rejected by the backend).
- Backend input validation (Zod) and consistent JSON error responses.
- Data persists in SQLite across restarts.

## Status State Machine

```
OPEN         -> IN_PROGRESS | CANCELLED
IN_PROGRESS  -> RESOLVED    | CANCELLED
RESOLVED     -> CLOSED
CLOSED       -> (terminal)
CANCELLED    -> (terminal)
```

The single source of truth is
[`src/backend/src/domain/statusMachine.ts`](src/backend/src/domain/statusMachine.ts).

## Security Notes

- No secrets are committed. `.env` and the generated SQLite files are gitignored;
  `.env.example` documents the required variables.
- All ticket/comment input is validated at the backend before persistence.
