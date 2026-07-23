# Acceptance Criteria (Cursor)

This mirrors the authoritative checklist in the root
[`acceptance-criteria.md`](../../acceptance-criteria.md); Cursor treated it as the
definition of done and verified each item.

## Core (all met)

- [x] Create a ticket via the UI.
- [x] View all tickets from the database.
- [x] Open a ticket detail view.
- [x] Update ticket fields and reassign.
- [x] Add comments.
- [x] Status changes only through valid transitions; invalid ones rejected.
- [x] Keyword search and status filter work.
- [x] Data remains available after restart.
- [x] Backend validation prevents invalid records.
- [x] No secrets committed.
- [x] State-machine integration tests pass.

## Verification method

- Automated: `npm test` in `src/backend` (18) and `src/frontend` (3).
- Type/build: `tsc --noEmit` (backend), `npm run build` (frontend).
- Manual: curl smoke test of the API and the Vite proxy (see
  [`test-results.md`](../../test-results.md)).

For the full validation/error/testing/documentation breakdown, see the root
acceptance-criteria document.
