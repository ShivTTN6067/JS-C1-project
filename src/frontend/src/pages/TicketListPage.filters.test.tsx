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

describe("TicketListPage filters and badges", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("shows a loading state before tickets arrive", async () => {
    let resolveList!: (tickets: Ticket[]) => void;
    const pending = new Promise<Ticket[]>((resolve) => {
      resolveList = resolve;
    });
    vi.spyOn(api, "listTickets").mockReturnValue(pending);

    render(
      <MemoryRouter>
        <TicketListPage />
      </MemoryRouter>,
    );

    expect(screen.getByText("Loading tickets...")).toBeInTheDocument();

    resolveList([makeTicket({ title: "Login bug" })]);
    expect(await screen.findByText("Login bug")).toBeInTheDocument();
  });

  it("renders priority badges for HIGH and LOW tickets", async () => {
    vi.spyOn(api, "listTickets").mockResolvedValue([
      makeTicket({ id: 1, title: "Pager fire", priority: "HIGH" }),
      makeTicket({ id: 2, title: "Typo in copy", priority: "LOW" }),
    ]);

    render(
      <MemoryRouter>
        <TicketListPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Pager fire")).toBeInTheDocument();
    expect(screen.getByText("High")).toBeInTheDocument();
    expect(screen.getByText("Low")).toBeInTheDocument();
  });

  it("passes Resolved and Cancelled chip selections to the list API", async () => {
    const listSpy = vi
      .spyOn(api, "listTickets")
      .mockResolvedValue([makeTicket({ title: "Login bug" })]);

    render(
      <MemoryRouter>
        <TicketListPage />
      </MemoryRouter>,
    );
    await screen.findByText("Login bug");

    await userEvent.click(screen.getByRole("button", { name: "Resolved" }));
    await waitFor(() => {
      expect(listSpy).toHaveBeenCalledWith(
        expect.objectContaining({ status: "RESOLVED" }),
      );
    });

    await userEvent.click(screen.getByRole("button", { name: "Cancelled" }));
    await waitFor(() => {
      expect(listSpy).toHaveBeenCalledWith(
        expect.objectContaining({ status: "CANCELLED" }),
      );
    });
  });
});
