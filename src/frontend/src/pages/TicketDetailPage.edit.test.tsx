import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TicketDetailPage from "./TicketDetailPage";
import { api } from "../api/client";
import type { Ticket, User } from "../types";

const reporter: User = {
  id: 1,
  name: "Riley Reporter",
  email: "riley@test.local",
  role: "AGENT",
};

function makeTicket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: 1,
    title: "VPN outage",
    description: "Remote users cannot connect",
    priority: "HIGH",
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

function renderDetail(path = "/tickets/1") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/tickets/:id" element={<TicketDetailPage />} />
        <Route path="/" element={<div>Ticket list</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("TicketDetailPage loading and edit draft", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(api, "listUsers").mockResolvedValue([reporter]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("shows a loading state until the ticket arrives", async () => {
    let resolveTicket!: (ticket: Ticket) => void;
    const pending = new Promise<Ticket>((resolve) => {
      resolveTicket = resolve;
    });
    vi.spyOn(api, "getTicket").mockReturnValue(pending);

    renderDetail();

    expect(screen.getByText("Loading ticket...")).toBeInTheDocument();

    resolveTicket(makeTicket());
    expect(
      await screen.findByRole("heading", { name: "VPN outage" }),
    ).toBeInTheDocument();
  });

  it("prefills the edit form from the loaded ticket", async () => {
    vi.spyOn(api, "getTicket").mockResolvedValue(makeTicket());

    renderDetail();
    await screen.findByRole("heading", { name: "VPN outage" });

    await userEvent.click(screen.getByRole("button", { name: "Edit" }));

    expect(screen.getByDisplayValue("VPN outage")).toBeInTheDocument();
    expect(
      screen.getByDisplayValue("Remote users cannot connect"),
    ).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Priority" })).toHaveValue("HIGH");
  });

  it("links back to the ticket list", async () => {
    vi.spyOn(api, "getTicket").mockResolvedValue(makeTicket());

    renderDetail();
    await screen.findByRole("heading", { name: "VPN outage" });

    await userEvent.click(screen.getByRole("link", { name: /Back to tickets/ }));
    expect(await screen.findByText("Ticket list")).toBeInTheDocument();
  });
});
