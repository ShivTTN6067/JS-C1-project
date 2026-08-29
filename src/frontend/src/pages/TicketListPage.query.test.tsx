import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TicketListPage from "./TicketListPage";
import { api } from "../api/client";
import type { Ticket, User } from "../types";

const assignee: User = {
  id: 2,
  name: "Alex Assignee",
  email: "alex@test.local",
  role: "AGENT",
};

function makeTicket(overrides: Partial<Ticket> = {}): Ticket {
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

describe("TicketListPage query chips and assignee", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("passes Open and Closed chip selections to the list API", async () => {
    const listSpy = vi
      .spyOn(api, "listTickets")
      .mockResolvedValue([makeTicket({ title: "Login bug" })]);

    render(
      <MemoryRouter>
        <TicketListPage />
      </MemoryRouter>,
    );
    await screen.findByText("Login bug");

    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    await waitFor(() => {
      expect(listSpy).toHaveBeenCalledWith(
        expect.objectContaining({ status: "OPEN" }),
      );
    });

    await userEvent.click(screen.getByRole("button", { name: "Closed" }));
    await waitFor(() => {
      expect(listSpy).toHaveBeenCalledWith(
        expect.objectContaining({ status: "CLOSED" }),
      );
    });
  });

  it("sends search and status together after a filter then keyword", async () => {
    const listSpy = vi
      .spyOn(api, "listTickets")
      .mockResolvedValue([makeTicket({ title: "Login bug" })]);

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

    await userEvent.type(
      screen.getByRole("searchbox", { name: "Search tickets" }),
      "vpn",
    );

    await waitFor(() => {
      expect(listSpy).toHaveBeenCalledWith({
        search: "vpn",
        status: "IN_PROGRESS",
      });
    });
  });

  it("shows the assignee name when a ticket is assigned", async () => {
    vi.spyOn(api, "listTickets").mockResolvedValue([
      makeTicket({
        id: 11,
        title: "VPN outage",
        assignedToId: 2,
        assignedTo: assignee,
      }),
    ]);

    render(
      <MemoryRouter>
        <TicketListPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("VPN outage")).toBeInTheDocument();
    expect(screen.getByText("Assignee: Alex Assignee")).toBeInTheDocument();
  });
});
