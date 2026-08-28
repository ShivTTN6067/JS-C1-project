import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, ApiError } from "./client";

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe("api client error fallbacks and list queries", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("falls back to a generic message when the error object has no message", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse(500, { error: { details: { reason: "boom" } } }),
    );

    const err = await api.getTicket(3).then(
      () => {
        throw new Error("expected ApiError");
      },
      (caught) => caught,
    );

    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({
      name: "ApiError",
      status: 500,
      message: "Request failed (500)",
      details: { reason: "boom" },
    });
  });

  it("builds a search-only list query without a status param", async () => {
    const fetchMock = vi
      .mocked(fetch)
      .mockResolvedValue(jsonResponse(200, []));

    await expect(api.listTickets({ search: "vpn outage" })).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/tickets?search=vpn+outage",
      expect.objectContaining({
        headers: { "Content-Type": "application/json" },
      }),
    );
  });
});
