import { describe, expect, it } from "vitest";
import {
  addCommentSchema,
  changeStatusSchema,
  createTicketSchema,
  listTicketsQuerySchema,
  updateTicketSchema,
} from "../src/backend/src/validation/schemas.js";

/**
 * Unit tests for request validation. These catch trim/empty/enum/default
 * regressions without booting the HTTP server or touching the database.
 */

describe("createTicketSchema", () => {
  const valid = {
    title: "Login fails",
    description: "Users cannot sign in",
    createdById: 1,
  };

  it("trims title and description and defaults priority to MEDIUM", () => {
    const parsed = createTicketSchema.parse({
      ...valid,
      title: "  Login fails  ",
      description: "  Users cannot sign in  ",
    });
    expect(parsed.title).toBe("Login fails");
    expect(parsed.description).toBe("Users cannot sign in");
    expect(parsed.priority).toBe("MEDIUM");
  });

  it("rejects whitespace-only title or description", () => {
    expect(createTicketSchema.safeParse({ ...valid, title: "   " }).success).toBe(
      false,
    );
    expect(
      createTicketSchema.safeParse({ ...valid, description: "\t\n" }).success,
    ).toBe(false);
  });

  it("rejects an invalid priority and a non-positive createdById", () => {
    expect(
      createTicketSchema.safeParse({ ...valid, priority: "URGENT" }).success,
    ).toBe(false);
    expect(
      createTicketSchema.safeParse({ ...valid, createdById: 0 }).success,
    ).toBe(false);
  });

  it("accepts a nullable assignedToId", () => {
    const parsed = createTicketSchema.parse({ ...valid, assignedToId: null });
    expect(parsed.assignedToId).toBeNull();
  });
});

describe("updateTicketSchema", () => {
  it("rejects an empty body", () => {
    const result = updateTicketSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("accepts a partial update and assignedToId null (unassign)", () => {
    expect(updateTicketSchema.parse({ title: "Renamed" }).title).toBe("Renamed");
    expect(updateTicketSchema.parse({ assignedToId: null }).assignedToId).toBeNull();
  });

  it("rejects a whitespace-only title", () => {
    expect(updateTicketSchema.safeParse({ title: "   " }).success).toBe(false);
  });
});

describe("changeStatusSchema", () => {
  it("accepts a known status and rejects unknown values", () => {
    expect(changeStatusSchema.parse({ status: "IN_PROGRESS" }).status).toBe(
      "IN_PROGRESS",
    );
    expect(changeStatusSchema.safeParse({ status: "BOGUS" }).success).toBe(false);
  });
});

describe("addCommentSchema", () => {
  it("trims the message and rejects blank comments", () => {
    expect(
      addCommentSchema.parse({ message: "  looking into this  ", createdById: 1 })
        .message,
    ).toBe("looking into this");
    expect(
      addCommentSchema.safeParse({ message: "   ", createdById: 1 }).success,
    ).toBe(false);
  });
});

describe("listTicketsQuerySchema", () => {
  it("accepts omitted filters and a valid status", () => {
    expect(listTicketsQuerySchema.parse({})).toEqual({});
    expect(listTicketsQuerySchema.parse({ status: "OPEN", search: " login " })).toEqual({
      status: "OPEN",
      search: "login",
    });
  });

  it("rejects an unknown status filter", () => {
    expect(listTicketsQuerySchema.safeParse({ status: "NOPE" }).success).toBe(
      false,
    );
  });
});
