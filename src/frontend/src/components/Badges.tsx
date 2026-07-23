import type { TicketPriority, TicketStatus } from "../types";
import {
  PRIORITY_BADGE_CLASSES,
  PRIORITY_LABELS,
  STATUS_BADGE_CLASSES,
  STATUS_LABELS,
} from "../lib/status";

const base =
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset";

export function StatusBadge({ status }: { status: TicketStatus }) {
  return (
    <span className={`${base} ${STATUS_BADGE_CLASSES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: TicketPriority }) {
  return (
    <span className={`${base} ${PRIORITY_BADGE_CLASSES[priority]}`}>
      {PRIORITY_LABELS[priority]}
    </span>
  );
}
