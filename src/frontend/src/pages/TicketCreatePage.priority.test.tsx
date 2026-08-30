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

describe("TicketCreatePage priority, reporter, and fallbacks", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(api, "listUsers").mockResolvedValue(users);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("submits the selected HIGH priority and a non-default reporter", async () => {
    const createSpy = vi.spyOn(api, "createTicket").mockResolvedValue({
      id: 9,
      title: "Sev1 outage",
      description: "Payments are down",
      priority: "HIGH",
      status: "OPEN",
      createdById: 2,
      assignedToId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as Ticket);

    renderCreate();
    const reporter = await screen.findByRole("combobox", { name: "Reporter" });
    await waitFor(() => expect(reporter).toHaveValue("1"));

    await userEvent.type(
      screen.getByPlaceholderText("Short summary of the issue"),
      "Sev1 outage",
    );
    await userEvent.type(
      screen.getByPlaceholderText("Describe the problem in detail"),
      "Payments are down",
    );
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "Priority" }),
      "HIGH",
    );
    await userEvent.selectOptions(reporter, "2");
    await userEvent.click(screen.getByRole("button", { name: "Create Ticket" }));

    expect(createSpy).toHaveBeenCalledWith({
      title: "Sev1 outage",
      description: "Payments are down",
      priority: "HIGH",
      createdById: 2,
      assignedToId: null,
    });
    expect(await screen.findByText("Created ticket")).toBeInTheDocument();
  });

  it("shows the generic fallback when create rejects a non-ApiError", async () => {
    vi.spyOn(api, "createTicket").mockRejectedValue(new Error("network down"));

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

    expect(await screen.findByText("Failed to create ticket")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
  });
});
