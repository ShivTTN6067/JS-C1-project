# AI Prompts — Documentation

---

## DOC1 — README and setup

**Prompt (summary):** "Write a README with the stack, repository layout, and
step-by-step setup for backend, frontend, and tests, plus the state-machine
summary and security notes."

**AI response (summary):** Generated the README structure and setup commands.

**Accepted:** as generated.
**Changed:** verified every command against the actual scripts and confirmed the
seed runs via `prisma migrate dev`.
**Result:** `README.md`.

---

## DOC2 — Lifecycle artifacts

**Prompt (summary):** "Draft the required artifacts from the actual code and test
results: api-contract, data-model (with diagrams), ui-flow, design-notes,
test-strategy, test-results, debugging-notes, code-review-notes, review-fixes,
pr-description, tool-workflow."

**AI response (summary):** Produced drafts for each, including Mermaid ER/state/
architecture diagrams.

**Accepted:** the structure and diagrams.
**Changed:** made every doc reflect the real endpoints, schema, and recorded test
output; ensured cross-links between docs are accurate.
**Result:** the corresponding root-level `.md` files.

---

## DOC3 — Database setup notes

**Prompt (summary):** "Document the database choice, where the schema/migrations/
seed live, env vars, first-time setup, reset, and the persistence check."

**AI response (summary):** Produced `database/setup-notes.md` plus a plain-SQL
schema mirror and a seed snapshot.

**Accepted:** as generated.
**Changed:** clarified that Prisma migrations are authoritative and the
`database/` files are review mirrors.

---

## DOC4 — Personal templates

**Prompt (summary):** "Leave `candidate-info.md`, `reflection.md`, and
`final-ai-usage-summary.md` as templates with prompts and evidence pointers for me
to complete."

**AI response (summary):** Generated templated files with guidance notes.

**Accepted:** as templates (to be filled in by the candidate).
