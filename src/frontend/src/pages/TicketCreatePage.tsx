import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, ApiError } from "../api/client";
import type { TicketPriority, User } from "../types";
import { PRIORITY_LABELS } from "../lib/status";
import { ErrorState } from "../components/States";

const PRIORITIES: TicketPriority[] = ["LOW", "MEDIUM", "HIGH"];

export default function TicketCreatePage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [usersError, setUsersError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TicketPriority>("MEDIUM");
  const [createdById, setCreatedById] = useState<number | "">("");
  const [assignedToId, setAssignedToId] = useState<number | "">("");

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    api
      .listUsers()
      .then((data) => {
        setUsers(data);
        if (data[0]) setCreatedById(data[0].id);
      })
      .catch((err) =>
        setUsersError(err instanceof ApiError ? err.message : "Failed to load users"),
      );
  }, []);

  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (!title.trim()) errors.title = "Title is required";
    if (!description.trim()) errors.description = "Description is required";
    if (createdById === "") errors.createdById = "Reporter is required";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!validate()) return;

    setSubmitting(true);
    try {
      const ticket = await api.createTicket({
        title: title.trim(),
        description: description.trim(),
        priority,
        createdById: Number(createdById),
        assignedToId: assignedToId === "" ? null : Number(assignedToId),
      });
      navigate(`/tickets/${ticket.id}`);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Failed to create ticket");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link to="/" className="text-sm text-indigo-600 hover:underline">
        &larr; Back to tickets
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-slate-900">New Ticket</h1>

      {usersError && (
        <div className="mt-4">
          <ErrorState message={usersError} />
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="mt-6 space-y-5 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      >
        <Field label="Title" error={fieldErrors.title}>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input"
            placeholder="Short summary of the issue"
          />
        </Field>

        <Field label="Description" error={fieldErrors.description}>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            className="input"
            placeholder="Describe the problem in detail"
          />
        </Field>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="Priority">
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TicketPriority)}
              className="input"
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_LABELS[p]}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Reporter" error={fieldErrors.createdById}>
            <select
              value={createdById}
              onChange={(e) =>
                setCreatedById(e.target.value === "" ? "" : Number(e.target.value))
              }
              className="input"
            >
              <option value="">Select reporter</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Assignee (optional)">
          <select
            value={assignedToId}
            onChange={(e) =>
              setAssignedToId(e.target.value === "" ? "" : Number(e.target.value))
            }
            className="input"
          >
            <option value="">Unassigned</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </Field>

        {formError && <ErrorState message={formError} />}

        <div className="flex justify-end gap-3">
          <Link
            to="/"
            className="rounded-md px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
          >
            {submitting ? "Creating..." : "Create Ticket"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-rose-600">{error}</span>}
    </label>
  );
}
