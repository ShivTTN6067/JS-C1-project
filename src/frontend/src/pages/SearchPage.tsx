import { FormEvent, useState } from "react";
import { api } from "../api/client";
import { ContentCard, RailRow } from "../components/ContentCard";
import { homePath } from "../session";
import type { Experience, SeriesCard } from "../types";

export default function SearchPage({ experience }: { experience: Experience }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SeriesCard[] | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    setResults(await api.searchCatalog(experience, q.trim()));
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">Search</h1>
      <p className="mt-1 text-sm text-slate-400">
        {experience === "MD" ? "Micro Drama titles only." : "VideoReady titles only."}
      </p>
      <form onSubmit={onSubmit} className="mt-4 flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="input max-w-md bg-slate-900 text-white"
          placeholder="Search series"
          aria-label="Search catalog"
        />
        <button className="rounded-md bg-rose-500 px-4 py-2 text-sm font-medium">Search</button>
      </form>
      {results && (
        <div className="mt-6">
          <RailRow title={`${results.length} result${results.length === 1 ? "" : "s"}`}>
            {results.length === 0 ? (
              <p className="text-sm text-slate-500">No matches in this experience.</p>
            ) : (
              results.map((series) => (
                <ContentCard
                  key={series.id}
                  series={series}
                  to={`${homePath(experience)}/series/${series.id}`}
                />
              ))
            )}
          </RailRow>
        </div>
      )}
    </div>
  );
}
