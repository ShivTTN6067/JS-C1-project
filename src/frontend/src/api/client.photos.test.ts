import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, ApiError } from "./client";

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe("api profile photo client", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("GET /users/:id for a single profile", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ id: 4, name: "Alice", profilePhotoUrl: null }),
    );

    await api.getUser(4);

    expect(fetch).toHaveBeenCalledWith(
      "/api/users/4",
      expect.objectContaining({ headers: { "Content-Type": "application/json" } }),
    );
  });

  it("uploads with FormData and does not force JSON content-type", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ id: 4, profilePhotoUrl: "/uploads/avatars/user-4.png" }),
    );
    const file = new File(["png"], "avatar.png", { type: "image/png" });

    await api.uploadProfilePhoto(4, file);

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("/api/users/4/profile-photo");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBeInstanceOf(FormData);
    expect((init?.body as FormData).get("photo")).toBe(file);
    expect(init?.headers).toBeUndefined();
  });

  it("maps upload failures to ApiError using the server message", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse(
        { error: { message: "Profile photo must be a JPEG, PNG, or WebP image" } },
        400,
      ),
    );

    const file = new File(["x"], "notes.txt", { type: "text/plain" });
    await expect(api.uploadProfilePhoto(4, file)).rejects.toMatchObject({
      name: "ApiError",
      status: 400,
      message: "Profile photo must be a JPEG, PNG, or WebP image",
    });
    await expect(api.uploadProfilePhoto(4, file)).rejects.toBeInstanceOf(ApiError);
  });

  it("DELETE /users/:id/profile-photo", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ id: 4, profilePhotoUrl: null }),
    );

    await api.deleteProfilePhoto(4);

    expect(fetch).toHaveBeenCalledWith(
      "/api/users/4/profile-photo",
      expect.objectContaining({
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      }),
    );
  });
});
