import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, ApiError } from "../api/client";
import type { User } from "../types";
import { UserAvatar } from "../components/UserAvatar";
import { ErrorState, LoadingState } from "../components/States";

export default function UserProfilePage() {
  const { id } = useParams();
  const userId = Number(id);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setUser(await api.getUser(userId));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load user");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setActionError(null);
    setUploading(true);

    const nextPreview = URL.createObjectURL(file);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return nextPreview;
    });

    try {
      const updated = await api.uploadProfilePhoto(userId, file);
      setUser(updated);
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    } catch (err) {
      setActionError(
        err instanceof ApiError ? err.message : "Failed to upload profile photo",
      );
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    } finally {
      setUploading(false);
    }
  }

  async function removePhoto() {
    setActionError(null);
    setUploading(true);
    try {
      const updated = await api.deleteProfilePhoto(userId);
      setUser(updated);
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    } catch (err) {
      setActionError(
        err instanceof ApiError ? err.message : "Failed to remove profile photo",
      );
    } finally {
      setUploading(false);
    }
  }

  if (loading) return <LoadingState label="Loading profile..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!user) return null;

  const displayUser =
    previewUrl != null
      ? { ...user, profilePhotoUrl: previewUrl }
      : user;

  return (
    <div>
      <Link to="/users" className="text-sm text-indigo-600 hover:underline">
        &larr; Back to team profiles
      </Link>

      <section className="mt-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <UserAvatar user={displayUser} size="lg" />

          <div className="flex-1">
            <h1 className="text-xl font-semibold text-slate-900">{user.name}</h1>
            <p className="mt-1 text-sm text-slate-500">{user.email}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">
              {user.role}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {uploading ? "Uploading..." : user.profilePhotoUrl ? "Replace photo" : "Upload photo"}
              </button>
              {user.profilePhotoUrl && (
                <button
                  type="button"
                  disabled={uploading}
                  onClick={removePhoto}
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  Remove photo
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />

            <p className="mt-3 text-xs text-slate-400">
              JPEG, PNG, or WebP up to 2 MB.
            </p>
          </div>
        </div>

        {actionError && (
          <div className="mt-4">
            <ErrorState message={actionError} />
          </div>
        )}
      </section>
    </div>
  );
}
