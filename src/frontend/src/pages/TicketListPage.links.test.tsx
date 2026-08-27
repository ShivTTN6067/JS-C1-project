import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TicketListPage from "./TicketListPage";
import { api } from "../api/client";
import type { Ticket } from "../types";

function makeTicket(overrides: Partial<Ticket>): Ticket {
  return {
    id: 1,
    title: "Sample ticket",
    description: "Sample description",
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

describe("TicketListPage links", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("links each ticket to its detail page and shows the description", async () => {
    vi.spyOn(api, "listTickets").mockResolvedValue([
      makeTicket({
        id: 11,
        title: "Login bug",
        description: "Password reset emails never arrive",
      }),
    ]);

    render(
      <MemoryRouter>
        <TicketListPage />
      </MemoryRouter>,
    );

    const link = await screen.findByRole("link", { name: /Login bug/ });
    expect(link).toHaveAttribute("href", "/tickets/11");
    expect(
      screen.getByText("Password reset emails never arrive"),
    ).toBeInTheDocument();
    expect(screen.getByText("#11")).toBeInTheDocument();
  });
});
