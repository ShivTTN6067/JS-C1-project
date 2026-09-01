import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import UserProfilePage from "./UserProfilePage";
import { api, ApiError } from "../api/client";
import type { User } from "../types";

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 4,
    name: "Alice Nguyen",
    email: "alice@test.local",
    role: "AGENT",
    profilePhotoUrl: null,
    ...overrides,
  };
}

function renderProfile(id = 4) {
  return render(
    <MemoryRouter initialEntries={[`/users/${id}`]}>
      <Routes>
        <Route path="/users/:id" element={<UserProfilePage />} />
        <Route path="/users" element={<div>team list</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("UserProfilePage", () => {
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

  it("loads the user and offers upload when no photo is set", async () => {
    vi.spyOn(api, "getUser").mockResolvedValue(makeUser());

    renderProfile();

    expect(await screen.findByRole("heading", { name: "Alice Nguyen" })).toBeInTheDocument();
    expect(screen.getByText("alice@test.local")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Upload photo" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove photo" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Back to team profiles/i })).toHaveAttribute(
      "href",
      "/users",
    );
  });

  it("retries after a load error", async () => {
    const getSpy = vi
      .spyOn(api, "getUser")
      .mockRejectedValueOnce(new ApiError(404, "User not found (id=4)"))
      .mockResolvedValueOnce(makeUser());

    renderProfile();

    expect(await screen.findByText("User not found (id=4)")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("heading", { name: "Alice Nguyen" })).toBeInTheDocument();
    expect(getSpy).toHaveBeenCalledTimes(2);
  });

  it("uploads a file and switches to replace/remove controls", async () => {
    vi.spyOn(api, "getUser").mockResolvedValue(makeUser());
    const uploadSpy = vi.spyOn(api, "uploadProfilePhoto").mockResolvedValue(
      makeUser({ profilePhotoUrl: "/uploads/avatars/user-4.png" }),
    );

    renderProfile();
    await screen.findByRole("button", { name: "Upload photo" });

    const file = new File(["png-bytes"], "avatar.png", { type: "image/png" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, file);

    await waitFor(() => {
      expect(uploadSpy).toHaveBeenCalledWith(4, file);
    });
    expect(
      await screen.findByRole("img", { name: "Alice Nguyen's profile photo" }),
    ).toHaveAttribute("src", "/uploads/avatars/user-4.png");
    expect(screen.getByRole("button", { name: "Replace photo" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove photo" })).toBeInTheDocument();
  });

  it("shows the server message when upload fails", async () => {
    vi.spyOn(api, "getUser").mockResolvedValue(makeUser());
    vi.spyOn(api, "uploadProfilePhoto").mockRejectedValue(
      new ApiError(400, "Profile photo must be 2 MB or smaller"),
    );

    renderProfile();
    await screen.findByRole("button", { name: "Upload photo" });

    const file = new File(["x"], "huge.jpg", { type: "image/jpeg" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, file);

    expect(
      await screen.findByText("Profile photo must be 2 MB or smaller"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Upload photo" })).toBeEnabled();
  });

  it("disables actions while an upload is in flight", async () => {
    vi.spyOn(api, "getUser").mockResolvedValue(makeUser());
    let finishUpload!: (user: User) => void;
    vi.spyOn(api, "uploadProfilePhoto").mockImplementation(
      () =>
        new Promise((resolve) => {
          finishUpload = resolve;
        }),
    );

    renderProfile();
    await screen.findByRole("button", { name: "Upload photo" });

    const file = new File(["x"], "avatar.png", { type: "image/png" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, file);

    expect(await screen.findByRole("button", { name: "Uploading..." })).toBeDisabled();

    finishUpload(makeUser({ profilePhotoUrl: "/uploads/avatars/done.png" }));
    expect(await screen.findByRole("button", { name: "Replace photo" })).toBeEnabled();
  });

  it("removes an existing photo and restores initials", async () => {
    vi.spyOn(api, "getUser").mockResolvedValue(
      makeUser({ profilePhotoUrl: "/uploads/avatars/current.jpg" }),
    );
    const deleteSpy = vi
      .spyOn(api, "deleteProfilePhoto")
      .mockResolvedValue(makeUser({ profilePhotoUrl: null }));

    renderProfile();
    await screen.findByRole("button", { name: "Remove photo" });

    await userEvent.click(screen.getByRole("button", { name: "Remove photo" }));

    await waitFor(() => {
      expect(deleteSpy).toHaveBeenCalledWith(4);
    });
    expect(await screen.findByText("AN")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Upload photo" })).toBeInTheDocument();
  });

  it("shows a fallback when remove fails with a non-ApiError", async () => {
    vi.spyOn(api, "getUser").mockResolvedValue(
      makeUser({ profilePhotoUrl: "/uploads/avatars/current.jpg" }),
    );
    vi.spyOn(api, "deleteProfilePhoto").mockRejectedValue(new Error("offline"));

    renderProfile();
    await userEvent.click(await screen.findByRole("button", { name: "Remove photo" }));

    expect(
      await screen.findByText("Failed to remove profile photo"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove photo" })).toBeInTheDocument();
  });
});
