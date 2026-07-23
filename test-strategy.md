# Test Strategy

## Test Scope

The Core mandatory tier is **integration tests proving the state-machine rules**.
On top of that, the suite covers the rest of the API surface and one frontend
component test. The goal is to protect the highest-judgment logic (status
transitions and validation) end-to-end, plus give a smoke-level guarantee that
the UI renders and filters correctly.

| Tier              | Tool                         | Location                              |
| ----------------- | ---------------------------- | ------------------------------------- |
| Domain unit       | Vitest                       | `tests/statusMachine.test.ts`         |
| API integration   | Vitest + real server + fetch | `tests/tickets.integration.test.ts`   |
| Frontend component| Vitest + React Testing Library | `src/frontend/src/pages/TicketListPage.test.tsx` |

## Unit Tests (state machine)

`tests/statusMachine.test.ts` exhaustively checks every `(from, to)` pair in the
5x5 status matrix against the documented rules, asserts that CLOSED/CANCELLED are
terminal, that no status transitions to itself, and that status-string validation
works. This makes any accidental change to the transition table fail loudly.

## Component Tests (frontend)

`TicketListPage.test.tsx` mocks the API client and verifies:

- tickets returned by the API are rendered,
- selecting a status chip passes the correct `status` to the API,
- an empty result renders the empty state.

## API / Integration Tests

`tests/tickets.integration.test.ts` boots the real Express app on an ephemeral
port against a dedicated SQLite test database (`data/test.db`, provisioned by
`tests/globalSetup.ts`) and drives it with `fetch`. It covers:

- create returns `201` in OPEN; missing fields -> `400`; non-existent user -> `400`;
- list, status filter, and keyword search;
- update fields + reassignment;
- add comment and read it back on the detail response;
- `404` for a missing ticket;
- **state machine:** the full valid path OPEN -> IN_PROGRESS -> RESOLVED -> CLOSED,
  OPEN -> CANCELLED, invalid OPEN -> RESOLVED rejected `400`, transition out of a
  terminal state rejected, and an unknown status value rejected.

Each test resets the DB and seeds two users in `beforeEach`, so tests are
independent and order-insensitive.

## Edge Case Tests

Covered within the integration suite: invalid transitions, terminal-state
transitions, unknown status values, missing required fields, dangling foreign
keys, and missing resources. Frontend edge cases (empty list) are covered in the
component test.

## Tests Not Covered (and why)

- **Full end-to-end (browser) tests** (e.g. Playwright): out of scope for Core;
  the flows are smoke-tested manually and recorded in `test-results.md`.
- **Frontend create/detail pages** beyond the list: the highest-risk UI behavior
  (filtering + rendering) is covered; form/detail logic is thin and exercised
  manually. A follow-up would add tests for the detail page's transition buttons.
- **Load/performance and concurrency tests:** not relevant at this scope.
- **Auth/authorization tests:** authentication is intentionally not implemented
  (optional Stretch).

## How to Run

```bash
cd src/backend && npm test      # unit + integration
cd src/frontend && npm test     # component
```
