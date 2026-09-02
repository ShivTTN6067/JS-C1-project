import { useEffect, useState } from "react";
import { api, ApiError } from "../api/client";
import { ContentCard, RailRow } from "../components/ContentCard";
import { homePath } from "../session";
import type { Experience, SeriesCard } from "../types";

export default function MySpacePage({ experience }: { experience: Experience }) {
  const [tab, setTab] = useState<"continue" | "watchlist">("continue");
  const [continueWatching, setContinueWatching] = useState<SeriesCard[]>([]);
  const [watchlist, setWatchlist] = useState<SeriesCard[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.continueWatching(experience), api.watchlist(experience)])
      .then(([cw, wl]) => {
        setContinueWatching(cw);
        setWatchlist(wl);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load My Space"));
  }, [experience]);

  const items = tab === "continue" ? continueWatching : watchlist;
  const base = homePath(experience);

  return (
    <div>
      <h1 className="text-2xl font-semibold">My Space</h1>
      <p className="mt-1 text-sm text-slate-400">
        {experience === "MD"
          ? "Micro Drama activity only."
          : "VideoReady activity only, with VOD sub-filters."}
      </p>
      <div className="mt-4 flex gap-2">
        <button
          onClick={() => setTab("continue")}
          className={`rounded-full px-3 py-1 text-sm ${tab === "continue" ? "bg-rose-500" : "bg-white/10"}`}
        >
          Continue Watching
        </button>
        <button
          onClick={() => setTab("watchlist")}
          className={`rounded-full px-3 py-1 text-sm ${tab === "watchlist" ? "bg-rose-500" : "bg-white/10"}`}
        >
          Watchlist
        </button>
      </div>
      {error && <p className="mt-4 text-rose-300">{error}</p>}
      <div className="mt-6">
        <RailRow title={tab === "continue" ? "Continue Watching" : "Watchlist"}>
          {items.length === 0 ? (
            <p className="text-sm text-slate-500">No titles yet.</p>
          ) : (
            items.map((series) => (
              <ContentCard
                key={series.id}
                series={series}
                to={
                  tab === "continue" && series.resumeEpisodeId
                    ? `${base}/watch/${series.resumeEpisodeId}`
                    : `${base}/series/${series.id}`
                }
              />
            ))
          )}
        </RailRow>
      </div>
    </div>
  );
}
