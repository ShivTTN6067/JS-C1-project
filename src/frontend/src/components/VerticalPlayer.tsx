import { useEffect, useRef, useState } from "react";
import type { PlaybackPayload } from "../types";

export function VerticalPlayer({
  playback,
  onPrev,
  onNext,
  onProgress,
}: {
  playback: PlaybackPayload;
  onPrev: () => void;
  onNext: () => void;
  onProgress: (position: number, duration: number, completed?: boolean) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const preloadRef = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [waiting, setWaiting] = useState(false);
  const hideTimer = useRef<number | undefined>(undefined);

  const src = playback.episode.renditions.medium || playback.episode.videoUrl;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.src = src;
    const resume = playback.resumePositionSeconds;
    const onLoaded = () => {
      if (resume > 1 && resume < video.duration - 1) {
        video.currentTime = resume;
      }
      video.play().catch(() => setPaused(true));
    };
    video.addEventListener("loadedmetadata", onLoaded, { once: true });
    return () => video.removeEventListener("loadedmetadata", onLoaded);
  }, [src, playback.episode.id, playback.resumePositionSeconds]);

  useEffect(() => {
    const nextId = playback.nextEpisodeId;
    const preload = preloadRef.current;
    if (!preload) return;
    if (!nextId) {
      preload.removeAttribute("src");
      return;
    }
    preload.src = src;
    preload.preload = "auto";
  }, [playback.nextEpisodeId, src]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        onNext();
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        onPrev();
      }
      if (e.key === " ") {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function bumpControls() {
    setShowControls(true);
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setShowControls(false), 2500);
  }

  function togglePlay() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => undefined);
      setPaused(false);
    } else {
      video.pause();
      setPaused(true);
    }
    bumpControls();
  }

  function onWheel(e: React.WheelEvent) {
    if (Math.abs(e.deltaY) < 40) return;
    if (e.deltaY > 0) onNext();
    else onPrev();
  }

  return (
    <div
      className="relative mx-auto aspect-[9/16] h-[min(92vh,820px)] max-w-full overflow-hidden rounded-2xl bg-black shadow-2xl"
      onMouseMove={bumpControls}
      onWheel={onWheel}
    >
      <video
        ref={videoRef}
        className="h-full w-full object-cover"
        playsInline
        onClick={togglePlay}
        onWaiting={() => setWaiting(true)}
        onPlaying={() => {
          setWaiting(false);
          setPaused(false);
        }}
        onPause={() => setPaused(true)}
        onTimeUpdate={() => {
          const video = videoRef.current;
          if (!video || !video.duration) return;
          onProgress(video.currentTime, video.duration);
        }}
        onEnded={() => {
          const video = videoRef.current;
          if (video) onProgress(video.duration, video.duration, true);
          onNext();
        }}
      />
      <video ref={preloadRef} className="hidden" muted playsInline />

      {waiting && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        </div>
      )}

      {showControls && (
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30">
          <div className="pointer-events-auto absolute bottom-6 left-4 right-4">
            <p className="text-sm text-white/80">
              S{playback.episode.seasonNumber} E{playback.episode.number}
            </p>
            <h1 className="text-lg font-semibold text-white">{playback.episode.title}</h1>
            <p className="mt-1 line-clamp-2 text-xs text-white/70">{playback.episode.synopsis}</p>
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={togglePlay}
                className="rounded-full bg-white/20 px-3 py-1 text-sm text-white"
              >
                {paused ? "Play" : "Pause"}
              </button>
              <button
                onClick={() => {
                  const video = videoRef.current;
                  if (!video) return;
                  video.muted = !video.muted;
                  setMuted(video.muted);
                }}
                className="rounded-full bg-white/20 px-3 py-1 text-sm text-white"
              >
                {muted ? "Unmute" : "Mute"}
              </button>
              <input
                type="range"
                min={0}
                max={1000}
                defaultValue={0}
                aria-label="Seek"
                className="flex-1"
                onChange={(e) => {
                  const video = videoRef.current;
                  if (!video?.duration) return;
                  video.currentTime = (Number(e.target.value) / 1000) * video.duration;
                }}
              />
            </div>
            <p className="mt-2 text-[11px] text-white/50">
              Scroll or use Up/Down arrows for the next episode
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
