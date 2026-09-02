import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, ApiError } from "../api/client";
import { ContentCard, RailRow } from "../components/ContentCard";
import { LoginPrompt } from "../components/PaywallModal";
import { homePath, useSession } from "../session";
import type { Experience, HomeRail, SeriesCard } from "../types";

export default function HomePage({ experience }: { experience: Experience }) {
  const { token, setExperience } = useSession();
  const navigate = useNavigate();
  const [rails, setRails] = useState<HomeRail[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loginFor, setLoginFor] = useState<string | null>(null);

  useEffect(() => {
    setExperience(experience);
    api
      .home(experience)
      .then((data) => setRails(data.rails))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load home"));
  }, [experience, setExperience]);

  function openSeries(series: SeriesCard) {
    const path = `${homePath(experience)}/series/${series.id}`;
    if (!token) {
      setLoginFor(path);
      return;
    }
    navigate(path);
  }

  function openResume(series: SeriesCard) {
    const path = series.resumeEpisodeId
      ? `${homePath(experience)}/watch/${series.resumeEpisodeId}`
      : `${homePath(experience)}/series/${series.id}`;
    if (!token) {
      setLoginFor(path);
      return;
    }
    navigate(path);
  }

  if (error) {
    return <p className="text-rose-300">{error}</p>;
  }

  return (
    <div>
      <p className="mb-6 text-sm text-slate-400">
        {experience === "MD"
          ? "Vertical micro-drama home. Rails are CMS-configured independently from VideoReady."
          : "VideoReady home. Search and My Space stay on VOD titles only."}
      </p>
      {rails.map((rail) => (
        <RailRow key={rail.id} title={rail.title}>
          {rail.items.length === 0 ? (
            <p className="text-sm text-slate-500">Nothing here yet.</p>
          ) : (
            rail.items.map((series) => (
              <button
                key={`${rail.id}-${series.id}`}
                className="text-left"
                onClick={() =>
                  rail.type === "CONTINUE_WATCHING" ? openResume(series) : openSeries(series)
                }
              >
                <ContentCard
                  series={series}
                  progress={
                    series.positionSeconds != null && series.durationSeconds
                      ? { position: series.positionSeconds, duration: series.durationSeconds }
                      : undefined
                  }
                />
              </button>
            ))
          )}
        </RailRow>
      ))}
      {loginFor && <LoginPrompt nextPath={loginFor} onClose={() => setLoginFor(null)} />}
    </div>
  );
}
