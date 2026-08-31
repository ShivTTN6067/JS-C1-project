import { describe, expect, it } from "vitest";
import {
  addCommentSchema,
  changeStatusSchema,
  createTicketSchema,
  updateTicketSchema,
} from "../src/backend/src/validation/schemas.js";

/**
 * Unknown-key stripping plus the "at least one field" refine. If the update
 * schema is switched to passthrough, a status-only PATCH would stop being
 * rejected as an empty body.
 */

describe("updateTicketSchema unknown-key stripping", () => {
  it("rejects bodies whose only keys are unknown after stripping", () => {
    expect(updateTicketSchema.safeParse({ status: "CLOSED" }).success).toBe(
      false,
    );
    expect(updateTicketSchema.safeParse({ createdById: 1 }).success).toBe(
      false,
    );
    expect(updateTicketSchema.safeParse({ id: 9, foo: "bar" }).success).toBe(
      false,
    );
  });

  it("trims a PATCH title and keeps a known field after stripping extras", () => {
    const parsed = updateTicketSchema.parse({
      title: "  Renamed  ",
      status: "CLOSED",
    });
    expect(parsed).toEqual({ title: "Renamed" });
  });
});

describe("createTicketSchema unknown-key stripping", () => {
  const valid = {
    title: "Login fails",
    description: "Users cannot sign in",
    createdById: 1,
  };

  it("strips status and other unknown keys instead of persisting them", () => {
    const parsed = createTicketSchema.parse({
      ...valid,
      status: "CLOSED",
      secret: "should-not-leak",
    });
    expect(parsed).not.toHaveProperty("status");
    expect(parsed).not.toHaveProperty("secret");
    expect(parsed.priority).toBe("MEDIUM");
  });

  it("rejects a lowercase priority", () => {
    expect(
      createTicketSchema.safeParse({ ...valid, priority: "high" }).success,
    ).toBe(false);
  });
});

describe("comment and status schemas required fields", () => {
  it("rejects a comment missing message and a non-positive author", () => {
    expect(addCommentSchema.safeParse({ createdById: 1 }).success).toBe(false);
    expect(
      addCommentSchema.safeParse({ message: "hello", createdById: 0 }).success,
    ).toBe(false);
  });

  it("rejects a status change with an empty body", () => {
    expect(changeStatusSchema.safeParse({}).success).toBe(false);
  });
});
