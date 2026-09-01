import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { UserAvatar } from "./UserAvatar";

describe("UserAvatar initials", () => {
  it("uses the first letter of a single-word name", () => {
    render(<UserAvatar user={{ name: "Bob", profilePhotoUrl: null }} />);
    expect(screen.getByText("B")).toBeInTheDocument();
  });

  it("uses the first two words of a longer name", () => {
    render(
      <UserAvatar user={{ name: "Carol Ann Smith", profilePhotoUrl: null }} />,
    );
    expect(screen.getByText("CA")).toBeInTheDocument();
  });

  it("ignores extra whitespace and uppercases initials", () => {
    render(
      <UserAvatar user={{ name: "  alice   nguyen  ", profilePhotoUrl: null }} />,
    );
    expect(screen.getByText("AN")).toBeInTheDocument();
  });
});
