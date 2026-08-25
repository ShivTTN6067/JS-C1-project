import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler.js";
import { prisma } from "../lib/prisma.js";
import {
  InvalidTransitionError,
  NotFoundError,
  ValidationError,
} from "../lib/errors.js";
import {
  allowedNextStatuses,
  canTransition,
  type TicketStatus,
} from "../domain/statusMachine.js";
import {
  addCommentSchema,
  changeStatusSchema,
  createTicketSchema,
  listTicketsQuerySchema,
  updateTicketSchema,
} from "../validation/schemas.js";

export const ticketsRouter = Router();

const ticketInclude = {
  createdBy: true,
  assignedTo: true,
} as const;

async function assertUserExists(id: number, field: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new ValidationError(`${field} references a non-existent user (id=${id})`);
  }
}

/** GET /api/tickets?search=&status= - list with keyword search + status filter. */
ticketsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { search, status } = listTicketsQuerySchema.parse(req.query);

    const tickets = await prisma.ticket.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(search
          ? {
              OR: [
                { title: { contains: search } },
                { description: { contains: search } },
              ],
            }
          : {}),
      },
      include: ticketInclude,
      orderBy: { updatedAt: "desc" },
    });

    res.json(tickets);
  }),
);

/** POST /api/tickets - create a ticket. */
ticketsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = createTicketSchema.parse(req.body);

    await assertUserExists(data.createdById, "createdById");
    if (data.assignedToId != null) {
      await assertUserExists(data.assignedToId, "assignedToId");
    }

    const ticket = await prisma.ticket.create({
      data: {
        title: data.title,
        description: data.description,
        priority: data.priority,
        status: "OPEN",
        createdById: data.createdById,
        assignedToId: data.assignedToId ?? null,
      },
      include: ticketInclude,
    });

    res.status(201).json(ticket);
  }),
);

/** GET /api/tickets/:id - detail incl. comments. */
ticketsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw new ValidationError("Invalid ticket id");

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        ...ticketInclude,
        comments: {
          include: { createdBy: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!ticket) throw new NotFoundError(`Ticket ${id} not found`);

    res.json({
      ...ticket,
      allowedNextStatuses: allowedNextStatuses(ticket.status as TicketStatus),
    });
  }),
);

/** PATCH /api/tickets/:id - update editable fields (not status). */
ticketsRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw new ValidationError("Invalid ticket id");

    const data = updateTicketSchema.parse(req.body);

    const existing = await prisma.ticket.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError(`Ticket ${id} not found`);

    if (data.assignedToId != null) {
      await assertUserExists(data.assignedToId, "assignedToId");
    }

    const ticket = await prisma.ticket.update({
      where: { id },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.description !== undefined
          ? { description: data.description }
          : {}),
        ...(data.priority !== undefined ? { priority: data.priority } : {}),
        ...(data.assignedToId !== undefined
          ? { assignedToId: data.assignedToId }
          : {}),
      },
      include: ticketInclude,
    });

    res.json(ticket);
  }),
);

/** PATCH /api/tickets/:id/status - transition status via the state machine. */
ticketsRouter.patch(
  "/:id/status",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw new ValidationError("Invalid ticket id");

    const { status: nextStatus } = changeStatusSchema.parse(req.body);

    const existing = await prisma.ticket.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError(`Ticket ${id} not found`);

    const currentStatus = existing.status as TicketStatus;

    if (!canTransition(currentStatus, nextStatus)) {
      throw new InvalidTransitionError(
        `Cannot change status from ${currentStatus} to ${nextStatus}`,
        { from: currentStatus, to: nextStatus, allowed: allowedNextStatuses(currentStatus) },
      );
    }

    // Compare-and-swap on the current status so a concurrent transition cannot
    // overwrite a newer state with a stale read (TOCTOU race).
    const updated = await prisma.ticket.updateMany({
      where: { id, status: currentStatus },
      data: { status: nextStatus },
    });

    if (updated.count === 0) {
      const latest = await prisma.ticket.findUnique({ where: { id } });
      if (!latest) throw new NotFoundError(`Ticket ${id} not found`);

      const latestStatus = latest.status as TicketStatus;
      throw new InvalidTransitionError(
        `Cannot change status from ${latestStatus} to ${nextStatus}`,
        {
          from: latestStatus,
          to: nextStatus,
          allowed: allowedNextStatuses(latestStatus),
        },
      );
    }

    const ticket = await prisma.ticket.findUniqueOrThrow({
      where: { id },
      include: ticketInclude,
    });

    res.json({
      ...ticket,
      allowedNextStatuses: allowedNextStatuses(nextStatus),
    });
  }),
);

/** POST /api/tickets/:id/comments - add a comment. */
ticketsRouter.post(
  "/:id/comments",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw new ValidationError("Invalid ticket id");

    const data = addCommentSchema.parse(req.body);

    const ticket = await prisma.ticket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundError(`Ticket ${id} not found`);

    await assertUserExists(data.createdById, "createdById");

    const comment = await prisma.comment.create({
      data: {
        ticketId: id,
        message: data.message,
        createdById: data.createdById,
      },
      include: { createdBy: true },
    });

    res.status(201).json(comment);
  }),
);
