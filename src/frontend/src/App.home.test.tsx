import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { api } from "./api/client";
import type { User } from "./types";

const reporter: User = {
  id: 1,
  name: "Reporter",
  email: "reporter@test.local",
  role: "AGENT",
};

describe("App home navigation", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(api, "listTickets").mockResolvedValue([]);
    vi.spyOn(api, "listUsers").mockResolvedValue([reporter]);
    vi.spyOn(api, "getTicket").mockRejectedValue(
      new Error("should not load detail"),
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns to the ticket list from the header brand link", async () => {
    render(
      <MemoryRouter initialEntries={["/tickets/new"]}>
        <App />
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole("heading", { name: "New Ticket" }),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("link", { name: /Support Tickets/ }));

    expect(
      await screen.findByRole("heading", { name: "Tickets" }),
    ).toBeInTheDocument();
    expect(api.getTicket).not.toHaveBeenCalled();
  });
});
