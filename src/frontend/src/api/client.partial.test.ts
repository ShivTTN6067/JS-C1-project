import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, ApiError } from "./client";

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe("api client partial updates and error identity", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("PATCHes only the fields supplied to updateTicket", async () => {
    const fetchMock = vi
      .mocked(fetch)
      .mockResolvedValue(jsonResponse(200, { id: 4, priority: "LOW" }));

    await api.updateTicket(4, { priority: "LOW" });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/tickets/4",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ priority: "LOW" }),
      }),
    );
  });

  it("names thrown ApiError instances so UI instanceof checks keep working", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: { message: "Ticket 4 not found" } }),
    } as Response);

    const err = await api.getTicket(4).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.name).toBe("ApiError");
    expect(err.status).toBe(404);
    expect(err.message).toBe("Ticket 4 not found");
  });
});
