# AI Prompts — Testing

---

## T1 — Exhaustive state-machine unit tests

**Prompt (summary):** "Write unit tests that verify every possible (from, to)
status pair against the documented rules, plus terminal states and no
self-transitions."

**AI response (summary):** Generated a test that iterates the full 5x5 matrix and
compares against a set of the valid transitions, plus targeted assertions.

**Accepted:** the matrix approach.
**Changed:** added a self-transition check and a status-string validation case.
**Result:** `tests/statusMachine.test.ts` (5 tests).

---

## T2 — API integration tests (mandatory tier)

**Prompt (summary):** "Write integration tests proving the state machine
end-to-end (valid transitions succeed, invalid rejected), plus create/validation,
list, search, filter, update, comment, and 404."

**AI response (summary):** Initially proposed a `supertest`-based suite against a
temporary SQLite DB provisioned by a Vitest global setup.

**Accepted:** the DB-provisioning approach (`prisma db push --force-reset` in
`tests/globalSetup.ts`) and the case list.
**Changed:** after `supertest` failed under Vitest (see `debugging-notes.md`),
rewrote the harness to boot the real app on an ephemeral port and use `fetch`.
**Rejected:** the `supertest` dependency (removed).
**Result:** `tests/tickets.integration.test.ts` (13 tests).

---

## T3 — Frontend component test

**Prompt (summary):** "Write a React Testing Library test for the list page:
renders tickets, passes the selected status filter to the API, and shows the empty
state."

**AI response (summary):** Generated a test mocking the `api` client and asserting
on rendered content and the `listTickets` call args.

**Accepted:** as generated.
**Changed:** used `findBy*` for the async load and asserted the exact filter value
passed.
**Result:** `src/frontend/src/pages/TicketListPage.test.tsx` (3 tests).

---

## T4 — Coverage review

**Prompt (summary):** "Given the current tests, what edge cases am I missing for
Core?"

**AI response (summary):** Suggested terminal-state transition attempts, unknown
status values, and dangling FK references.

**Accepted:** added all three to the integration suite.
