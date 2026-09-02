import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, ApiError } from "../api/client";
import { WatchlistButton } from "../components/WatchlistButton";
import { LoginPrompt } from "../components/PaywallModal";
import { homePath, useSession } from "../session";
import type { Experience, SeriesDetail } from "../types";

export default function SeriesPage({ experience }: { experience: Experience }) {
  const { id } = useParams();
  const { token } = useSession();
  const navigate = useNavigate();
  const [series, setSeries] = useState<SeriesDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loginFor, setLoginFor] = useState<string | null>(null);

  useEffect(() => {
    const seriesId = Number(id);
    if (!Number.isInteger(seriesId)) return;
    api
      .getSeries(seriesId)
      .then(setSeries)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load series"));
  }, [id]);

  if (error) return <p className="text-rose-300">{error}</p>;
  if (!series) return <p className="text-slate-400">Loading series...</p>;

  function play(episodeId: number) {
    const path = `${homePath(experience)}/watch/${episodeId}`;
    if (!token) {
      setLoginFor(path);
      return;
    }
    navigate(path);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
      <div>
        <img src={series.posterUrl} alt="" className="w-full rounded-2xl object-cover" />
        <div className="mt-4 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">{series.title}</h1>
            <p className="mt-1 text-sm text-slate-400">{series.synopsis}</p>
            <p className="mt-2 text-xs uppercase tracking-widest text-rose-300">
              {series.category} · first {series.freeEpisodeThreshold} free
            </p>
          </div>
          {token && <WatchlistButton seriesId={series.id} initiallySaved={series.inWatchlist} />}
        </div>
      </div>
      <div>
        {series.seasons.map((season) => (
          <section key={season.id} className="mb-6">
            <h2 className="mb-3 font-semibold">{season.title}</h2>
            <ul className="space-y-2">
              {season.episodes.map((episode) => (
                <li key={episode.id}>
                  <button
                    onClick={() => play(episode.id)}
                    className="flex w-full items-center justify-between rounded-xl bg-white/5 px-4 py-3 text-left hover:bg-white/10"
                  >
                    <span>
                      <span className="block font-medium">
                        E{episode.number} {episode.title}
                      </span>
                      <span className="text-xs text-slate-400">{episode.synopsis}</span>
                    </span>
                    <span className="text-xs uppercase text-slate-400">
                      {episode.isCliffhanger ? "Cliffhanger · " : ""}
                      {episode.locked ? "Locked" : "Play"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
        <Link to={homePath(experience)} className="text-sm text-slate-500">
          Back to home
        </Link>
      </div>
      {loginFor && <LoginPrompt nextPath={loginFor} onClose={() => setLoginFor(null)} />}
    </div>
  );
}
