import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TicketCreatePage from "./TicketCreatePage";
import { api } from "../api/client";
import type { User } from "../types";

const users: User[] = [
  { id: 1, name: "Alice", email: "alice@test.local", role: "AGENT" },
];

function renderCreate() {
  return render(
    <MemoryRouter initialEntries={["/tickets/new"]}>
      <Routes>
        <Route path="/tickets/new" element={<TicketCreatePage />} />
        <Route path="/" element={<div>Ticket list</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("TicketCreatePage field validation", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("blocks submit when description is blank even if title and reporter are set", async () => {
    vi.spyOn(api, "listUsers").mockResolvedValue(users);
    const createSpy = vi.spyOn(api, "createTicket");

    renderCreate();
    const reporter = await screen.findByRole("combobox", { name: "Reporter" });
    await waitFor(() => expect(reporter).toHaveValue("1"));

    await userEvent.type(
      screen.getByPlaceholderText("Short summary of the issue"),
      "Broken login",
    );
    await userEvent.click(screen.getByRole("button", { name: "Create Ticket" }));

    expect(await screen.findByText("Description is required")).toBeInTheDocument();
    expect(screen.queryByText("Title is required")).not.toBeInTheDocument();
    expect(createSpy).not.toHaveBeenCalled();
  });

  it("links Cancel back to the ticket list without creating a ticket", async () => {
    vi.spyOn(api, "listUsers").mockResolvedValue(users);
    const createSpy = vi.spyOn(api, "createTicket");

    renderCreate();
    await screen.findByRole("combobox", { name: "Reporter" });

    await userEvent.click(screen.getByRole("link", { name: "Cancel" }));

    expect(await screen.findByText("Ticket list")).toBeInTheDocument();
    expect(createSpy).not.toHaveBeenCalled();
  });
});
