import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { api } from "./api/client";
import type { Ticket, User } from "./types";

const reporter: User = {
  id: 1,
  name: "Reporter",
  email: "reporter@test.local",
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
    createdBy: reporter,
    assignedTo: null,
    comments: [],
    allowedNextStatuses: ["IN_PROGRESS", "CANCELLED"],
    ...overrides,
  };
}

describe("App routes", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(api, "listTickets").mockResolvedValue([]);
    vi.spyOn(api, "listUsers").mockResolvedValue([reporter]);
    vi.spyOn(api, "getTicket").mockResolvedValue(makeTicket());
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders the create page at /tickets/new instead of treating 'new' as an id", async () => {
    render(
      <MemoryRouter initialEntries={["/tickets/new"]}>
        <App />
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole("heading", { name: "New Ticket" }),
    ).toBeInTheDocument();
    expect(api.getTicket).not.toHaveBeenCalled();
    expect(api.listTickets).not.toHaveBeenCalled();
  });

  it("renders ticket detail at /tickets/:id", async () => {
    render(
      <MemoryRouter initialEntries={["/tickets/1"]}>
        <App />
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole("heading", { name: "Sample ticket" }),
    ).toBeInTheDocument();
    expect(api.getTicket).toHaveBeenCalledWith(1);
    expect(
      screen.queryByRole("heading", { name: "New Ticket" }),
    ).not.toBeInTheDocument();
  });
});
