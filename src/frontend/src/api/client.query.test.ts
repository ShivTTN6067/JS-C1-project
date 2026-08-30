import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "./client";

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe("api client query encoding", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("builds a status-only list query without a search param", async () => {
    const fetchMock = vi.mocked(fetch).mockResolvedValue(jsonResponse(200, []));

    await expect(api.listTickets({ status: "CLOSED" })).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/tickets?status=CLOSED",
      expect.objectContaining({
        headers: { "Content-Type": "application/json" },
      }),
    );
  });

  it("encodes reserved characters in the search query", async () => {
    const fetchMock = vi.mocked(fetch).mockResolvedValue(jsonResponse(200, []));

    await api.listTickets({ search: "auth & sso?q=1" });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/tickets?search=auth+%26+sso%3Fq%3D1",
      expect.anything(),
    );
  });
});
