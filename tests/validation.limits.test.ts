import { describe, expect, it } from "vitest";
import {
  addCommentSchema,
  createTicketSchema,
  listTicketsQuerySchema,
  updateTicketSchema,
} from "../src/backend/src/validation/schemas.js";

/**
 * Length limits and query-edge cases that the original suite never asserted.
 * Kept separate from broader schema coverage so a later merge of other
 * validation tests does not collide on the same file.
 */

describe("createTicketSchema length and id limits", () => {
  const valid = {
    title: "Login fails",
    description: "Users cannot sign in",
    createdById: 1,
  };

  it("accepts a 200-character title and rejects 201", () => {
    expect(
      createTicketSchema.safeParse({ ...valid, title: "a".repeat(200) }).success,
    ).toBe(true);
    expect(
      createTicketSchema.safeParse({ ...valid, title: "a".repeat(201) }).success,
    ).toBe(false);
  });

  it("accepts a 5000-character description and rejects 5001", () => {
    expect(
      createTicketSchema.safeParse({ ...valid, description: "d".repeat(5000) })
        .success,
    ).toBe(true);
    expect(
      createTicketSchema.safeParse({ ...valid, description: "d".repeat(5001) })
        .success,
    ).toBe(false);
  });

  it("rejects a non-integer createdById", () => {
    expect(
      createTicketSchema.safeParse({ ...valid, createdById: 1.5 }).success,
    ).toBe(false);
  });
});

describe("addCommentSchema length limits", () => {
  it("accepts a 2000-character message and rejects 2001", () => {
    expect(
      addCommentSchema.safeParse({ message: "c".repeat(2000), createdById: 1 })
        .success,
    ).toBe(true);
    expect(
      addCommentSchema.safeParse({ message: "c".repeat(2001), createdById: 1 })
        .success,
    ).toBe(false);
  });
});

describe("listTicketsQuerySchema whitespace search", () => {
  it("trims a whitespace-only search to an empty string", () => {
    expect(listTicketsQuerySchema.parse({ search: "   " })).toEqual({
      search: "",
    });
  });
});

describe("updateTicketSchema id limits", () => {
  it("rejects a non-positive assignedToId while still allowing null", () => {
    expect(updateTicketSchema.safeParse({ assignedToId: 0 }).success).toBe(false);
    expect(updateTicketSchema.parse({ assignedToId: null }).assignedToId).toBeNull();
  });
});
