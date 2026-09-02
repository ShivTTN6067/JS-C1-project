import { z } from "zod";
import { TICKET_PRIORITIES, TICKET_STATUSES } from "../domain/statusMachine.js";

/**
 * Zod schemas for request validation. Parsing failures are converted into
 * 400 responses by the route handlers / error middleware.
 */

export const createTicketSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().trim().min(1, "Description is required").max(5000),
  priority: z.enum(TICKET_PRIORITIES).default("MEDIUM"),
  createdById: z.number().int().positive(),
  assignedToId: z.number().int().positive().nullable().optional(),
});

export const updateTicketSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().min(1).max(5000).optional(),
    priority: z.enum(TICKET_PRIORITIES).optional(),
    assignedToId: z.number().int().positive().nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export const changeStatusSchema = z.object({
  status: z.enum(TICKET_STATUSES),
});

export const addCommentSchema = z.object({
  message: z.string().trim().min(1, "Comment message is required").max(2000),
  createdById: z.number().int().positive(),
});

export const listTicketsQuerySchema = z.object({
  search: z.string().trim().optional(),
  status: z.enum(TICKET_STATUSES).optional(),
});

export const userIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export const registerSchema = z.object({
  email: z.string().trim().email(),
  name: z.string().trim().min(1).max(80),
  password: z.string().min(6).max(100),
});

export const selectProfileSchema = z.object({
  profileId: z.number().int().positive(),
});

export const platformConfigSchema = z.object({
  deploymentMode: z.enum(["HYBRID", "VR_ONLY", "MD_ONLY"]).optional(),
  adSlotEveryN: z.number().int().min(1).max(20).optional(),
});

export const experienceQuerySchema = z.object({
  experience: z.enum(["MD", "VR"]),
});

export const searchQuerySchema = z.object({
  experience: z.enum(["MD", "VR"]),
  q: z.string().trim().min(1).max(80),
});

export const progressSchema = z.object({
  episodeId: z.number().int().positive(),
  positionSeconds: z.number().min(0),
  durationSeconds: z.number().positive(),
  completed: z.boolean().optional(),
});

export const watchlistSchema = z.object({
  seriesId: z.number().int().positive(),
});

export const subscribeSchema = z.object({
  packCode: z.enum(["PACK_1", "PACK_2", "PACK_3"]),
  billingCycle: z.enum(["WEEKLY", "ANNUAL"]),
  purchaseChannel: z.enum(["WEB", "IAP"]).default("WEB"),
  entitlementGroupId: z.number().int().positive().optional(),
});

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});
