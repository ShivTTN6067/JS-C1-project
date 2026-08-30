import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

describe("TicketListPage search trim and fallbacks", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("trims the search keyword before calling the list API", async () => {
    const listSpy = vi
      .spyOn(api, "listTickets")
      .mockResolvedValue([makeTicket({ id: 1, title: "VPN outage" })]);

    render(
      <MemoryRouter>
        <TicketListPage />
      </MemoryRouter>,
    );
    await screen.findByText("VPN outage");

    await userEvent.type(
      screen.getByRole("searchbox", { name: "Search tickets" }),
      "  vpn  ",
    );

    await waitFor(() => {
      expect(listSpy).toHaveBeenCalledWith(
        expect.objectContaining({ search: "vpn" }),
      );
    });
  });

  it("shows the generic fallback when listTickets rejects a non-ApiError", async () => {
    vi.spyOn(api, "listTickets").mockRejectedValue(new Error("ECONNREFUSED"));

    render(
      <MemoryRouter>
        <TicketListPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Failed to load tickets")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("renders the ticket id and marks All as pressed by default", async () => {
    vi.spyOn(api, "listTickets").mockResolvedValue([
      makeTicket({ id: 42, title: "Login bug" }),
    ]);

    render(
      <MemoryRouter>
        <TicketListPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Login bug")).toBeInTheDocument();
    expect(screen.getByText("#42")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "All" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});
