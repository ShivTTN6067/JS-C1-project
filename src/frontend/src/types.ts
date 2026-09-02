export type TicketStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "RESOLVED"
  | "CLOSED"
  | "CANCELLED";

export type TicketPriority = "LOW" | "MEDIUM" | "HIGH";

export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  profilePhotoUrl?: string | null;
}

export interface Comment {
  id: number;
  ticketId: number;
  message: string;
  createdById: number;
  createdAt: string;
  createdBy?: User;
}

export interface Ticket {
  id: number;
  title: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  createdById: number;
  assignedToId: number | null;
  createdAt: string;
  updatedAt: string;
  createdBy?: User;
  assignedTo?: User | null;
  comments?: Comment[];
  allowedNextStatuses?: TicketStatus[];
}

export type DeploymentMode = "HYBRID" | "VR_ONLY" | "MD_ONLY";
export type Experience = "MD" | "VR";
export type ProfileType = "REGULAR" | "KIDS";
export type PackCode = "PACK_1" | "PACK_2" | "PACK_3";

export interface PlatformConfig {
  id: number;
  deploymentMode: DeploymentMode;
  adSlotEveryN: number;
}

export interface ViewerProfile {
  id: number;
  name: string;
  type: ProfileType;
}

export interface ViewerAccount {
  id: number;
  email: string;
  name: string;
}

export interface AuthSession {
  token: string;
  expiresAt: string;
  account: ViewerAccount;
  profile: ViewerProfile | null;
  profiles: ViewerProfile[];
}

export interface SeriesCard {
  id: number;
  title: string;
  synopsis: string;
  posterUrl: string;
  contentType: "MICRO_DRAMA" | "VOD";
  category: string;
  freeEpisodeThreshold: number;
  entitlementGroupId: number | null;
  adSlot?: boolean;
  resumeEpisodeId?: number;
  positionSeconds?: number;
  durationSeconds?: number;
  episodeTitle?: string;
}

export interface CatalogEpisode {
  id: number;
  number: number;
  title: string;
  synopsis: string;
  durationSeconds: number;
  isCliffhanger: boolean;
  posterUrl: string;
  locked: boolean;
  accessReason: string;
  progress: { positionSeconds: number; completed: boolean } | null;
}

export interface SeriesDetail extends SeriesCard {
  inWatchlist: boolean;
  entitlementGroup: { id: number; code: string; name: string } | null;
  seasons: { id: number; number: number; title: string; episodes: CatalogEpisode[] }[];
}

export interface HomeRail {
  id: number;
  title: string;
  type: string;
  category: string | null;
  items: SeriesCard[];
}

export interface PlaybackPayload {
  series: {
    id: number;
    title: string;
    contentType: string;
    category: string;
    freeEpisodeThreshold: number;
    posterUrl: string;
  };
  episode: {
    id: number;
    number: number;
    seasonNumber: number;
    title: string;
    synopsis: string;
    durationSeconds: number;
    isCliffhanger: boolean;
    posterUrl: string;
    videoUrl: string;
    renditions: { low: string; medium: string; high: string };
  };
  feed: {
    id: number;
    number: number;
    seasonNumber: number;
    title: string;
    posterUrl: string;
    isCliffhanger: boolean;
  }[];
  nextEpisodeId: number | null;
  prevEpisodeId: number | null;
  resumePositionSeconds: number;
  accessReason: string;
}

export interface SubscriptionPack {
  id: number;
  code: PackCode;
  name: string;
  billingCycle: "WEEKLY" | "ANNUAL";
  description: string;
  priceCents: number;
  coversVod: boolean;
  coversAllMd: boolean;
}

export interface PaywallDetails {
  paywall: true;
  reason: string;
  cliffhanger?: boolean;
  seriesId: number;
  episodeId: number;
  packs: SubscriptionPack[];
  entitlementGroups: { id: number; code: string; name: string }[];
  activePack: unknown;
}
