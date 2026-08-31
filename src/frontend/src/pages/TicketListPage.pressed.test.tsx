import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TicketListPage from "./TicketListPage";
import { api } from "../api/client";
import type { Ticket } from "../types";

function makeTicket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: 1,
    title: "Login bug",
    description: "Users cannot sign in",
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

describe("TicketListPage filter press state and search clear", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("marks In Progress as pressed and All as unpressed after a chip click", async () => {
    vi.spyOn(api, "listTickets").mockResolvedValue([
      makeTicket({ title: "Login bug" }),
    ]);

    render(
      <MemoryRouter>
        <TicketListPage />
      </MemoryRouter>,
    );
    await screen.findByText("Login bug");

    await userEvent.click(screen.getByRole("button", { name: "In Progress" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "In Progress" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
    });
    expect(screen.getByRole("button", { name: "All" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("reloads without a search param after the keyword is cleared", async () => {
    const listSpy = vi
      .spyOn(api, "listTickets")
      .mockResolvedValue([makeTicket({ title: "Login bug" })]);

    render(
      <MemoryRouter>
        <TicketListPage />
      </MemoryRouter>,
    );
    await screen.findByText("Login bug");

    const search = screen.getByRole("searchbox", { name: "Search tickets" });
    await userEvent.type(search, "vpn");
    await waitFor(() => {
      expect(listSpy).toHaveBeenCalledWith(
        expect.objectContaining({ search: "vpn" }),
      );
    });

    await userEvent.clear(search);
    await waitFor(() => {
      expect(listSpy).toHaveBeenLastCalledWith({
        search: undefined,
        status: undefined,
      });
    });
  });

  it("renders the Open status label for an OPEN ticket", async () => {
    vi.spyOn(api, "listTickets").mockResolvedValue([
      makeTicket({ status: "OPEN" }),
    ]);

    render(
      <MemoryRouter>
        <TicketListPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Login bug")).toBeInTheDocument();
    expect(screen.getAllByText("Open").length).toBeGreaterThan(0);
  });
});
