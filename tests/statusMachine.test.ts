import { describe, expect, it } from "vitest";
import {
  allowedNextStatuses,
  canTransition,
  isValidStatus,
  TICKET_STATUSES,
  type TicketStatus,
} from "../src/backend/src/domain/statusMachine.js";

/**
 * Unit tests for the status state machine. These exhaustively verify every
 * (from, to) pair so any change to the transition rules is caught.
 */

const VALID_TRANSITIONS: Array<[TicketStatus, TicketStatus]> = [
  ["OPEN", "IN_PROGRESS"],
  ["OPEN", "CANCELLED"],
  ["IN_PROGRESS", "RESOLVED"],
  ["IN_PROGRESS", "CANCELLED"],
  ["RESOLVED", "CLOSED"],
];

describe("statusMachine", () => {
  it("accepts exactly the documented valid transitions", () => {
    for (const [from, to] of VALID_TRANSITIONS) {
      expect(canTransition(from, to)).toBe(true);
    }
  });

  it("rejects every transition not explicitly allowed", () => {
    const validSet = new Set(VALID_TRANSITIONS.map(([f, t]) => `${f}->${t}`));
    for (const from of TICKET_STATUSES) {
      for (const to of TICKET_STATUSES) {
        const expected = validSet.has(`${from}->${to}`);
        expect(canTransition(from, to)).toBe(expected);
      }
    }
  });

  it("treats CLOSED and CANCELLED as terminal states", () => {
    expect(allowedNextStatuses("CLOSED")).toEqual([]);
    expect(allowedNextStatuses("CANCELLED")).toEqual([]);
  });

  it("does not allow a status to transition to itself", () => {
    for (const status of TICKET_STATUSES) {
      expect(canTransition(status, status)).toBe(false);
    }
  });

  it("validates status strings", () => {
    expect(isValidStatus("OPEN")).toBe(true);
    expect(isValidStatus("NOT_A_STATUS")).toBe(false);
    expect(isValidStatus("")).toBe(false);
    expect(isValidStatus("open")).toBe(false);
  });
});
