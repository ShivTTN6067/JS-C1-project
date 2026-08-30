import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TicketDetailPage from "./TicketDetailPage";
import { api } from "../api/client";
import type { Ticket, User } from "../types";

const users: User[] = [
  { id: 1, name: "Alice", email: "alice@test.local", role: "AGENT" },
  { id: 2, name: "Bob", email: "bob@test.local", role: "AGENT" },
];

function makeTicket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: 4,
    title: "Login bug",
    description: "Users cannot sign in",
    priority: "MEDIUM",
    status: "OPEN",
    createdById: 1,
    assignedToId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: users[0],
    assignedTo: null,
    comments: [],
    allowedNextStatuses: ["IN_PROGRESS", "CANCELLED"],
    ...overrides,
  };
}

function renderDetail() {
  return render(
    <MemoryRouter initialEntries={["/tickets/4"]}>
      <Routes>
        <Route path="/tickets/:id" element={<TicketDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("TicketDetailPage fallbacks and comment author", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("shows the generic fallback when getTicket rejects a non-ApiError", async () => {
    vi.spyOn(api, "getTicket").mockRejectedValue(new Error("boom"));
    vi.spyOn(api, "listUsers").mockResolvedValue(users);

    renderDetail();

    expect(await screen.findByText("Failed to load ticket")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("shows the generic fallback when a status change rejects a non-ApiError", async () => {
    vi.spyOn(api, "getTicket").mockResolvedValue(makeTicket());
    vi.spyOn(api, "listUsers").mockResolvedValue(users);
    vi.spyOn(api, "changeStatus").mockRejectedValue(new Error("timeout"));

    renderDetail();
    expect(await screen.findByText("Login bug")).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "Move to In Progress" }),
    );

    expect(await screen.findByText("Failed to change status")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
  });

  it("posts a comment as the user selected in the author dropdown", async () => {
    vi.spyOn(api, "getTicket").mockResolvedValue(makeTicket());
    vi.spyOn(api, "listUsers").mockResolvedValue(users);
    const commentSpy = vi.spyOn(api, "addComment").mockResolvedValue({
      id: 11,
      ticketId: 4,
      message: "I can take this",
      createdById: 2,
      createdAt: new Date().toISOString(),
    });

    renderDetail();
    const author = await screen.findByDisplayValue("Alice");
    await waitFor(() => expect(author).toHaveValue("1"));

    await userEvent.selectOptions(author, "2");
    await userEvent.type(
      screen.getByPlaceholderText("Add a comment..."),
      "I can take this",
    );
    await userEvent.click(screen.getByRole("button", { name: "Comment" }));

    expect(commentSpy).toHaveBeenCalledWith(4, {
      message: "I can take this",
      createdById: 2,
    });
  });
});
