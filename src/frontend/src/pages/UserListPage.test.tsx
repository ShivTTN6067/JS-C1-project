import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import UserListPage from "./UserListPage";
import { api, ApiError } from "../api/client";
import type { User } from "../types";

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    name: "Alice Nguyen",
    email: "alice@test.local",
    role: "AGENT",
    profilePhotoUrl: null,
    ...overrides,
  };
}

describe("UserListPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders team members as links to their profile pages", async () => {
    vi.spyOn(api, "listUsers").mockResolvedValue([
      makeUser({ id: 1, name: "Alice Nguyen" }),
      makeUser({
        id: 2,
        name: "Bob Martinez",
        email: "bob@test.local",
        profilePhotoUrl: "/uploads/avatars/bob.jpg",
      }),
    ]);

    render(
      <MemoryRouter>
        <UserListPage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole("heading", { name: "Team Profiles" })).toBeInTheDocument();

    const alice = screen.getByRole("link", { name: /Alice Nguyen/i });
    expect(alice).toHaveAttribute("href", "/users/1");
    expect(alice).toHaveTextContent("AN");

    const bob = screen.getByRole("link", { name: /Bob Martinez/i });
    expect(bob).toHaveAttribute("href", "/users/2");
    expect(
      screen.getByRole("img", { name: "Bob Martinez's profile photo" }),
    ).toHaveAttribute("src", "/uploads/avatars/bob.jpg");
  });

  it("shows an error with retry when listing users fails", async () => {
    const listSpy = vi
      .spyOn(api, "listUsers")
      .mockRejectedValueOnce(new ApiError(500, "Users unavailable"))
      .mockResolvedValueOnce([makeUser()]);

    render(
      <MemoryRouter>
        <UserListPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Users unavailable")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByText("Alice Nguyen")).toBeInTheDocument();
    expect(listSpy).toHaveBeenCalledTimes(2);
  });

  it("falls back when the list error is not an ApiError", async () => {
    vi.spyOn(api, "listUsers").mockRejectedValue(new Error("network down"));

    render(
      <MemoryRouter>
        <UserListPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Failed to load users")).toBeInTheDocument();
  });
});
