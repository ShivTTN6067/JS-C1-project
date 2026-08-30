import { describe, expect, it } from "vitest";
import {
  allowedNextStatuses,
  isValidStatus,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
} from "../src/backend/src/domain/statusMachine.js";

/**
 * Exact next-status lists and enum membership. Complements the 5x5
 * transition-matrix tests without editing that file.
 */

describe("statusMachine lists and membership", () => {
  it("returns the documented next-status lists in display order", () => {
    expect(allowedNextStatuses("OPEN")).toEqual(["IN_PROGRESS", "CANCELLED"]);
    expect(allowedNextStatuses("IN_PROGRESS")).toEqual(["RESOLVED", "CANCELLED"]);
    expect(allowedNextStatuses("RESOLVED")).toEqual(["CLOSED"]);
    expect(allowedNextStatuses("CLOSED")).toEqual([]);
    expect(allowedNextStatuses("CANCELLED")).toEqual([]);
  });

  it("accepts every documented status and no mixed-case variants", () => {
    for (const status of TICKET_STATUSES) {
      expect(isValidStatus(status)).toBe(true);
    }
    expect(isValidStatus("In_Progress")).toBe(false);
    expect(isValidStatus("CLOSED ")).toBe(false);
  });

  it("exports the three documented priorities", () => {
    expect(TICKET_PRIORITIES).toEqual(["LOW", "MEDIUM", "HIGH"]);
  });
});
