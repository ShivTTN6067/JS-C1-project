import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WatchlistButton } from "../components/WatchlistButton";
import { api } from "../api/client";

describe("WatchlistButton", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("adds then removes a title and shows the FSD verbiage", async () => {
    const user = userEvent.setup();
    vi.spyOn(api, "addWatchlist").mockResolvedValue({ message: "Added to watchlist" });
    vi.spyOn(api, "removeWatchlist").mockResolvedValue({ message: "Removed from watchlist" });

    render(<WatchlistButton seriesId={7} initiallySaved={false} />);

    await user.click(screen.getByRole("button", { name: "Add to watchlist" }));
    expect(await screen.findByText("Added to watchlist")).toBeInTheDocument();
    expect(api.addWatchlist).toHaveBeenCalledWith(7);

    await user.click(screen.getByRole("button", { name: "Remove from watchlist" }));
    expect(await screen.findByText("Removed from watchlist")).toBeInTheDocument();
  });
});
