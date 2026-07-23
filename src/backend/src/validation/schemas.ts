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
