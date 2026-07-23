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
