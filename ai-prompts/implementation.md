# AI Prompts — Implementation

---

## I1 — Scaffold backend and frontend

**Prompt (summary):** "Scaffold a TypeScript Express backend (Prisma + Zod) and a
React + Vite + Tailwind frontend with the config files, matching the agreed
repository structure."

**AI response (summary):** Generated `package.json`, `tsconfig`, Vite/Tailwind/
PostCSS config, `.env.example`, and `.gitignore` for both packages.

**Accepted:** the scaffolding.
**Changed:** pinned dependency versions and added scripts (`db:seed`, `db:reset`,
`test`).
**Rejected:** committing a real `.env` — only `.env.example` is tracked.

---

## I2 — API routes and validation

**Prompt (summary):** "Implement the tickets router: list (with search + status
filter), create, detail (with comments + allowedNextStatuses), update, status
transition, and add comment. Use the Zod schemas and throw the typed errors."

**AI response (summary):** Produced the route handlers wired to Prisma and the
state machine, returning consistent JSON.

**Accepted:** the handlers.
**Changed:** added `assertUserExists` so bad `createdById`/`assignedToId` return a
clear `400` instead of a raw FK/500 (also raised in review).
**Result:** `src/backend/src/routes/tickets.ts`, `.../users.ts`,
`.../validation/schemas.ts`.

---

## I3 — Frontend pages and API client

**Prompt (summary):** "Build a modern list page (search + status chips), a
validated create form, and a detail page (inline edit, comments, status buttons
from allowedNextStatuses). Add a typed fetch client and shared loading/empty/error
components."

**AI response (summary):** Generated the three pages, `api/client.ts` with a typed
`ApiError`, badges, and state components using Tailwind.

**Accepted:** the components.
**Changed:** debounced the list search; ensured the detail page shows a terminal
message when there are no allowed transitions; added an `.input` component class.
**Result:** `src/frontend/src/pages/*`, `.../api/client.ts`, `.../components/*`.

---

## I4 — Seed data

**Prompt (summary):** "Write a deterministic Prisma seed with a few users,
tickets across different statuses/priorities, and a comment."

**AI response (summary):** A seed that clears and repopulates 3 users, 3 tickets,
1 comment.

**Accepted:** as generated.
**Changed:** used synthetic `example.com` data only (no real data).
**Result:** `src/backend/prisma/seed.ts` (+ `database/seed-data.json` mirror).
