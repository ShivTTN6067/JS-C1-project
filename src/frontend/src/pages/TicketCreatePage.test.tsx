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

function makeCreatedTicket(): Ticket {
  return {
    id: 7,
    title: "Broken login",
    description: "Users cannot sign in",
    priority: "MEDIUM",
    status: "OPEN",
    createdById: 1,
    assignedToId: null,
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
    vi.spyOn(api, "listUsers").mockResolvedValue(users);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("blocks submit and shows field errors when required fields are blank", async () => {
    const createSpy = vi.spyOn(api, "createTicket");

    renderCreate();
    const reporter = await screen.findByRole("combobox", { name: "Reporter" });
    await waitFor(() => expect(reporter).toHaveValue("1"));
    await userEvent.click(screen.getByRole("button", { name: "Create Ticket" }));

    expect(await screen.findByText("Title is required")).toBeInTheDocument();
    expect(screen.getByText("Description is required")).toBeInTheDocument();
    expect(createSpy).not.toHaveBeenCalled();
  });

  it("trims fields, posts the ticket, and navigates to the new detail page", async () => {
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
    await userEvent.click(screen.getByRole("button", { name: "Create Ticket" }));

    expect(createSpy).toHaveBeenCalledWith({
      title: "Broken login",
      description: "Users cannot sign in",
      priority: "MEDIUM",
      createdById: 1,
      assignedToId: null,
    });
    expect(await screen.findByText("Created ticket 7")).toBeInTheDocument();
  });
});
