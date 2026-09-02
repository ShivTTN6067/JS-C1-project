import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { UserAvatar } from "./UserAvatar";

describe("UserAvatar sizes", () => {
  it("uses the md size classes by default", () => {
    render(<UserAvatar user={{ name: "Eve Cole", profilePhotoUrl: null }} />);
    expect(screen.getByText("EC")).toHaveClass("h-9", "w-9");
  });

  it("applies sm and lg size classes", () => {
    const { rerender } = render(
      <UserAvatar user={{ name: "Eve Cole", profilePhotoUrl: null }} size="sm" />,
    );
    expect(screen.getByText("EC")).toHaveClass("h-7", "w-7");

    rerender(
      <UserAvatar user={{ name: "Eve Cole", profilePhotoUrl: null }} size="lg" />,
    );
    expect(screen.getByText("EC")).toHaveClass("h-20", "w-20");
  });

  it("appends a custom className on both photo and initials variants", () => {
    const { rerender } = render(
      <UserAvatar
        user={{ name: "Eve Cole", profilePhotoUrl: null }}
        className="ring-2"
      />,
    );
    expect(screen.getByText("EC")).toHaveClass("ring-2");

    rerender(
      <UserAvatar
        user={{ name: "Eve Cole", profilePhotoUrl: "/uploads/avatars/eve.jpg" }}
        size="sm"
        className="border"
      />,
    );
    expect(screen.getByRole("img", { name: "Eve Cole's profile photo" })).toHaveClass(
      "h-7",
      "border",
    );
  });
});
