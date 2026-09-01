import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../api/client";
import type { User } from "../types";
import { UserAvatar } from "../components/UserAvatar";
import { ErrorState, LoadingState } from "../components/States";

export default function UserListPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setUsers(await api.listUsers());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) return <LoadingState label="Loading users..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Team Profiles</h1>
      <p className="mt-1 text-sm text-slate-500">
        Manage profile photos for support team members.
      </p>

      <ul className="mt-6 space-y-3">
        {users.map((user) => (
          <li key={user.id}>
            <Link
              to={`/users/${user.id}`}
              className="flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50/40"
            >
              <UserAvatar user={user} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-slate-900">{user.name}</p>
                <p className="truncate text-sm text-slate-500">{user.email}</p>
                <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">
                  {user.role}
                </p>
              </div>
              <span className="text-sm font-medium text-indigo-600">Edit photo</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
