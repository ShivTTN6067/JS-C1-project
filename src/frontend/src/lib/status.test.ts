import { describe, expect, it } from "vitest";
import type { TicketPriority, TicketStatus } from "../types";
import {
  PRIORITY_BADGE_CLASSES,
  PRIORITY_LABELS,
  STATUS_BADGE_CLASSES,
  STATUS_LABELS,
  STATUS_ORDER,
} from "./status";

const ALL_STATUSES: TicketStatus[] = [
  "OPEN",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
  "CANCELLED",
];

const ALL_PRIORITIES: TicketPriority[] = ["LOW", "MEDIUM", "HIGH"];

describe("status labels", () => {
  it("keeps filter order complete and labeled for every ticket status", () => {
    expect(STATUS_ORDER).toEqual(ALL_STATUSES);
    for (const status of ALL_STATUSES) {
      expect(STATUS_LABELS[status].length).toBeGreaterThan(0);
      expect(STATUS_BADGE_CLASSES[status].length).toBeGreaterThan(0);
    }
  });

  it("labels every priority used by create and edit forms", () => {
    for (const priority of ALL_PRIORITIES) {
      expect(PRIORITY_LABELS[priority].length).toBeGreaterThan(0);
      expect(PRIORITY_BADGE_CLASSES[priority].length).toBeGreaterThan(0);
    }
  });
});
