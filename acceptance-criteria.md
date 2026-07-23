# Acceptance Criteria

Status legend: [x] met and verified, [ ] not applicable / out of scope.

## Core

- [x] A user can create a ticket via the UI (`TicketCreatePage`).
- [x] A user can view all tickets from the database (`TicketListPage`).
- [x] A user can open a ticket detail view (`TicketDetailPage`).
- [x] A user can update ticket fields and reassign (inline edit on detail page).
- [x] A user can add comments to a ticket.
- [x] Status changes only through valid transitions; invalid ones are rejected
      (backend `PATCH /api/tickets/:id/status` + `statusMachine.ts`).
- [x] Keyword search and status filter work (`GET /api/tickets?search=&status=`).
- [x] Data remains available after restart (SQLite file persistence).
- [x] Backend validation prevents invalid records (Zod schemas + user-existence checks).
- [x] No secrets committed to the repo (`.env` gitignored, `.env.example` provided).
- [x] State-machine integration tests pass (`tests/tickets.integration.test.ts`).

## Validation

- [x] Title required, non-empty, max length enforced.
- [x] Description required, non-empty, max length enforced.
- [x] Priority restricted to LOW | MEDIUM | HIGH.
- [x] Status restricted to the five known values.
- [x] Referenced reporter/assignee must exist (400 otherwise).
- [x] Update requires at least one field.

## Error Handling

- [x] All errors return a consistent `{ error: { message, details? } }` shape.
- [x] 400 for validation / invalid transition, 404 for missing resources,
      500 for unexpected errors (logged server-side).
- [x] Frontend surfaces API error messages (create form, status change, comments).
- [x] Frontend shows loading, empty, and error states on the list and detail pages.

## Testing

- [x] Unit tests for the state machine (exhaustive transition matrix).
- [x] Integration tests for valid + invalid transitions (mandatory tier).
- [x] Integration tests for create/list/search/filter/update/comment/validation.
- [x] One frontend component test (list rendering + status filter + empty state).

## Documentation

- [x] README with setup instructions for backend, frontend, and tests.
- [x] Database setup notes, schema mirror, and seed snapshot in `database/`.
- [x] API contract, data model, UI flow, design notes, test strategy documents.
- [x] Prompt history under `ai-prompts/`.
- [x] Cursor persistent-context artifacts under `tool-specific/cursor-workflow/`.
- [x] Debugging, review, and PR artifacts.
