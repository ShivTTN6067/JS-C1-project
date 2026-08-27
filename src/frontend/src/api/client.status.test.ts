import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "./client";

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe("api client reads and status", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("GETs users and a ticket by id", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, [{ id: 1, name: "Alice" }]))
      .mockResolvedValueOnce(jsonResponse(200, { id: 4, title: "Login bug" }));

    await expect(api.listUsers()).resolves.toEqual([
      { id: 1, name: "Alice" },
    ]);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/users",
      expect.objectContaining({
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(api.getTicket(4)).resolves.toMatchObject({
      id: 4,
      title: "Login bug",
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/tickets/4",
      expect.anything(),
    );
  });

  it("PATCHes status through the dedicated status endpoint", async () => {
    const fetchMock = vi.mocked(fetch).mockResolvedValue(
      jsonResponse(200, {
        id: 4,
        status: "IN_PROGRESS",
        allowedNextStatuses: ["RESOLVED", "CANCELLED"],
      }),
    );

    await expect(api.changeStatus(4, "IN_PROGRESS")).resolves.toMatchObject({
      status: "IN_PROGRESS",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/tickets/4/status",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ status: "IN_PROGRESS" }),
      }),
    );
  });
});
