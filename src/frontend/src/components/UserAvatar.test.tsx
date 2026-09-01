import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { UserAvatar } from "./UserAvatar";

describe("UserAvatar", () => {
  it("renders initials when no profile photo is set", () => {
    render(<UserAvatar user={{ name: "Alice Nguyen", profilePhotoUrl: null }} />);
    expect(screen.getByText("AN")).toBeInTheDocument();
  });

  it("renders the profile photo when a URL is provided", () => {
    render(
      <UserAvatar
        user={{ name: "Alice Nguyen", profilePhotoUrl: "/uploads/avatars/alice.jpg" }}
      />,
    );
    expect(screen.getByRole("img", { name: "Alice Nguyen's profile photo" })).toHaveAttribute(
      "src",
      "/uploads/avatars/alice.jpg",
    );
  });
});
