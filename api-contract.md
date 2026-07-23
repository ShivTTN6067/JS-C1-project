# API Contract

Base URL: `/api` (backend defaults to `http://localhost:4000`). All requests and
responses are JSON. All errors share this shape:

```json
{ "error": { "message": "string", "details": { } } }
```

`details` is present for validation errors (Zod field errors) and invalid
transitions (`{ from, to, allowed }`).

Common status codes: `200` OK, `201` Created, `400` validation / invalid
transition, `404` not found, `500` unexpected error.

---

## GET /api/health

Purpose: liveness check.

Response `200`:

```json
{ "status": "ok" }
```

---

## GET /api/users

Purpose: list users (for reporter/assignee dropdowns).

Response `200`:

```json
[{ "id": 1, "name": "Alice Nguyen", "email": "alice@example.com", "role": "AGENT" }]
```

---

## GET /api/tickets

Purpose: list tickets with optional keyword search and status filter.

Query params:

| Param  | Type   | Notes                                                        |
| ------ | ------ | ------------------------------------------------------------ |
| search | string | Optional. Substring match on title/description (case-insensitive). |
| status | enum   | Optional. One of OPEN, IN_PROGRESS, RESOLVED, CLOSED, CANCELLED. |

Validation: unknown `status` values -> `400`.

Response `200`: array of tickets (each includes `createdBy` and `assignedTo`),
ordered by `updatedAt` desc.

---

## POST /api/tickets

Purpose: create a ticket. New tickets always start in `OPEN`.

Request:

```json
{
  "title": "string (1-200)",
  "description": "string (1-5000)",
  "priority": "LOW | MEDIUM | HIGH",
  "createdById": 1,
  "assignedToId": 2
}
```

Validation rules:

- `title`, `description` required and non-empty (trimmed).
- `priority` optional, defaults to `MEDIUM`.
- `createdById` required, must reference an existing user.
- `assignedToId` optional/nullable, must reference an existing user if provided.

Response `201`: the created ticket (with relations).

Error responses: `400` validation failed / referenced user does not exist.

---

## GET /api/tickets/:id

Purpose: fetch one ticket with its comments.

Response `200`: the ticket including `createdBy`, `assignedTo`,
`comments[]` (each with `createdBy`), and `allowedNextStatuses` (computed from
the state machine).

Error responses: `400` invalid id, `404` not found.

---

## PATCH /api/tickets/:id

Purpose: update editable fields. Does **not** change status.

Request (all fields optional, at least one required):

```json
{
  "title": "string",
  "description": "string",
  "priority": "LOW | MEDIUM | HIGH",
  "assignedToId": 2
}
```

`assignedToId` may be `null` to unassign.

Response `200`: the updated ticket.

Error responses: `400` validation / empty body / non-existent assignee,
`404` ticket not found.

---

## PATCH /api/tickets/:id/status

Purpose: transition a ticket's status through the state machine.

Request:

```json
{ "status": "IN_PROGRESS" }
```

Validation rules:

- `status` must be a known enum value (else `400` validation).
- The transition `current -> status` must be allowed (else `400` invalid
  transition, ticket unchanged).

Allowed transitions:

```
OPEN         -> IN_PROGRESS | CANCELLED
IN_PROGRESS  -> RESOLVED    | CANCELLED
RESOLVED     -> CLOSED
CLOSED       -> (none)
CANCELLED    -> (none)
```

Response `200`: the updated ticket plus `allowedNextStatuses`.

Error response `400`:

```json
{
  "error": {
    "message": "Cannot change status from OPEN to RESOLVED",
    "details": { "from": "OPEN", "to": "RESOLVED", "allowed": ["IN_PROGRESS", "CANCELLED"] }
  }
}
```

---

## POST /api/tickets/:id/comments

Purpose: add a comment to a ticket.

Request:

```json
{ "message": "string (1-2000)", "createdById": 1 }
```

Validation rules: `message` required/non-empty; `createdById` must reference an
existing user; ticket must exist.

Response `201`: the created comment (with `createdBy`).

Error responses: `400` validation / non-existent user, `404` ticket not found.
