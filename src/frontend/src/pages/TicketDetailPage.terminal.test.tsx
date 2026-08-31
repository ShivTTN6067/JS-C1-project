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
    id: 7,
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
    <MemoryRouter initialEntries={["/tickets/7"]}>
      <Routes>
        <Route path="/tickets/:id" element={<TicketDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("TicketDetailPage terminal edit, trim, and comment lock", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("still allows editing a CLOSED ticket even though status is terminal", async () => {
    vi.spyOn(api, "getTicket").mockResolvedValue(
      makeTicket({
        status: "CLOSED",
        allowedNextStatuses: [],
      }),
    );
    vi.spyOn(api, "listUsers").mockResolvedValue(users);

    renderDetail();

    expect(
      await screen.findByText("This ticket is in a terminal state."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Move to/ }),
    ).not.toBeInTheDocument();
  });

  it("trims title and description before saving edits", async () => {
    vi.spyOn(api, "getTicket").mockResolvedValue(makeTicket());
    vi.spyOn(api, "listUsers").mockResolvedValue(users);
    const updateSpy = vi.spyOn(api, "updateTicket").mockResolvedValue(
      makeTicket({ title: "Trimmed title", description: "Trimmed body" }),
    );

    renderDetail();
    await screen.findByRole("heading", { name: "Login bug" });
    await userEvent.click(screen.getByRole("button", { name: "Edit" }));

    const titleInput = screen.getByDisplayValue("Login bug");
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, "  Trimmed title  ");

    const descriptionInput = screen.getByDisplayValue("Users cannot sign in");
    await userEvent.clear(descriptionInput);
    await userEvent.type(descriptionInput, "  Trimmed body  ");

    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(updateSpy).toHaveBeenCalledWith(
      7,
      expect.objectContaining({
        title: "Trimmed title",
        description: "Trimmed body",
      }),
    );
  });

  it("does not post a whitespace-only comment", async () => {
    vi.spyOn(api, "getTicket").mockResolvedValue(makeTicket());
    vi.spyOn(api, "listUsers").mockResolvedValue(users);
    const commentSpy = vi.spyOn(api, "addComment");

    renderDetail();
    await screen.findByRole("heading", { name: "Login bug" });

    const commentBox = screen.getByPlaceholderText("Add a comment...");
    await userEvent.type(commentBox, "   ");

    expect(screen.getByRole("button", { name: "Comment" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Comment" }));
    expect(commentSpy).not.toHaveBeenCalled();
  });

  it("keeps the selected comment author after a successful post reloads the ticket", async () => {
    vi.spyOn(api, "getTicket").mockResolvedValue(makeTicket());
    vi.spyOn(api, "listUsers").mockResolvedValue(users);
    vi.spyOn(api, "addComment").mockResolvedValue({
      id: 3,
      ticketId: 7,
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

    await waitFor(() => expect(api.getTicket).toHaveBeenCalledTimes(2));
    expect(screen.getByDisplayValue("Bob")).toHaveValue("2");
  });
});
