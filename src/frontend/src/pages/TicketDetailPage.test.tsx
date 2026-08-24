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

  it("transitions status using the API and then shows the new allowed buttons", async () => {
    vi.spyOn(api, "getTicket").mockResolvedValue(makeTicket());
    const changeSpy = vi.spyOn(api, "changeStatus").mockResolvedValue(
      makeTicket({
        status: "IN_PROGRESS",
        allowedNextStatuses: ["RESOLVED", "CANCELLED"],
      }),
    );

    renderDetail();
    await userEvent.click(
      await screen.findByRole("button", { name: "Move to In Progress" }),
    );

    expect(changeSpy).toHaveBeenCalledWith(1, "IN_PROGRESS");
    expect(
      await screen.findByRole("button", { name: "Move to Resolved" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Move to In Progress" }),
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

  it("saves inline edits through the update API", async () => {
    vi.spyOn(api, "getTicket").mockResolvedValue(makeTicket());
    const updateSpy = vi.spyOn(api, "updateTicket").mockResolvedValue(
      makeTicket({ title: "Renamed ticket" }),
    );

    renderDetail();
    await userEvent.click(await screen.findByRole("button", { name: "Edit" }));

    const titleInput = screen.getByDisplayValue("Sample ticket");
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, "Renamed ticket");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(updateSpy).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ title: "Renamed ticket" }),
    );
    expect(await screen.findByText("Renamed ticket")).toBeInTheDocument();
  });

  it("submits a comment with the selected author", async () => {
    vi.spyOn(api, "getTicket").mockResolvedValue(makeTicket());
    const addSpy = vi.spyOn(api, "addComment").mockResolvedValue({
      id: 10,
      ticketId: 1,
      message: "Investigating",
      createdById: 1,
      createdAt: new Date().toISOString(),
      createdBy: reporter,
    });

    renderDetail();
    await userEvent.type(
      await screen.findByPlaceholderText("Add a comment..."),
      "  Investigating  ",
    );
    await userEvent.click(screen.getByRole("button", { name: "Comment" }));

    expect(addSpy).toHaveBeenCalledWith(1, {
      message: "Investigating",
      createdById: 1,
    });
  });

  it("shows an error when the ticket cannot be loaded", async () => {
    vi.spyOn(api, "getTicket").mockRejectedValue(
      new ApiError(404, "Ticket 1 not found"),
    );

    renderDetail();

    expect(await screen.findByText("Ticket 1 not found")).toBeInTheDocument();
  });
});
