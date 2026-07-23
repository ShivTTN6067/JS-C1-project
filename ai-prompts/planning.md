# AI Prompts — Planning

Grouped prompt history for planning. Each entry records the prompt (or summary),
the AI response summary, and what I accepted / changed / rejected.

---

## P1 — Restate and break down the brief

**Prompt (summary):** "Here is the assessment brief for a Support Ticket
Management System (Core). Restate the problem, extract functional and
non-functional requirements, list assumptions and edge cases, and highlight the
riskiest part."

**AI response (summary):** Identified the status state machine as the signature
piece; produced a functional/non-functional list, assumptions (seeded users, no
auth), and edge cases (invalid transitions, terminal states, dangling FKs).

**Accepted:** the requirement/edge-case structure.
**Changed:** tightened assumptions and added clarification questions in my own
words.
**Rejected:** nothing significant.
**Result:** `requirements-analysis.md`.

---

## P2 — Choose a build order and milestones

**Prompt (summary):** "Given TypeScript everywhere (React+Vite, Express, SQLite
via Prisma) and Core scope, propose a build order, milestones, risks, and
mitigations. Keep the app small; the artifacts matter more."

**AI response (summary):** Bottom-up order (model -> domain -> API -> UI -> tests
-> docs), M1–M5 milestones, and risks (state-machine correctness, tooling interop,
scope creep, secret leakage) with mitigations.

**Accepted:** the ordering and milestones.
**Changed:** made "invest in artifacts, not app surface" an explicit constraint.
**Rejected:** an early suggestion to add auth and Docker (out of Core scope).
**Result:** `implementation-plan.md`.

---

## P3 — Confirm repository structure

**Prompt (summary):** "Map the brief's required repository structure onto this
repo. Where should the Prisma schema and the `database/` folder live?"

**AI response (summary):** Recommended `src/backend` + `src/frontend`, top-level
`tests/`, Prisma in `src/backend/prisma`, and mirroring schema/seed into
`database/` with `setup-notes.md`.

**Accepted:** the layout.
**Changed:** decided the Prisma migrations remain authoritative and `database/`
holds human-readable mirrors, documented in `setup-notes.md`.
