import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TicketListPage from "./TicketListPage";
import { api, ApiError } from "../api/client";
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

describe("TicketListPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders tickets returned by the API", async () => {
    vi.spyOn(api, "listTickets").mockResolvedValue([
      makeTicket({ id: 1, title: "Login bug", status: "OPEN" }),
      makeTicket({ id: 2, title: "Chart issue", status: "IN_PROGRESS" }),
    ]);

    render(
      <MemoryRouter>
        <TicketListPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Login bug")).toBeInTheDocument();
    expect(screen.getByText("Chart issue")).toBeInTheDocument();
  });

  it("passes the selected status filter to the API", async () => {
    const listSpy = vi
      .spyOn(api, "listTickets")
      .mockResolvedValue([makeTicket({ id: 1, title: "Login bug" })]);

    render(
      <MemoryRouter>
        <TicketListPage />
      </MemoryRouter>,
    );

    await screen.findByText("Login bug");

    await userEvent.click(screen.getByRole("button", { name: "In Progress" }));

    await waitFor(() => {
      expect(listSpy).toHaveBeenCalledWith(
        expect.objectContaining({ status: "IN_PROGRESS" }),
      );
    });
  });

  it("shows an empty state when there are no tickets", async () => {
    vi.spyOn(api, "listTickets").mockResolvedValue([]);

    render(
      <MemoryRouter>
        <TicketListPage />
      </MemoryRouter>,
    );

    expect(
      await screen.findByText("No tickets match your filters."),
    ).toBeInTheDocument();
  });

  it("shows an error state and reloads after retry", async () => {
    const listSpy = vi
      .spyOn(api, "listTickets")
      .mockRejectedValueOnce(new ApiError(500, "Failed to load tickets"))
      .mockResolvedValueOnce([makeTicket({ id: 1, title: "Login bug" })]);

    render(
      <MemoryRouter>
        <TicketListPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Failed to load tickets")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Login bug")).toBeInTheDocument();
    expect(listSpy).toHaveBeenCalledTimes(2);
  });

  it("passes the typed search keyword to the API", async () => {
    const listSpy = vi
      .spyOn(api, "listTickets")
      .mockResolvedValue([makeTicket({ id: 1, title: "Login bug" })]);

    render(
      <MemoryRouter>
        <TicketListPage />
      </MemoryRouter>,
    );
    await screen.findByText("Login bug");

    await userEvent.type(
      screen.getByRole("searchbox", { name: "Search tickets" }),
      "payment",
    );

    await waitFor(() => {
      expect(listSpy).toHaveBeenCalledWith(
        expect.objectContaining({ search: "payment" }),
      );
    });
  });
});
