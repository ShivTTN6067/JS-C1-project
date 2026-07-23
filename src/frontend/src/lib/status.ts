import type { TicketPriority, TicketStatus } from "../types";

export const STATUS_LABELS: Record<TicketStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
  CANCELLED: "Cancelled",
};

export const STATUS_ORDER: TicketStatus[] = [
  "OPEN",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
  "CANCELLED",
];

export const STATUS_BADGE_CLASSES: Record<TicketStatus, string> = {
  OPEN: "bg-blue-100 text-blue-700 ring-blue-600/20",
  IN_PROGRESS: "bg-amber-100 text-amber-800 ring-amber-600/20",
  RESOLVED: "bg-emerald-100 text-emerald-700 ring-emerald-600/20",
  CLOSED: "bg-slate-200 text-slate-700 ring-slate-600/20",
  CANCELLED: "bg-rose-100 text-rose-700 ring-rose-600/20",
};

export const PRIORITY_LABELS: Record<TicketPriority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
};

export const PRIORITY_BADGE_CLASSES: Record<TicketPriority, string> = {
  LOW: "bg-slate-100 text-slate-600 ring-slate-500/20",
  MEDIUM: "bg-indigo-100 text-indigo-700 ring-indigo-600/20",
  HIGH: "bg-red-100 text-red-700 ring-red-600/20",
};
