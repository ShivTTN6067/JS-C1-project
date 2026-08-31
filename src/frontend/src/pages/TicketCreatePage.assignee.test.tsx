import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TicketCreatePage from "./TicketCreatePage";
import { api } from "../api/client";
import type { Ticket, User } from "../types";

const users: User[] = [
  { id: 1, name: "Alice", email: "alice@test.local", role: "AGENT" },
  { id: 2, name: "Bob", email: "bob@test.local", role: "AGENT" },
];

function renderCreate() {
  return render(
    <MemoryRouter initialEntries={["/tickets/new"]}>
      <Routes>
        <Route path="/tickets/new" element={<TicketCreatePage />} />
        <Route path="/tickets/:id" element={<div>Created ticket</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("TicketCreatePage assignee, LOW priority, and title validation", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("submits LOW priority and the selected assignee", async () => {
    vi.spyOn(api, "listUsers").mockResolvedValue(users);
    const createSpy = vi.spyOn(api, "createTicket").mockResolvedValue({
      id: 12,
      title: "Printer jam",
      description: "Queue is stuck",
      priority: "LOW",
      status: "OPEN",
      createdById: 1,
      assignedToId: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as Ticket);

    renderCreate();
    const reporter = await screen.findByRole("combobox", { name: "Reporter" });
    await waitFor(() => expect(reporter).toHaveValue("1"));

    await userEvent.type(
      screen.getByPlaceholderText("Short summary of the issue"),
      "Printer jam",
    );
    await userEvent.type(
      screen.getByPlaceholderText("Describe the problem in detail"),
      "Queue is stuck",
    );
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "Priority" }),
      "LOW",
    );
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "Assignee (optional)" }),
      "2",
    );
    await userEvent.click(screen.getByRole("button", { name: "Create Ticket" }));

    expect(createSpy).toHaveBeenCalledWith({
      title: "Printer jam",
      description: "Queue is stuck",
      priority: "LOW",
      createdById: 1,
      assignedToId: 2,
    });
    expect(await screen.findByText("Created ticket")).toBeInTheDocument();
  });

  it("blocks submit when title is blank even if description and reporter are set", async () => {
    vi.spyOn(api, "listUsers").mockResolvedValue(users);
    const createSpy = vi.spyOn(api, "createTicket");

    renderCreate();
    const reporter = await screen.findByRole("combobox", { name: "Reporter" });
    await waitFor(() => expect(reporter).toHaveValue("1"));

    await userEvent.type(
      screen.getByPlaceholderText("Describe the problem in detail"),
      "Users cannot sign in",
    );
    await userEvent.click(screen.getByRole("button", { name: "Create Ticket" }));

    expect(await screen.findByText("Title is required")).toBeInTheDocument();
    expect(screen.queryByText("Description is required")).not.toBeInTheDocument();
    expect(createSpy).not.toHaveBeenCalled();
  });

  it("requires a reporter when the users list is empty", async () => {
    vi.spyOn(api, "listUsers").mockResolvedValue([]);
    const createSpy = vi.spyOn(api, "createTicket");

    renderCreate();
    await screen.findByRole("combobox", { name: "Reporter" });

    await userEvent.type(
      screen.getByPlaceholderText("Short summary of the issue"),
      "Broken login",
    );
    await userEvent.type(
      screen.getByPlaceholderText("Describe the problem in detail"),
      "Users cannot sign in",
    );
    await userEvent.click(screen.getByRole("button", { name: "Create Ticket" }));

    expect(await screen.findByText("Reporter is required")).toBeInTheDocument();
    expect(createSpy).not.toHaveBeenCalled();
  });
});
