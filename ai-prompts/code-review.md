# AI Prompts — Code Review

Review outcomes are summarized in `code-review-notes.md`; fixes are tracked in
`review-fixes.md`. This file records the review prompts.

---

## CR1 — Full review pass

**Prompt (summary):** "Review the backend and frontend diff for correctness,
security, and consistency. Focus on the state machine, validation, error
handling, and any secret/injection risks."

**AI response (summary):**
- Confirmed the state machine is the single source of truth and the frontend
  doesn't duplicate rules.
- Flagged that bad `createdById`/`assignedToId` would surface as a generic 500.
- Confirmed the consistent error envelope and async error handling.
- Confirmed no secrets in code, `.env` gitignored, Prisma parameterizes queries,
  CORS restricted to the configured origin.

**Accepted:** the FK-handling fix (return `400` with a clear message) and the
confirmations.
**Changed:** added `assertUserExists` checks; verified `.gitignore` excludes
`.env` and `data/*.db`.

---

## CR2 — Scope/architecture suggestions

**Prompt (summary):** "Any structural improvements worth making now?"

**AI response (summary):** Suggested React Query and a service layer between
routes and Prisma.

**Rejected (with reason):** both are scope creep for a three-page Core app; routes
are thin and local state is sufficient. Recorded as future improvements in
`pr-description.md`.
