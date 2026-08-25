import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TicketDetailPage from "./TicketDetailPage";
import { api, ApiError } from "../api/client";
import type { Ticket, User } from "../types";

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

function renderDetail(path = "/tickets/1") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/tickets/:id" element={<TicketDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("TicketDetailPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(api, "listUsers").mockResolvedValue([reporter]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders only the allowed next-status buttons from the API", async () => {
    vi.spyOn(api, "getTicket").mockResolvedValue(makeTicket());

    renderDetail();

    expect(
      await screen.findByRole("button", { name: "Move to In Progress" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Move to Cancelled" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Move to Closed" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Move to Resolved" }),
    ).not.toBeInTheDocument();
  });

  it("shows a terminal message and no transition buttons for CLOSED tickets", async () => {
    vi.spyOn(api, "getTicket").mockResolvedValue(
      makeTicket({ status: "CLOSED", allowedNextStatuses: [] }),
    );

    renderDetail();

    expect(
      await screen.findByText("This ticket is in a terminal state."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Move to/ })).not.toBeInTheDocument();
  });

  it("shows the API error when a status transition is rejected", async () => {
    vi.spyOn(api, "getTicket").mockResolvedValue(makeTicket());
    vi.spyOn(api, "changeStatus").mockRejectedValue(
      new ApiError(400, "Cannot change status from OPEN to IN_PROGRESS"),
    );

    renderDetail();
    await userEvent.click(
      await screen.findByRole("button", { name: "Move to In Progress" }),
    );

    expect(
      await screen.findByText("Cannot change status from OPEN to IN_PROGRESS"),
    ).toBeInTheDocument();
  });

  it("does not submit a blank comment", async () => {
    vi.spyOn(api, "getTicket").mockResolvedValue(makeTicket());
    const addSpy = vi.spyOn(api, "addComment");

    renderDetail();
    const commentBox = await screen.findByPlaceholderText("Add a comment...");
    await userEvent.type(commentBox, "   ");

    expect(screen.getByRole("button", { name: "Comment" })).toBeDisabled();
    expect(addSpy).not.toHaveBeenCalled();
  });

  it("cancels inline edits without calling the update API", async () => {
    vi.spyOn(api, "getTicket").mockResolvedValue(makeTicket());
    const updateSpy = vi.spyOn(api, "updateTicket");

    renderDetail();
    await userEvent.click(await screen.findByRole("button", { name: "Edit" }));

    const titleInput = screen.getByDisplayValue("Sample ticket");
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, "Should not persist");
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(updateSpy).not.toHaveBeenCalled();
    expect(screen.getByText("Sample ticket")).toBeInTheDocument();
    expect(screen.queryByDisplayValue("Should not persist")).not.toBeInTheDocument();
  });

  it("shows an error when the ticket cannot be loaded", async () => {
    vi.spyOn(api, "getTicket").mockRejectedValue(
      new ApiError(404, "Ticket 1 not found"),
    );

    renderDetail();

    expect(await screen.findByText("Ticket 1 not found")).toBeInTheDocument();
  });
});
