import type { Comment, Ticket, TicketPriority, TicketStatus, User } from "../types";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

/** Error thrown for non-2xx API responses, carrying the server message. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    let details: unknown;
    try {
      const body = await res.json();
      message = body?.error?.message ?? message;
      details = body?.error?.details;
    } catch {
      // response had no JSON body
    }
    throw new ApiError(res.status, message, details);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export interface ListTicketsParams {
  search?: string;
  status?: TicketStatus | "";
}

export const api = {
  listUsers: () => request<User[]>("/users"),

  listTickets: (params: ListTicketsParams = {}) => {
    const qs = new URLSearchParams();
    if (params.search) qs.set("search", params.search);
    if (params.status) qs.set("status", params.status);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return request<Ticket[]>(`/tickets${suffix}`);
  },

  getTicket: (id: number) => request<Ticket>(`/tickets/${id}`),

  createTicket: (payload: {
    title: string;
    description: string;
    priority: TicketPriority;
    createdById: number;
    assignedToId: number | null;
  }) =>
    request<Ticket>("/tickets", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateTicket: (
    id: number,
    payload: Partial<{
      title: string;
      description: string;
      priority: TicketPriority;
      assignedToId: number | null;
    }>,
  ) =>
    request<Ticket>(`/tickets/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  changeStatus: (id: number, status: TicketStatus) =>
    request<Ticket>(`/tickets/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  addComment: (id: number, payload: { message: string; createdById: number }) =>
    request<Comment>(`/tickets/${id}/comments`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};
