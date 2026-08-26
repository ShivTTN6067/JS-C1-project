import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "./client";

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe("api client mutations", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("POSTs create payloads and PATCHes field updates", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(jsonResponse(201, { id: 8, status: "OPEN" }))
      .mockResolvedValueOnce(jsonResponse(200, { id: 8, assignedToId: null }));

    await api.createTicket({
      title: "Broken login",
      description: "Users cannot sign in",
      priority: "HIGH",
      createdById: 1,
      assignedToId: 2,
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/tickets",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          title: "Broken login",
          description: "Users cannot sign in",
          priority: "HIGH",
          createdById: 1,
          assignedToId: 2,
        }),
      }),
    );

    await api.updateTicket(8, { title: "Still broken", assignedToId: null });
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/tickets/8",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({
          title: "Still broken",
          assignedToId: null,
        }),
      }),
    );
  });

  it("posts comments to the ticket comments collection", async () => {
    const fetchMock = vi.mocked(fetch).mockResolvedValue(
      jsonResponse(201, { id: 3, message: "Investigating" }),
    );

    await api.addComment(8, { message: "Investigating", createdById: 1 });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/tickets/8/comments",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          message: "Investigating",
          createdById: 1,
        }),
      }),
    );
  });
});
