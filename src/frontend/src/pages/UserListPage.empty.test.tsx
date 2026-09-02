import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import UserListPage from "./UserListPage";
import { api } from "../api/client";
import type { User } from "../types";

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 3,
    name: "Carol Ann",
    email: "carol@test.local",
    role: "ADMIN",
    profilePhotoUrl: null,
    ...overrides,
  };
}

describe("UserListPage empty, loading, and role contracts", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("shows a loading label while users are in flight", () => {
    vi.spyOn(api, "listUsers").mockImplementation(() => new Promise(() => {}));

    render(
      <MemoryRouter>
        <UserListPage />
      </MemoryRouter>,
    );

    expect(screen.getByText("Loading users...")).toBeInTheDocument();
  });

  it("renders the heading without profile links when the team is empty", async () => {
    vi.spyOn(api, "listUsers").mockResolvedValue([]);

    render(
      <MemoryRouter>
        <UserListPage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole("heading", { name: "Team Profiles" })).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByText("Edit photo")).not.toBeInTheDocument();
  });

  it("shows role and edit-photo affordance for each member", async () => {
    vi.spyOn(api, "listUsers").mockResolvedValue([makeUser()]);

    render(
      <MemoryRouter>
        <UserListPage />
      </MemoryRouter>,
    );

    const link = await screen.findByRole("link", { name: /Carol Ann/i });
    expect(link).toHaveAttribute("href", "/users/3");
    expect(link).toHaveTextContent("ADMIN");
    expect(link).toHaveTextContent("carol@test.local");
    expect(link).toHaveTextContent("Edit photo");
  });
});
