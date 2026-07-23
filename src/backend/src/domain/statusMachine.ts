/**
 * Ticket status state machine.
 *
 * This module is the single source of truth for which status transitions
 * are allowed. Both the API layer and (indirectly, via the API) the frontend
 * rely on it so the rules cannot drift between layers.
 *
 * Allowed transitions:
 *   OPEN         -> IN_PROGRESS | CANCELLED
 *   IN_PROGRESS  -> RESOLVED    | CANCELLED
 *   RESOLVED     -> CLOSED
 *   CLOSED       -> (terminal)
 *   CANCELLED    -> (terminal)
 */

export const TICKET_STATUSES = [
  "OPEN",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
  "CANCELLED",
] as const;

export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const TICKET_PRIORITIES = ["LOW", "MEDIUM", "HIGH"] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

/** Map of each status to the set of statuses it may transition to. */
const TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  OPEN: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["RESOLVED", "CANCELLED"],
  RESOLVED: ["CLOSED"],
  CLOSED: [],
  CANCELLED: [],
};

export function isValidStatus(value: string): value is TicketStatus {
  return (TICKET_STATUSES as readonly string[]).includes(value);
}

/** Returns the list of statuses reachable in one step from `from`. */
export function allowedNextStatuses(from: TicketStatus): TicketStatus[] {
  return TRANSITIONS[from];
}

/** Returns true if moving `from` -> `to` is a permitted transition. */
export function canTransition(from: TicketStatus, to: TicketStatus): boolean {
  return TRANSITIONS[from].includes(to);
}
