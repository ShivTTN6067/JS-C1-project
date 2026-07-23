# AI Prompts — Design

---

## D1 — Layering and error envelope

**Prompt (summary):** "Propose a backend layering for the API and a consistent
error-handling approach. I want one JSON error shape and the state machine kept
out of the HTTP layer."

**AI response (summary):** Suggested routes -> Zod validation -> domain
(`statusMachine`) -> Prisma, with a typed error hierarchy (`AppError`,
`NotFoundError`, `ValidationError`, `InvalidTransitionError`) mapped by a single
error middleware to `{ error: { message, details? } }`.

**Accepted:** the layering and error envelope.
**Changed:** added an `asyncHandler` wrapper so async route rejections reach the
middleware.
**Result:** `design-notes.md`, `src/backend/src/lib/errors.ts`,
`src/backend/src/middleware/errorHandler.ts`.

---

## D2 — State machine as single source of truth

**Prompt (summary):** "Design the status state machine so the rules live in one
place and the frontend can't offer illegal transitions."

**AI response (summary):** A transition table keyed by status with
`canTransition`, `allowedNextStatuses`, and validators; the API returns
`allowedNextStatuses` so the UI renders only legal options.

**Accepted:** the module design.
**Changed:** made `PATCH /:id` exclude status entirely, forcing all status
changes through `/:id/status` so the machine can't be bypassed.
**Result:** `src/backend/src/domain/statusMachine.ts`.

---

## D3 — Database choice and schema

**Prompt (summary):** "Design the Prisma schema for User/Ticket/Comment on
SQLite. How do I handle enums?"

**AI response (summary):** SQLite has no native enums -> store `priority`/`status`
as strings and validate in the app layer; add FK relations with sensible delete
behavior and index `status`.

**Accepted:** the schema and index.
**Changed:** set `assignedTo` to `SET NULL`, `createdBy` to `RESTRICT`, comments
to `CASCADE`; documented the rationale.
**Result:** `data-model.md`, `src/backend/prisma/schema.prisma`.
