import { useState } from "react";
import { api, ApiError } from "../api/client";

export function WatchlistButton({
  seriesId,
  initiallySaved,
}: {
  seriesId: number;
  initiallySaved: boolean;
}) {
  const [saved, setSaved] = useState(initiallySaved);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    try {
      if (saved) {
        await api.removeWatchlist(seriesId);
        setSaved(false);
        setToast("Removed from watchlist");
      } else {
        await api.addWatchlist(seriesId);
        setSaved(true);
        setToast("Added to watchlist");
      }
    } catch (err) {
      setToast(err instanceof ApiError ? err.message : "Could not update watchlist");
    } finally {
      setBusy(false);
      window.setTimeout(() => setToast(null), 2200);
    }
  }

  return (
    <div className="relative inline-flex flex-col items-start">
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        aria-label={saved ? "Remove from watchlist" : "Add to watchlist"}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-xl font-semibold text-white ring-1 ring-white/30 hover:bg-white/25"
      >
        {saved ? "✓" : "+"}
      </button>
      {toast && (
        <span className="absolute left-12 top-1 whitespace-nowrap rounded-md bg-black/80 px-2 py-1 text-xs text-white">
          {toast}
        </span>
      )}
    </div>
  );
}
