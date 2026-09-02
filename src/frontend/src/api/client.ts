import type {
  AuthSession,
  Comment,
  Experience,
  HomeRail,
  PackCode,
  PlaybackPayload,
  PlatformConfig,
  SeriesCard,
  SeriesDetail,
  SubscriptionPack,
  Ticket,
  TicketPriority,
  TicketStatus,
  User,
  ViewerProfile,
} from "../types";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";
const TOKEN_KEY = "videoready.token";

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

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

function authHeaders(extra?: HeadersInit): HeadersInit {
  const token = getStoredToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(authHeaders(init?.headers));
  if (init?.body instanceof FormData) {
    headers.delete("Content-Type");
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers,
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

async function uploadRequest<T>(path: string, formData: FormData): Promise<T> {
  return request<T>(path, { method: "POST", body: formData });
}

export interface ListTicketsParams {
  search?: string;
  status?: TicketStatus | "";
}

export const api = {
  listUsers: () => request<User[]>("/users"),

  getUser: (id: number) => request<User>(`/users/${id}`),

  uploadProfilePhoto: (userId: number, file: File) => {
    const formData = new FormData();
    formData.append("photo", file);
    return uploadRequest<User>(`/users/${userId}/profile-photo`, formData);
  },

  deleteProfilePhoto: (userId: number) =>
    request<User>(`/users/${userId}/profile-photo`, { method: "DELETE" }),

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

  getPlatformConfig: () => request<PlatformConfig>("/platform/config"),
  updatePlatformConfig: (payload: Partial<PlatformConfig>) =>
    request<PlatformConfig>("/platform/config", {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  getPacks: () =>
    request<{
      packs: SubscriptionPack[];
      entitlementGroups: { id: number; code: string; name: string }[];
    }>("/platform/packs"),

  login: (email: string, password: string) =>
    request<AuthSession>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  register: (name: string, email: string, password: string) =>
    request<AuthSession>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    }),
  logout: () => request<void>("/auth/logout", { method: "POST" }),
  me: () =>
    request<{
      account: { id: number; email: string; name: string };
      profileId: number | null;
      profileType: string | null;
      profiles: ViewerProfile[];
      subscriptions: unknown[];
    }>("/auth/me"),
  selectProfile: (profileId: number) =>
    request<{ profile: ViewerProfile }>("/auth/profile", {
      method: "POST",
      body: JSON.stringify({ profileId }),
    }),

  home: (experience: Experience) =>
    request<{ experience: Experience; adSlotEveryN: number; rails: HomeRail[] }>(
      `/catalog/home?experience=${experience}`,
    ),
  searchCatalog: (experience: Experience, q: string) =>
    request<SeriesCard[]>(
      `/catalog/search?experience=${experience}&q=${encodeURIComponent(q)}`,
    ),
  getSeries: (id: number) => request<SeriesDetail>(`/catalog/series/${id}`),
  getPlayback: (episodeId: number) =>
    request<PlaybackPayload>(`/playback/episodes/${episodeId}`),
  saveProgress: (payload: {
    episodeId: number;
    positionSeconds: number;
    durationSeconds: number;
    completed?: boolean;
  }) =>
    request("/playback/progress", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  watchlist: (experience: Experience) =>
    request<SeriesCard[]>(`/library/watchlist?experience=${experience}`),
  addWatchlist: (seriesId: number) =>
    request<{ message: string }>("/library/watchlist", {
      method: "POST",
      body: JSON.stringify({ seriesId }),
    }),
  removeWatchlist: (seriesId: number) =>
    request<{ message: string }>(`/library/watchlist/${seriesId}`, { method: "DELETE" }),
  continueWatching: (experience: Experience) =>
    request<SeriesCard[]>(`/library/continue-watching?experience=${experience}`),
  subscribe: (payload: {
    packCode: PackCode;
    billingCycle: "WEEKLY" | "ANNUAL";
    purchaseChannel?: "WEB" | "IAP";
    entitlementGroupId?: number;
  }) =>
    request("/library/subscribe", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};
