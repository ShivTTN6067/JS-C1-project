# Test Results

Recorded from local runs on Node.js during development. Re-run with `npm test`
in each package.

## Backend — Unit + Integration (`src/backend`)

Command: `npm test` (Vitest, runs against `data/test.db`).

```
 ✓ ../../tests/tickets.integration.test.ts (13 tests)
 ✓ ../../tests/statusMachine.test.ts (5 tests)

 Test Files  2 passed (2)
      Tests  18 passed (18)
```

Breakdown:

- `statusMachine.test.ts` (5): exhaustive transition matrix, terminal states,
  no self-transitions, status-string validation.
- `tickets.integration.test.ts` (13): create/validation/FK checks, list, status
  filter, keyword search, update+reassign, comment add + read-back, 404, and the
  full state-machine set (valid path, OPEN->CANCELLED, invalid OPEN->RESOLVED
  rejected, terminal-state transition rejected, unknown status rejected).

## Frontend — Component (`src/frontend`)

Command: `npm test` (Vitest + React Testing Library, jsdom).

```
 ✓ src/pages/TicketListPage.test.tsx (3 tests)

 Test Files  1 passed (1)
      Tests  3 passed (3)
```

(React Router prints v7 future-flag warnings; these are informational, not
failures.)

## Type Checking / Build

- Backend: `npx tsc -p tsconfig.json --noEmit` — no errors.
- Frontend: `npm run build` (`tsc -b && vite build`) — succeeds; production bundle
  built (~181 kB JS, ~16 kB CSS before gzip).

## Manual Smoke Test (API)

Backend running on `:4000`, seeded data. Verified with curl:

| Check                                    | Expected | Actual |
| ---------------------------------------- | -------- | ------ |
| `GET /api/health`                        | ok       | ok     |
| `GET /api/users`                         | 3 users  | 3      |
| `GET /api/tickets?search=login`          | 1 match  | 1      |
| `GET /api/tickets?status=OPEN`           | 2 open   | 2      |
| `POST /api/tickets` (valid)              | 201      | 201    |
| `POST /api/tickets` (no title)           | 400      | 400    |
| `PATCH /tickets/1/status` OPEN->RESOLVED | 400      | 400    |
| `PATCH /tickets/1/status` OPEN->IN_PROGRESS | 200   | 200    |
| `POST /tickets/1/comments` (valid)       | 201      | 201    |

## Manual Smoke Test (Frontend)

- Frontend dev server served `/` with `200`.
- Vite proxy forwarded `/api/tickets?status=OPEN` to the backend and returned the
  expected tickets, confirming the frontend-to-backend wiring.

## Persistence Check

Data is stored in `src/backend/data/dev.db`. Tickets created via the API remain
returned by `GET /api/tickets` after stopping and restarting the server.
