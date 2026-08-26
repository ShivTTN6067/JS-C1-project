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

const assignee: User = {
  id: 2,
  name: "Alice",
  email: "alice@test.local",
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
    assignedToId: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: reporter,
    assignedTo: assignee,
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
    vi.spyOn(api, "listUsers").mockResolvedValue([reporter, assignee]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("retries loading after a ticket fetch failure", async () => {
    const getSpy = vi
      .spyOn(api, "getTicket")
      .mockRejectedValueOnce(new ApiError(404, "Ticket 1 not found"))
      .mockResolvedValueOnce(makeTicket());

    renderDetail();

    expect(await screen.findByText("Ticket 1 not found")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByText("Sample ticket")).toBeInTheDocument();
    expect(getSpy).toHaveBeenCalledTimes(2);
  });

  it("shows the API error when saving edits fails", async () => {
    vi.spyOn(api, "getTicket").mockResolvedValue(makeTicket());
    vi.spyOn(api, "updateTicket").mockRejectedValue(
      new ApiError(400, "Validation failed"),
    );

    renderDetail();
    await userEvent.click(await screen.findByRole("button", { name: "Edit" }));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Validation failed")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("unassigns the ticket when the assignee is cleared", async () => {
    vi.spyOn(api, "getTicket").mockResolvedValue(makeTicket());
    const updateSpy = vi.spyOn(api, "updateTicket").mockResolvedValue(
      makeTicket({ assignedToId: null, assignedTo: null }),
    );

    renderDetail();
    expect(
      await screen.findByRole("heading", { name: "Sample ticket" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Alice", { selector: "dd" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Edit" }));
    await userEvent.selectOptions(screen.getByLabelText("Assignee"), "");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(updateSpy).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ assignedToId: null }),
    );
    expect(
      await screen.findByText("Unassigned", { selector: "dd" }),
    ).toBeInTheDocument();
  });

  it("shows the API error when adding a comment fails", async () => {
    vi.spyOn(api, "getTicket").mockResolvedValue(makeTicket());
    vi.spyOn(api, "addComment").mockRejectedValue(
      new ApiError(400, "Comment message is required"),
    );

    renderDetail();
    await userEvent.type(
      await screen.findByPlaceholderText("Add a comment..."),
      "Looks broken",
    );
    await userEvent.click(screen.getByRole("button", { name: "Comment" }));

    expect(
      await screen.findByText("Comment message is required"),
    ).toBeInTheDocument();
  });
});
