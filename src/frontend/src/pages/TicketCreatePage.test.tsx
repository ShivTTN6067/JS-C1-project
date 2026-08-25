import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TicketCreatePage from "./TicketCreatePage";
import { api, ApiError } from "../api/client";
import type { Ticket, User } from "../types";

const users: User[] = [
  { id: 1, name: "Alice", email: "alice@test.local", role: "AGENT" },
  { id: 2, name: "Bob", email: "bob@test.local", role: "AGENT" },
];

function makeCreatedTicket(): Ticket {
  return {
    id: 7,
    title: "Broken login",
    description: "Users cannot sign in",
    priority: "HIGH",
    status: "OPEN",
    createdById: 1,
    assignedToId: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function renderCreate() {
  return render(
    <MemoryRouter initialEntries={["/tickets/new"]}>
      <Routes>
        <Route path="/tickets/new" element={<TicketCreatePage />} />
        <Route path="/tickets/:id" element={<div>Created ticket 7</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("TicketCreatePage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("shows an error when the users list cannot be loaded", async () => {
    vi.spyOn(api, "listUsers").mockRejectedValue(
      new ApiError(500, "Failed to load users"),
    );

    renderCreate();

    expect(await screen.findByText("Failed to load users")).toBeInTheDocument();
  });

  it("blocks submit when required fields are blank", async () => {
    vi.spyOn(api, "listUsers").mockResolvedValue(users);
    const createSpy = vi.spyOn(api, "createTicket");

    renderCreate();
    const reporter = await screen.findByRole("combobox", { name: "Reporter" });
    await waitFor(() => expect(reporter).toHaveValue("1"));
    await userEvent.click(screen.getByRole("button", { name: "Create Ticket" }));

    expect(await screen.findByText("Title is required")).toBeInTheDocument();
    expect(screen.getByText("Description is required")).toBeInTheDocument();
    expect(createSpy).not.toHaveBeenCalled();
  });

  it("trims fields, includes the selected assignee, and navigates on success", async () => {
    vi.spyOn(api, "listUsers").mockResolvedValue(users);
    const createSpy = vi
      .spyOn(api, "createTicket")
      .mockResolvedValue(makeCreatedTicket());

    renderCreate();
    const reporter = await screen.findByRole("combobox", { name: "Reporter" });
    await waitFor(() => expect(reporter).toHaveValue("1"));

    await userEvent.type(
      screen.getByPlaceholderText("Short summary of the issue"),
      "  Broken login  ",
    );
    await userEvent.type(
      screen.getByPlaceholderText("Describe the problem in detail"),
      "  Users cannot sign in  ",
    );
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "Priority" }),
      "HIGH",
    );
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "Assignee (optional)" }),
      "2",
    );
    await userEvent.click(screen.getByRole("button", { name: "Create Ticket" }));

    expect(createSpy).toHaveBeenCalledWith({
      title: "Broken login",
      description: "Users cannot sign in",
      priority: "HIGH",
      createdById: 1,
      assignedToId: 2,
    });
    expect(await screen.findByText("Created ticket 7")).toBeInTheDocument();
  });

  it("shows the API error when create fails", async () => {
    vi.spyOn(api, "listUsers").mockResolvedValue(users);
    vi.spyOn(api, "createTicket").mockRejectedValue(
      new ApiError(400, "createdById references a non-existent user (id=1)"),
    );

    renderCreate();
    await waitFor(() =>
      expect(screen.getByRole("combobox", { name: "Reporter" })).toHaveValue("1"),
    );
    await userEvent.type(
      screen.getByPlaceholderText("Short summary of the issue"),
      "Broken login",
    );
    await userEvent.type(
      screen.getByPlaceholderText("Describe the problem in detail"),
      "Users cannot sign in",
    );
    await userEvent.click(screen.getByRole("button", { name: "Create Ticket" }));

    expect(
      await screen.findByText("createdById references a non-existent user (id=1)"),
    ).toBeInTheDocument();
  });
});
