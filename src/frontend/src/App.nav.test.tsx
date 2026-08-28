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

describe("App navigation", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(api, "listTickets").mockResolvedValue([]);
    vi.spyOn(api, "listUsers").mockResolvedValue([reporter]);
    vi.spyOn(api, "getTicket").mockRejectedValue(new Error("should not load detail"));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("opens the create page from the header New Ticket link", async () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByRole("heading", { name: "Tickets" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("link", { name: "New Ticket" }));

    expect(
      await screen.findByRole("heading", { name: "New Ticket" }),
    ).toBeInTheDocument();
    expect(api.getTicket).not.toHaveBeenCalled();
  });
});
