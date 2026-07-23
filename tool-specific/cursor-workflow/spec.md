# Spec (Cursor)

The specification Cursor developed against. Traceable to the requirements
(`requirements-analysis.md`) and acceptance criteria (`acceptance-criteria.md`).

## Goal

Deliver the Core Support Ticket Management System: create/list/view/update
tickets, comment, search + filter by status, and enforce a status state machine,
with persistence, validation, error handling, tests, and documentation.

## Entities

- `User` (seeded): id, name, email (unique), role.
- `Ticket`: id, title, description, priority (LOW|MEDIUM|HIGH),
  status (OPEN|IN_PROGRESS|RESOLVED|CLOSED|CANCELLED), createdById,
  assignedToId?, createdAt, updatedAt.
- `Comment`: id, ticketId, message, createdById, createdAt.

## State machine

```
OPEN         -> IN_PROGRESS | CANCELLED
IN_PROGRESS  -> RESOLVED    | CANCELLED
RESOLVED     -> CLOSED
CLOSED, CANCELLED -> terminal
```

Invalid transitions rejected by the backend (`400`) and never offered by the UI.

## API (see `api-contract.md` for full detail)

- `GET /api/users`
- `GET /api/tickets?search=&status=`
- `POST /api/tickets`
- `GET /api/tickets/:id`
- `PATCH /api/tickets/:id`
- `PATCH /api/tickets/:id/status`
- `POST /api/tickets/:id/comments`

## Frontend

- `/` list (search + status chips, badges, states).
- `/tickets/new` validated create form.
- `/tickets/:id` detail (inline edit/reassign, status buttons, comments).

## Validation & errors

- Zod schemas for all bodies/queries; referenced users must exist.
- Consistent JSON error envelope; 400/404/500 mapping via one middleware.

## Testing

- Unit: exhaustive state-machine matrix.
- Integration (mandatory): valid + invalid transitions, plus CRUD/search/filter/
  comment/validation.
- Frontend: list rendering + status filter + empty state.

## Out of scope (Core)

Authentication, user CRUD/roles, priority/assignee filters, sorting, pagination,
Docker, CI, OpenAPI (all optional Stretch).

## Definition of done

Acceptance criteria in `acceptance-criteria.md` met; all tests green; type-check
and build clean; runnable from `README.md`; no secrets committed.
