import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../api/client";
import type { Ticket, TicketStatus } from "../types";
import { STATUS_LABELS, STATUS_ORDER } from "../lib/status";
import { PriorityBadge, StatusBadge } from "../components/Badges";
import { EmptyState, ErrorState, LoadingState } from "../components/States";

type StatusFilter = TicketStatus | "";

export default function TicketListPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listTickets({
        search: search.trim() || undefined,
        status: statusFilter || undefined,
      });
      setTickets(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load tickets");
    } finally {
      setLoading(false);
    }
  }

  // Reload whenever the search text or status filter changes (debounced for search).
  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter]);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Tickets</h1>
      </div>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="search"
          aria-label="Search tickets"
          placeholder="Search by keyword..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:max-w-xs"
        />
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by status">
          <FilterChip
            label="All"
            active={statusFilter === ""}
            onClick={() => setStatusFilter("")}
          />
          {STATUS_ORDER.map((s) => (
            <FilterChip
              key={s}
              label={STATUS_LABELS[s]}
              active={statusFilter === s}
              onClick={() => setStatusFilter(s)}
            />
          ))}
        </div>
      </div>

      {loading ? (
        <LoadingState label="Loading tickets..." />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : tickets.length === 0 ? (
        <EmptyState message="No tickets match your filters." />
      ) : (
        <ul className="space-y-3">
          {tickets.map((ticket) => (
            <li key={ticket.id}>
              <Link
                to={`/tickets/${ticket.id}`}
                className="block rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-indigo-300 hover:shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">
                      {ticket.title}
                    </p>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                      {ticket.description}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <StatusBadge status={ticket.status} />
                    <PriorityBadge priority={ticket.priority} />
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-3 text-xs text-slate-400">
                  <span>#{ticket.id}</span>
                  <span>
                    Assignee: {ticket.assignedTo ? ticket.assignedTo.name : "Unassigned"}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full px-3 py-1 text-xs font-medium transition ${
        active
          ? "bg-indigo-600 text-white"
          : "bg-white text-slate-600 ring-1 ring-inset ring-slate-300 hover:bg-slate-50"
      }`}
    >
      {label}
    </button>
  );
}
