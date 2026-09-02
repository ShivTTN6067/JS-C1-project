import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import type { SeriesCard } from "../types";

export function ContentCard({
  series,
  to,
  progress,
}: {
  series: SeriesCard;
  to?: string;
  progress?: { position: number; duration: number };
}) {
  const pct =
    progress && progress.duration > 0
      ? Math.min(100, Math.round((progress.position / progress.duration) * 100))
      : null;

  const body = (
    <>
      <div className="relative overflow-hidden rounded-xl bg-slate-800 shadow-lg">
        <img
          src={series.posterUrl}
          alt=""
          className="aspect-[2/3] w-full object-cover transition group-hover:scale-105"
        />
        {series.adSlot && (
          <span className="absolute left-2 top-2 rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-900">
            Ad
          </span>
        )}
        {pct != null && (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20">
            <div className="h-full bg-rose-500" style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>
      <p className="mt-2 truncate text-sm font-medium text-white">{series.title}</p>
      <p className="truncate text-xs text-slate-400">{series.category}</p>
    </>
  );

  const className = "group w-36 shrink-0 sm:w-40";
  if (to) {
    return (
      <Link to={to} className={className}>
        {body}
      </Link>
    );
  }
  return <div className={className}>{body}</div>;
}

export function RailRow({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 px-1 text-lg font-semibold text-white">{title}</h2>
      <div className="flex gap-4 overflow-x-auto pb-2">{children}</div>
    </section>
  );
}
