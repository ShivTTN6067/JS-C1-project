import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TicketDetailPage from "./TicketDetailPage";
import { api } from "../api/client";
import type { Comment, Ticket, User } from "../types";

const reporter: User = {
  id: 1,
  name: "Riley Reporter",
  email: "riley@test.local",
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

describe("TicketDetailPage comments and identity", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(api, "listUsers").mockResolvedValue([reporter]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("shows the reporter, empty comments, and a disabled comment button", async () => {
    vi.spyOn(api, "getTicket").mockResolvedValue(makeTicket());

    renderDetail();

    expect(
      await screen.findByRole("heading", { name: "Sample ticket" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Riley Reporter", { selector: "dd" }),
    ).toBeInTheDocument();
    expect(screen.getByText("No comments yet.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Comment" })).toBeDisabled();
  });

  it("falls back to a user id when a comment has no author relation", async () => {
    const orphan: Comment = {
      id: 9,
      ticketId: 1,
      message: "Logged from an old client",
      createdById: 99,
      createdAt: new Date().toISOString(),
    };
    vi.spyOn(api, "getTicket").mockResolvedValue(
      makeTicket({ comments: [orphan] }),
    );

    renderDetail();

    expect(await screen.findByText("User #99")).toBeInTheDocument();
    expect(screen.getByText("Logged from an old client")).toBeInTheDocument();
    expect(screen.queryByText("No comments yet.")).not.toBeInTheDocument();
  });

  it("clears the comment box and reloads the ticket after a successful comment", async () => {
    const posted: Comment = {
      id: 10,
      ticketId: 1,
      message: "Investigating",
      createdById: 1,
      createdAt: new Date().toISOString(),
      createdBy: reporter,
    };
    const getSpy = vi
      .spyOn(api, "getTicket")
      .mockResolvedValueOnce(makeTicket())
      .mockResolvedValueOnce(makeTicket({ comments: [posted] }));
    vi.spyOn(api, "addComment").mockResolvedValue(posted);

    renderDetail();
    const box = await screen.findByPlaceholderText("Add a comment...");
    await userEvent.type(box, "Investigating");
    await userEvent.click(screen.getByRole("button", { name: "Comment" }));

    expect(await screen.findByText("Investigating")).toBeInTheDocument();
    expect(getSpy).toHaveBeenCalledTimes(2);
    expect(screen.getByPlaceholderText("Add a comment...")).toHaveValue("");
  });
});
