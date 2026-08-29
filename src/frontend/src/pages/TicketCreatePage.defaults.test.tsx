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
        <Route path="/" element={<div>Ticket list</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("TicketCreatePage defaults and submit lock", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("submits MEDIUM priority and a null assignee when those fields are left at defaults", async () => {
    vi.spyOn(api, "listUsers").mockResolvedValue(users);
    const createSpy = vi.spyOn(api, "createTicket").mockResolvedValue({
      id: 8,
      title: "Broken login",
      description: "Users cannot sign in",
      priority: "MEDIUM",
      status: "OPEN",
      createdById: 1,
      assignedToId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as Ticket);

    renderCreate();
    const reporter = await screen.findByRole("combobox", { name: "Reporter" });
    await waitFor(() => expect(reporter).toHaveValue("1"));

    await userEvent.type(
      screen.getByPlaceholderText("Short summary of the issue"),
      "Broken login",
    );
    await userEvent.type(
      screen.getByPlaceholderText("Describe the problem in detail"),
      "Users cannot sign in",
    );
    await userEvent.click(screen.getByRole("button", { name: "Create Ticket" }));

    expect(createSpy).toHaveBeenCalledWith({
      title: "Broken login",
      description: "Users cannot sign in",
      priority: "MEDIUM",
      createdById: 1,
      assignedToId: null,
    });
    expect(await screen.findByText("Created ticket")).toBeInTheDocument();
  });

  it("links Back to tickets without creating a ticket", async () => {
    vi.spyOn(api, "listUsers").mockResolvedValue(users);
    const createSpy = vi.spyOn(api, "createTicket");

    renderCreate();
    await screen.findByRole("combobox", { name: "Reporter" });

    await userEvent.click(screen.getByRole("link", { name: /Back to tickets/ }));

    expect(await screen.findByText("Ticket list")).toBeInTheDocument();
    expect(createSpy).not.toHaveBeenCalled();
  });

  it("disables submit and shows Creating... while the create request is in flight", async () => {
    vi.spyOn(api, "listUsers").mockResolvedValue(users);
    vi.spyOn(api, "createTicket").mockReturnValue(new Promise(() => {}));

    renderCreate();
    const reporter = await screen.findByRole("combobox", { name: "Reporter" });
    await waitFor(() => expect(reporter).toHaveValue("1"));

    await userEvent.type(
      screen.getByPlaceholderText("Short summary of the issue"),
      "Broken login",
    );
    await userEvent.type(
      screen.getByPlaceholderText("Describe the problem in detail"),
      "Users cannot sign in",
    );
    await userEvent.click(screen.getByRole("button", { name: "Create Ticket" }));

    expect(screen.getByRole("button", { name: "Creating..." })).toBeDisabled();
  });
});
