import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import UserProfilePage from "./UserProfilePage";
import { api, ApiError } from "../api/client";
import type { User } from "../types";

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 8,
    name: "Dana Patel",
    email: "dana@test.local",
    role: "ADMIN",
    profilePhotoUrl: null,
    ...overrides,
  };
}

function renderProfile(id = 8) {
  return render(
    <MemoryRouter initialEntries={[`/users/${id}`]}>
      <Routes>
        <Route path="/users/:id" element={<UserProfilePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("UserProfilePage contracts", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    if (!URL.createObjectURL) {
      Object.defineProperty(URL, "createObjectURL", {
        configurable: true,
        value: () => "blob:preview",
      });
    }
    if (!URL.revokeObjectURL) {
      Object.defineProperty(URL, "revokeObjectURL", {
        configurable: true,
        value: () => {},
      });
    }
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:preview");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("shows a loading label while the profile is in flight", () => {
    vi.spyOn(api, "getUser").mockImplementation(() => new Promise(() => {}));

    renderProfile();

    expect(screen.getByText("Loading profile...")).toBeInTheDocument();
  });

  it("renders role, help text, and a restricted file input", async () => {
    vi.spyOn(api, "getUser").mockResolvedValue(makeUser());

    renderProfile();

    expect(await screen.findByRole("heading", { name: "Dana Patel" })).toBeInTheDocument();
    expect(screen.getByText("ADMIN")).toBeInTheDocument();
    expect(screen.getByText(/JPEG, PNG, or WebP up to 2 MB/i)).toBeInTheDocument();

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toHaveAttribute("accept", "image/jpeg,image/png,image/webp");
    expect(input).toHaveClass("hidden");
  });

  it("falls back when load fails with a non-ApiError", async () => {
    vi.spyOn(api, "getUser").mockRejectedValue(new Error("network down"));

    renderProfile();

    expect(await screen.findByText("Failed to load user")).toBeInTheDocument();
  });

  it("falls back when upload fails with a non-ApiError", async () => {
    vi.spyOn(api, "getUser").mockResolvedValue(makeUser());
    vi.spyOn(api, "uploadProfilePhoto").mockRejectedValue(new Error("offline"));

    renderProfile();
    await screen.findByRole("button", { name: "Upload photo" });

    const file = new File(["x"], "avatar.png", { type: "image/png" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, file);

    expect(await screen.findByText("Failed to upload profile photo")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Upload photo" })).toBeEnabled();
  });

  it("replaces an existing photo without leaving the replace/remove controls", async () => {
    vi.spyOn(api, "getUser").mockResolvedValue(
      makeUser({ profilePhotoUrl: "/uploads/avatars/old.png" }),
    );
    const uploadSpy = vi.spyOn(api, "uploadProfilePhoto").mockResolvedValue(
      makeUser({ profilePhotoUrl: "/uploads/avatars/new.png" }),
    );

    renderProfile();
    await screen.findByRole("button", { name: "Replace photo" });

    const file = new File(["png"], "next.png", { type: "image/png" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, file);

    await waitFor(() => {
      expect(uploadSpy).toHaveBeenCalledWith(8, file);
    });
    expect(
      await screen.findByRole("img", { name: "Dana Patel's profile photo" }),
    ).toHaveAttribute("src", "/uploads/avatars/new.png");
    expect(screen.getByRole("button", { name: "Replace photo" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove photo" })).toBeInTheDocument();
  });

  it("disables replace and remove while a delete is in flight", async () => {
    vi.spyOn(api, "getUser").mockResolvedValue(
      makeUser({ profilePhotoUrl: "/uploads/avatars/current.png" }),
    );
    let finishDelete!: (user: User) => void;
    vi.spyOn(api, "deleteProfilePhoto").mockImplementation(
      () =>
        new Promise((resolve) => {
          finishDelete = resolve;
        }),
    );

    renderProfile();
    await userEvent.click(await screen.findByRole("button", { name: "Remove photo" }));

    expect(await screen.findByRole("button", { name: "Uploading..." })).toBeDisabled();

    finishDelete(makeUser({ profilePhotoUrl: null }));
    expect(await screen.findByRole("button", { name: "Upload photo" })).toBeEnabled();
  });

  it("loads the user id from the route params", async () => {
    const getSpy = vi.spyOn(api, "getUser").mockResolvedValue(makeUser({ id: 12 }));

    renderProfile(12);

    await screen.findByRole("heading", { name: "Dana Patel" });
    expect(getSpy).toHaveBeenCalledWith(12);
  });
});
