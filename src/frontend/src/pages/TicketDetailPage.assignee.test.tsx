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

const assignee: User = {
  id: 2,
  name: "Alex Assignee",
  email: "alex@test.local",
  role: "AGENT",
};

function makeTicket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: 1,
    title: "VPN outage",
    description: "Remote users cannot connect",
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

function renderDetail(path = "/tickets/1") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/tickets/:id" element={<TicketDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("TicketDetailPage assignee, priority, and terminal state", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(api, "listUsers").mockResolvedValue([reporter, assignee]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("saves an assignee and priority change through the update API", async () => {
    vi.spyOn(api, "getTicket").mockResolvedValue(makeTicket());
    const updateSpy = vi.spyOn(api, "updateTicket").mockResolvedValue(
      makeTicket({
        priority: "LOW",
        assignedToId: 2,
        assignedTo: assignee,
      }),
    );

    renderDetail();
    await screen.findByRole("heading", { name: "VPN outage" });
    expect(screen.getByText("Unassigned")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Edit" }));
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "Priority" }),
      "LOW",
    );
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "Assignee" }),
      "2",
    );
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(updateSpy).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        priority: "LOW",
        assignedToId: 2,
      }),
    );
    expect(
      await screen.findByText("Alex Assignee", { selector: "dd" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Low")).toBeInTheDocument();
  });

  it("falls back to a user id when the reporter relation is missing", async () => {
    vi.spyOn(api, "getTicket").mockResolvedValue(
      makeTicket({ createdBy: undefined, createdById: 42 }),
    );

    renderDetail();

    expect(
      await screen.findByText("User #42", { selector: "dd" }),
    ).toBeInTheDocument();
  });

  it("shows a terminal message for CANCELLED tickets and no transition buttons", async () => {
    vi.spyOn(api, "getTicket").mockResolvedValue(
      makeTicket({
        status: "CANCELLED",
        allowedNextStatuses: [],
      }),
    );

    renderDetail();

    expect(
      await screen.findByText("This ticket is in a terminal state."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Move to/ }),
    ).not.toBeInTheDocument();
  });
});
