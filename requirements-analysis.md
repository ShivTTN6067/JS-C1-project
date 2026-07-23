# Requirement Analysis

## Selected Project Option

Support Ticket Management System — **Core** tier. A small internal application
for managing support tickets through a defined lifecycle.

## My Understanding (in my own words)

Internal users need a lightweight tool to track support tickets. A ticket has a
title, description, priority, an owner (creator) and optionally an assignee, and
it moves through a fixed lifecycle: it starts Open, can progress to In Progress,
then Resolved, then Closed, and can be Cancelled from the early stages. The
central engineering challenge is that status changes are not free-form: only
specific transitions are legal, and the backend must be the authority that
enforces them so the data can never enter an invalid state, regardless of what
the UI sends.

Beyond the state machine, the app needs the usual CRUD-ish surface: create a
ticket, list/search/filter tickets, view a ticket with its comments, edit its
editable fields, and add comments. Everything must persist in a real database so
data survives a restart, and invalid input must be rejected server-side with
clear errors surfaced in the UI.

## Functional Requirements

1. Create a ticket (title, description, priority, reporter, optional assignee).
2. List all tickets.
3. View a single ticket's details, including its comments.
4. Update editable ticket fields: title, description, priority, assignee.
5. Change ticket status only via valid state-machine transitions.
6. Add comments to a ticket.
7. Keyword search across title/description.
8. Filter tickets by status.
9. Persist all data (survives server restart).
10. Validate required fields and reject invalid input at the backend.
11. Show meaningful loading / empty / error states in the UI.

## Non-Functional Requirements

- **Correctness of the state machine** is the priority; it must be centralized
  and covered by tests.
- **Consistency:** all API errors share one JSON shape.
- **Persistence:** file-based SQLite so no external service is needed.
- **Security:** no secrets in the repo; validate all input; no injection-prone
  raw SQL (Prisma parameterizes queries).
- **Maintainability:** clear separation of domain logic, validation, routes, and
  data access.
- **Setup simplicity:** runnable from the README with `npm install` + migrate.

## Assumptions

- Users are seeded only; there is no user-management UI (per the brief).
- No authentication is required for Core; any user id can act as reporter/commenter.
  In a real system this would come from an authenticated session.
- Priorities are a fixed set: LOW, MEDIUM, HIGH.
- "Keyword search" is a case-insensitive substring match on title/description
  (SQLite `LIKE` is case-insensitive for ASCII).
- A ticket always starts in OPEN.
- Deleting a ticket is out of scope for Core (not in the feature list).

## Clarifications (questions I would ask a product owner)

1. Should a resolved ticket be re-openable (RESOLVED -> IN_PROGRESS), or is the
   forward-only lifecycle intended? (Implemented forward-only per the brief.)
2. Should CLOSED be reachable only from RESOLVED, or also directly? (Implemented
   only from RESOLVED.)
3. Do we need soft-delete/archival, or is CANCELLED the terminal "not doing this"
   state? (Treated CANCELLED as that state.)
4. Should comments be editable/deletable? (Assumed append-only for Core.)
5. Should search also match comments or assignee names? (Scoped to title/description.)

## Edge Cases

- Creating a ticket with a missing/blank title or description -> 400.
- Creating a ticket referencing a non-existent reporter/assignee -> 400 with a
  clear message (rather than a raw FK error).
- Requesting a ticket id that does not exist -> 404.
- Invalid status transition (e.g. OPEN -> RESOLVED) -> 400, ticket unchanged.
- Transition out of a terminal state (CLOSED/CANCELLED) -> 400.
- Unknown/garbage status value in the request body -> 400 (validation).
- Empty search results / empty ticket list -> UI empty state, not an error.
- Reassigning to "Unassigned" (null) is allowed.
