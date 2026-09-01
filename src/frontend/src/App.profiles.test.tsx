import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { api } from "./api/client";
import type { User } from "./types";

const alice: User = {
  id: 4,
  name: "Alice Nguyen",
  email: "alice@test.local",
  role: "AGENT",
  profilePhotoUrl: null,
};

describe("App profile routes", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(api, "listUsers").mockResolvedValue([alice]);
    vi.spyOn(api, "getUser").mockResolvedValue(alice);
    vi.spyOn(api, "listTickets").mockResolvedValue([]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("opens team profiles from the header Profiles link", async () => {
    render(
      <MemoryRouter initialEntries={["/tickets/new"]}>
        <App />
      </MemoryRouter>,
    );

    await userEvent.click(screen.getByRole("link", { name: "Profiles" }));

    expect(await screen.findByRole("heading", { name: "Team Profiles" })).toBeInTheDocument();
    expect(await screen.findByText("Alice Nguyen")).toBeInTheDocument();
  });

  it("treats /users/:id as a profile page, not a ticket", async () => {
    render(
      <MemoryRouter initialEntries={["/users/4"]}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByRole("heading", { name: "Alice Nguyen" })).toBeInTheDocument();
    expect(api.getUser).toHaveBeenCalledWith(4);
    expect(screen.queryByText("Tickets")).not.toBeInTheDocument();
  });
});
