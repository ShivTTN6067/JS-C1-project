import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, ApiError } from "./client";

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe("api profile photo error mapping", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("maps getUser 404 to ApiError with the server message", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ error: { message: "User not found (id=12)" } }, 404),
    );

    await expect(api.getUser(12)).rejects.toMatchObject({
      name: "ApiError",
      status: 404,
      message: "User not found (id=12)",
    });
  });

  it("maps deleteProfilePhoto failures to ApiError", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ error: { message: "User not found (id=9)" } }, 404),
    );

    await expect(api.deleteProfilePhoto(9)).rejects.toBeInstanceOf(ApiError);
    await expect(api.deleteProfilePhoto(9)).rejects.toMatchObject({
      status: 404,
      message: "User not found (id=9)",
    });
  });

  it("falls back when an upload error body is not JSON", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 413,
      json: async () => {
        throw new SyntaxError("not json");
      },
    } as Response);

    const file = new File(["x"], "avatar.png", { type: "image/png" });
    await expect(api.uploadProfilePhoto(4, file)).rejects.toMatchObject({
      name: "ApiError",
      status: 413,
      message: "Request failed (413)",
    });
  });
});
