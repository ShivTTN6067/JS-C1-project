# Tool Workflow

## 1. Primary AI tool used

Cursor (agent-based, repository-aware coding assistant), used across the full
development lifecycle for this project.

## 2. How I provide project context to the tool

- A written spec and persistent context live in `tool-specific/cursor-workflow/`
  (`project-context.md`, `spec.md`, `tasks.md`, `acceptance-criteria.md`,
  `cursor-rules-or-instructions.md`).
- I keep the requirement and design docs (`requirements-analysis.md`,
  `design-notes.md`, `api-contract.md`, `data-model.md`) in the repo so the tool
  can read the intended contracts rather than guessing.
- I reference specific files/folders directly when asking for changes so the tool
  edits the right place instead of re-deriving the structure.

## 3. How I use AI for requirement analysis

I gave the tool the assessment brief and asked it to restate the problem, extract
functional vs. non-functional requirements, list assumptions, and enumerate edge
cases (especially around the state machine). I then edited that output to reflect
my own understanding — the result is `requirements-analysis.md`.

## 4. How I use AI for planning and design

I asked for a build order (data model -> domain -> API -> UI -> tests -> docs),
a milestone breakdown, and a risk list with mitigations (`implementation-plan.md`).
For design, I had it propose the layering (routes / validation / domain / data)
and the error-handling envelope, then I chose the trade-offs recorded in
`design-notes.md` (SQLite, centralized state machine, no client-side rules).

## 5. How I use AI for code generation

I generated boilerplate and first drafts from the spec: Prisma schema, Zod
schemas, Express routes, the state-machine module, and the React pages/components.
I treated each generation as a draft to review, not a finished answer.

## 6. How I validate AI-generated code

- Ran the type-checker (`tsc`) and both test suites after each significant change.
- Ran a manual API smoke test with curl and verified the frontend proxy.
- Read the generated code for correctness on the parts that carry judgment (the
  transition table, validation rules, FK handling) rather than trusting it.
- Cross-checked the transition table against the brief by hand.

## 7. How I use AI for testing

I asked the tool to derive an exhaustive `(from, to)` transition matrix and to
propose integration cases for the mandatory tier, then reviewed them for gaps
(terminal-state transitions, unknown status values, dangling FKs). Strategy and
results are in `test-strategy.md` / `test-results.md`.

## 8. How I use AI for debugging

When the test runner failed to load the HTTP client and when `tsc`/`import.meta`
errors appeared, I asked the tool to explain the root cause and weigh fixes, then
validated the chosen fix by re-running the suite. Each issue is written up in
`debugging-notes.md`.

## 9. How I use AI for code review

After the code worked, I asked for a review focused on security, correctness, and
consistency. That surfaced the foreign-key-error leakage and confirmed the
single-source-of-truth design. See `code-review-notes.md` and `review-fixes.md`.

## 10. What information I avoid sharing unnecessarily with AI tools

- No secrets, credentials, tokens, or real `.env` contents (only `.env.example`
  with placeholder-style local values).
- No real customer/user data — seed data is synthetic (`example.com` addresses).
- No proprietary or unrelated internal code beyond what the task needs.

## 11. How I would reuse this workflow in a real project

- Keep a persistent `project-context.md` + spec + rules so the tool has stable
  context (as in `tool-specific/cursor-workflow/`).
- Always spec before generating, and treat generation as a reviewable draft.
- Gate acceptance on tests + type-checks running green, not on the code "looking
  right".
- Maintain grouped prompt history and debugging/review notes so decisions are
  traceable from requirement -> design -> code -> test.
