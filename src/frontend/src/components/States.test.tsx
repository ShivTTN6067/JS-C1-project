import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { EmptyState, ErrorState, LoadingState } from "./States";

describe("shared UI states", () => {
  it("renders a custom loading label", () => {
    render(<LoadingState label="Loading tickets..." />);
    expect(screen.getByText("Loading tickets...")).toBeInTheDocument();
  });

  it("shows a retry action only when onRetry is provided", async () => {
    const onRetry = vi.fn();
    const { rerender } = render(
      <ErrorState message="Failed to load tickets" onRetry={onRetry} />,
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("Failed to load tickets")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledTimes(1);

    rerender(<ErrorState message="Failed to save changes" />);
    expect(screen.getByText("Failed to save changes")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
  });

  it("renders the empty-state message", () => {
    render(<EmptyState message="No tickets match your filters." />);
    expect(
      screen.getByText("No tickets match your filters."),
    ).toBeInTheDocument();
  });
});
