import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TicketListPage from "./TicketListPage";
import { api } from "../api/client";
import type { Ticket, User } from "../types";

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 2,
    name: "Bob Martinez",
    email: "bob@test.local",
    role: "AGENT",
    profilePhotoUrl: "/uploads/avatars/bob.jpg",
    ...overrides,
  };
}

function makeTicket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: 1,
    title: "Login bug",
    description: "Cannot sign in",
    priority: "MEDIUM",
    status: "OPEN",
    createdById: 1,
    assignedToId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    assignedTo: null,
    ...overrides,
  };
}

describe("TicketListPage avatars", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("shows the assignee photo when present and Unassigned otherwise", async () => {
    vi.spyOn(api, "listTickets").mockResolvedValue([
      makeTicket({
        id: 1,
        title: "Assigned ticket",
        assignedToId: 2,
        assignedTo: makeUser(),
      }),
      makeTicket({ id: 2, title: "Open ticket", assignedToId: null, assignedTo: null }),
    ]);

    render(
      <MemoryRouter>
        <TicketListPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Assigned ticket")).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Bob Martinez's profile photo" }),
    ).toHaveAttribute("src", "/uploads/avatars/bob.jpg");
    expect(screen.getByText(/Assignee:\s*Unassigned/)).toBeInTheDocument();
  });
});
