import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, ApiError } from "../api/client";
import { PaywallModal } from "../components/PaywallModal";
import { VerticalPlayer } from "../components/VerticalPlayer";
import { homePath, useSession } from "../session";
import type { Experience, PaywallDetails, PlaybackPayload } from "../types";

export default function PlayerPage({ experience }: { experience: Experience }) {
  const { episodeId } = useParams();
  const { token } = useSession();
  const navigate = useNavigate();
  const [playback, setPlayback] = useState<PlaybackPayload | null>(null);
  const [paywall, setPaywall] = useState<PaywallDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastSaved = useRef(0);

  const load = useCallback(
    async (id: number) => {
      setError(null);
      setPaywall(null);
      try {
        const data = await api.getPlayback(id);
        setPlayback(data);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          navigate(`/login?next=${homePath(experience)}/watch/${id}`);
          return;
        }
        if (err instanceof ApiError && err.status === 402) {
          setPaywall(err.details as PaywallDetails);
          setPlayback(null);
          return;
        }
        setError(err instanceof ApiError ? err.message : "Playback failed");
      }
    },
    [experience, navigate],
  );

  useEffect(() => {
    const id = Number(episodeId);
    if (!Number.isInteger(id)) return;
    void load(id);
  }, [episodeId, load]);

  function go(nextId: number | null) {
    if (!nextId) return;
    navigate(`${homePath(experience)}/watch/${nextId}`);
  }

  function onProgress(position: number, duration: number, completed?: boolean) {
    if (!token || !playback) return;
    const now = Date.now();
    if (!completed && now - lastSaved.current < 4000) return;
    lastSaved.current = now;
    void api.saveProgress({
      episodeId: playback.episode.id,
      positionSeconds: position,
      durationSeconds: duration,
      completed,
    });
  }

  if (paywall) {
    return (
      <PaywallModal
        details={paywall}
        onClose={() => navigate(`${homePath(experience)}/series/${paywall.seriesId}`)}
        onSubscribed={() => {
          setPaywall(null);
          void load(Number(episodeId));
        }}
      />
    );
  }

  if (error) return <p className="text-rose-300">{error}</p>;
  if (!playback) return <p className="text-slate-400">Loading player...</p>;

  const frame =
    experience === "MD" ? (
      <div className="flex min-h-[80vh] items-center justify-center bg-black">
        <VerticalPlayer
          playback={playback}
          onPrev={() => go(playback.prevEpisodeId)}
          onNext={() => go(playback.nextEpisodeId)}
          onProgress={onProgress}
        />
      </div>
    ) : (
      <div className="mx-auto max-w-4xl">
        <video
          key={playback.episode.id}
          className="w-full rounded-xl bg-black"
          src={playback.episode.videoUrl}
          controls
          autoPlay
          onTimeUpdate={(e) => {
            const v = e.currentTarget;
            onProgress(v.currentTime, v.duration || 1);
          }}
        />
        <h1 className="mt-4 text-2xl font-semibold">{playback.episode.title}</h1>
        <p className="text-slate-400">{playback.series.title}</p>
      </div>
    );

  return frame;
}
