import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, ApiError } from "../api/client";
import type { Ticket, TicketPriority, TicketStatus, User } from "../types";
import { PRIORITY_LABELS, STATUS_LABELS } from "../lib/status";
import { PriorityBadge, StatusBadge } from "../components/Badges";
import { ErrorState, LoadingState } from "../components/States";
import { UserAvatar } from "../components/UserAvatar";

const PRIORITIES: TicketPriority[] = ["LOW", "MEDIUM", "HIGH"];

export default function TicketDetailPage() {
  const { id } = useParams();
  const ticketId = Number(id);

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    title: "",
    description: "",
    priority: "MEDIUM" as TicketPriority,
    assignedToId: "" as number | "",
  });

  const [commentText, setCommentText] = useState("");
  const [commentAuthor, setCommentAuthor] = useState<number | "">("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [t, u] = await Promise.all([api.getTicket(ticketId), api.listUsers()]);
      setTicket(t);
      setUsers(u);
      if (u[0]) setCommentAuthor((prev) => (prev === "" ? u[0].id : prev));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load ticket");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  function startEditing() {
    if (!ticket) return;
    setDraft({
      title: ticket.title,
      description: ticket.description,
      priority: ticket.priority,
      assignedToId: ticket.assignedToId ?? "",
    });
    setActionError(null);
    setEditing(true);
  }

  async function saveEdits() {
    setActionError(null);
    try {
      const updated = await api.updateTicket(ticketId, {
        title: draft.title.trim(),
        description: draft.description.trim(),
        priority: draft.priority,
        assignedToId: draft.assignedToId === "" ? null : Number(draft.assignedToId),
      });
      setTicket((prev) => (prev ? { ...prev, ...updated } : updated));
      setEditing(false);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Failed to save changes");
    }
  }

  async function transition(next: TicketStatus) {
    setActionError(null);
    try {
      const updated = await api.changeStatus(ticketId, next);
      setTicket((prev) => (prev ? { ...prev, ...updated } : updated));
    } catch (err) {
      setActionError(
        err instanceof ApiError ? err.message : "Failed to change status",
      );
    }
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    setActionError(null);
    if (!commentText.trim() || commentAuthor === "") return;
    try {
      await api.addComment(ticketId, {
        message: commentText.trim(),
        createdById: Number(commentAuthor),
      });
      setCommentText("");
      await load();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Failed to add comment");
    }
  }

  if (loading) return <LoadingState label="Loading ticket..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!ticket) return null;

  const nextStatuses = ticket.allowedNextStatuses ?? [];

  return (
    <div>
      <Link to="/" className="text-sm text-indigo-600 hover:underline">
        &larr; Back to tickets
      </Link>

      <div className="mt-3 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            {editing ? (
              <div className="space-y-4">
                <input
                  className="input text-lg font-semibold"
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                />
                <textarea
                  className="input"
                  rows={5}
                  value={draft.description}
                  onChange={(e) =>
                    setDraft({ ...draft, description: e.target.value })
                  }
                />
                <div className="grid grid-cols-2 gap-4">
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-700">
                      Priority
                    </span>
                    <select
                      className="input"
                      value={draft.priority}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          priority: e.target.value as TicketPriority,
                        })
                      }
                    >
                      {PRIORITIES.map((p) => (
                        <option key={p} value={p}>
                          {PRIORITY_LABELS[p]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-700">
                      Assignee
                    </span>
                    <select
                      className="input"
                      value={draft.assignedToId}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          assignedToId:
                            e.target.value === "" ? "" : Number(e.target.value),
                        })
                      }
                    >
                      <option value="">Unassigned</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setEditing(false)}
                    className="rounded-md px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveEdits}
                    className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-4">
                  <h1 className="text-xl font-semibold text-slate-900">
                    {ticket.title}
                  </h1>
                  <button
                    onClick={startEditing}
                    className="shrink-0 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Edit
                  </button>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm text-slate-600">
                  {ticket.description}
                </p>
              </>
            )}
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Comments</h2>
            <ul className="mt-4 space-y-4">
              {ticket.comments && ticket.comments.length > 0 ? (
                ticket.comments.map((c) => (
                  <li key={c.id} className="rounded-md bg-slate-50 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <UserAvatar
                          user={
                            c.createdBy ?? {
                              name: `User #${c.createdById}`,
                              profilePhotoUrl: null,
                            }
                          }
                          size="sm"
                        />
                        <span className="truncate text-sm font-medium text-slate-800">
                          {c.createdBy?.name ?? `User #${c.createdById}`}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400">
                        {new Date(c.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">
                      {c.message}
                    </p>
                  </li>
                ))
              ) : (
                <li className="text-sm text-slate-400">No comments yet.</li>
              )}
            </ul>

            <form onSubmit={submitComment} className="mt-5 space-y-3">
              <textarea
                className="input"
                rows={3}
                placeholder="Add a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
              />
              <div className="flex items-center justify-between gap-3">
                <select
                  className="input max-w-[12rem]"
                  value={commentAuthor}
                  onChange={(e) =>
                    setCommentAuthor(
                      e.target.value === "" ? "" : Number(e.target.value),
                    )
                  }
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={!commentText.trim()}
                  className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                  Comment
                </button>
              </div>
            </form>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Details</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Status</dt>
                <dd>
                  <StatusBadge status={ticket.status} />
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Priority</dt>
                <dd>
                  <PriorityBadge priority={ticket.priority} />
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Assignee</dt>
                <dd className="flex items-center gap-2 text-slate-800">
                  {ticket.assignedTo ? (
                    <>
                      <UserAvatar user={ticket.assignedTo} size="sm" />
                      <span>{ticket.assignedTo.name}</span>
                    </>
                  ) : (
                    "Unassigned"
                  )}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Reporter</dt>
                <dd className="flex items-center gap-2 text-slate-800">
                  <UserAvatar
                    user={
                      ticket.createdBy ?? {
                        name: `User #${ticket.createdById}`,
                        profilePhotoUrl: null,
                      }
                    }
                    size="sm"
                  />
                  <span>{ticket.createdBy?.name ?? `User #${ticket.createdById}`}</span>
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Change Status</h2>
            {nextStatuses.length === 0 ? (
              <p className="mt-3 text-sm text-slate-400">
                This ticket is in a terminal state.
              </p>
            ) : (
              <div className="mt-3 flex flex-col gap-2">
                {nextStatuses.map((s) => (
                  <button
                    key={s}
                    onClick={() => transition(s)}
                    className="rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 transition hover:bg-indigo-100"
                  >
                    Move to {STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            )}
          </section>

          {actionError && <ErrorState message={actionError} />}
        </aside>
      </div>
    </div>
  );
}
