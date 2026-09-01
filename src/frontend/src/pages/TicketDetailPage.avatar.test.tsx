import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TicketDetailPage from "./TicketDetailPage";
import { api } from "../api/client";
import type { Ticket, User } from "../types";

const reporter: User = {
  id: 1,
  name: "Alice Nguyen",
  email: "alice@test.local",
  role: "AGENT",
  profilePhotoUrl: "/uploads/avatars/alice.jpg",
};

const assignee: User = {
  id: 2,
  name: "Bob Martinez",
  email: "bob@test.local",
  role: "AGENT",
  profilePhotoUrl: null,
};

function makeTicket(): Ticket {
  return {
    id: 9,
    title: "VPN outage",
    description: "Office VPN is down",
    priority: "HIGH",
    status: "OPEN",
    createdById: reporter.id,
    assignedToId: assignee.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: reporter,
    assignedTo: assignee,
    allowedNextStatuses: ["IN_PROGRESS", "CANCELLED"],
    comments: [
      {
        id: 1,
        ticketId: 9,
        message: "Looking into this",
        createdById: reporter.id,
        createdAt: new Date().toISOString(),
        createdBy: reporter,
      },
    ],
  };
}

describe("TicketDetailPage avatars", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(api, "getTicket").mockResolvedValue(makeTicket());
    vi.spyOn(api, "listUsers").mockResolvedValue([reporter, assignee]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders reporter, assignee, and comment author avatars", async () => {
    render(
      <MemoryRouter initialEntries={["/tickets/9"]}>
        <Routes>
          <Route path="/tickets/:id" element={<TicketDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole("heading", { name: "VPN outage" })).toBeInTheDocument();

    const photos = screen.getAllByRole("img", { name: "Alice Nguyen's profile photo" });
    expect(photos.length).toBeGreaterThanOrEqual(2);
    expect(photos[0]).toHaveAttribute("src", "/uploads/avatars/alice.jpg");
    expect(screen.getByText("BM")).toBeInTheDocument();
  });
});
