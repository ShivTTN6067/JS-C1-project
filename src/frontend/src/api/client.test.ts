import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, ApiError } from "./client";

describe("api client", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("omits empty list filters and encodes search plus status", async () => {
    const fetchMock = vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [],
    } as Response);

    await api.listTickets();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/tickets",
      expect.objectContaining({
        headers: { "Content-Type": "application/json" },
      }),
    );

    await api.listTickets({ search: "payment", status: "OPEN" });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/tickets?search=payment&status=OPEN",
      expect.anything(),
    );

    await api.listTickets({ search: "", status: "" });
    expect(fetchMock).toHaveBeenCalledWith("/api/tickets", expect.anything());
  });

  it("throws ApiError using the server message and details", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        error: {
          message: "Cannot change status from OPEN to CLOSED",
          details: { from: "OPEN", to: "CLOSED", allowed: ["IN_PROGRESS"] },
        },
      }),
    } as Response);

    const err = await api.changeStatus(3, "CLOSED").catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({
      status: 400,
      message: "Cannot change status from OPEN to CLOSED",
      details: { from: "OPEN", to: "CLOSED", allowed: ["IN_PROGRESS"] },
    });
  });

  it("falls back to a generic message when the error body is not JSON", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => {
        throw new Error("not json");
      },
    } as Response);

    await expect(api.getTicket(9)).rejects.toMatchObject({
      status: 502,
      message: "Request failed (502)",
    });
  });
});
