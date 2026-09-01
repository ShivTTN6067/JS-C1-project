import path from "node:path";
import { fileURLToPath } from "node:url";
import { test, expect } from "@playwright/test";
import { resetDatabase } from "./helpers/reset-db";

const fixtureDir = path.dirname(fileURLToPath(import.meta.url));
const avatarFixture = path.join(fixtureDir, "fixtures", "test-avatar.jpg");

const seededTickets = [
  "Cannot log in after password reset",
  "Dashboard chart renders blank on Safari",
  "Add CSV export to reports page",
];

test.describe.configure({ mode: "serial" });

test.describe("Support Ticket System regression suite", () => {
  test.beforeAll(() => {
    resetDatabase();
  });

  test("loads the ticket list with seeded tickets", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "Tickets" })).toBeVisible();
    await expect(page.getByRole("searchbox", { name: "Search tickets" })).toBeVisible();

    for (const title of seededTickets) {
      await expect(page.getByRole("link", { name: new RegExp(title) })).toBeVisible();
    }
  });

  test("filters tickets by keyword search", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("searchbox", { name: "Search tickets" }).fill("Safari");

    await expect(
      page.getByRole("link", { name: /Dashboard chart renders blank on Safari/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Cannot log in after password reset/i }),
    ).not.toBeVisible();
  });

  test("filters tickets by status", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("searchbox", { name: "Search tickets" }).clear();

    await page.getByRole("button", { name: "In Progress", pressed: false }).click();

    await expect(
      page.getByRole("link", { name: /Dashboard chart renders blank on Safari/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Cannot log in after password reset/i }),
    ).not.toBeVisible();
  });

  test("uploads and removes a user profile photo", async ({ page }) => {
    await page.goto("/users");

    await expect(page.getByRole("heading", { name: "Team Profiles" })).toBeVisible();
    await page.getByRole("link", { name: /Alice Nguyen/i }).click();

    await expect(page.getByRole("heading", { name: "Alice Nguyen" })).toBeVisible();
    await expect(page.getByText("AN")).toBeVisible();

    await page.getByRole("button", { name: "Upload photo" }).click();
    await page.locator('input[type="file"]').setInputFiles(avatarFixture);

    await expect(page.getByRole("img", { name: "Alice Nguyen's profile photo" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Replace photo" })).toBeVisible();

    await page.getByRole("button", { name: "Remove photo" }).click();
    await expect(page.getByText("AN")).toBeVisible();
    await expect(page.getByRole("button", { name: "Upload photo" })).toBeVisible();
  });

  test("creates a new ticket and lands on the detail page", async ({ page }) => {
    const uniqueTitle = `QA regression ticket ${Date.now()}`;

    await page.goto("/tickets/new");

    await expect(page.getByRole("heading", { name: "New Ticket" })).toBeVisible();
    await page.getByPlaceholder("Short summary of the issue").fill(uniqueTitle);
    await page.getByPlaceholder("Describe the problem in detail").fill(
      "Created by Playwright regression test.",
    );
    await page.getByLabel("Priority").selectOption("HIGH");
    await page.getByLabel("Reporter").selectOption({ label: "Bob Martinez" });
    await page.getByLabel("Assignee (optional)").selectOption({ label: "Alice Nguyen" });

    await page.getByRole("button", { name: "Create Ticket" }).click();

    await expect(page).toHaveURL(/\/tickets\/\d+$/);
    await expect(page.getByRole("heading", { name: uniqueTitle })).toBeVisible();
    await expect(page.getByText("Created by Playwright regression test.")).toBeVisible();

    const details = page.locator("aside");
    await expect(details.getByText("High")).toBeVisible();
    await expect(details.getByText("Open")).toBeVisible();
    await expect(details.getByText("Alice Nguyen")).toBeVisible();
    await expect(details.getByText("Bob Martinez")).toBeVisible();
  });

  test("edits a ticket, changes status, and adds a comment", async ({ page }) => {
    const uniqueTitle = `QA workflow ticket ${Date.now()}`;
    const updatedTitle = `${uniqueTitle} (updated)`;
    const commentText = "Regression comment from Playwright.";

    await page.goto("/tickets/new");
    await page.getByPlaceholder("Short summary of the issue").fill(uniqueTitle);
    await page.getByPlaceholder("Describe the problem in detail").fill("Workflow test ticket.");
    await page.getByLabel("Reporter").selectOption({ label: "Carol Smith" });
    await page.getByRole("button", { name: "Create Ticket" }).click();

    await expect(page.getByRole("heading", { name: uniqueTitle })).toBeVisible();

    await page.getByRole("button", { name: "Edit" }).click();
    await page.locator("input.text-lg.font-semibold").fill(updatedTitle);
    await page.locator("textarea.input").first().fill("Updated description from QA.");
    await page.getByLabel("Priority").selectOption("LOW");
    await page.getByLabel("Assignee").selectOption({ label: "Bob Martinez" });
    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.getByRole("heading", { name: updatedTitle })).toBeVisible();
    await expect(page.getByText("Updated description from QA.")).toBeVisible();

    const details = page.locator("aside");
    await expect(details.getByText("Low")).toBeVisible();
    await expect(details.getByText("Bob Martinez")).toBeVisible();

    await page.getByRole("button", { name: "Move to In Progress" }).click();
    await expect(details.getByText("In Progress")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Move to In Progress" }),
    ).not.toBeVisible();

    await page.getByPlaceholder("Add a comment...").fill(commentText);
    await page.locator("form").filter({ hasText: "Comment" }).getByRole("combobox").selectOption({
      label: "Alice Nguyen",
    });
    await page.getByRole("button", { name: "Comment" }).click();

    await expect(page.getByText(commentText)).toBeVisible();
    await expect(
      page.locator("li").filter({ hasText: commentText }).getByText("Alice Nguyen"),
    ).toBeVisible();
  });

  test("navigates between primary pages from the header", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("link", { name: "Profiles" }).click();
    await expect(page).toHaveURL("/users");
    await expect(page.getByRole("heading", { name: "Team Profiles" })).toBeVisible();

    await page.getByRole("link", { name: "Support Tickets" }).click();
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("heading", { name: "Tickets" })).toBeVisible();

    await page.getByRole("link", { name: "New Ticket" }).click();
    await expect(page).toHaveURL("/tickets/new");
    await expect(page.getByRole("heading", { name: "New Ticket" })).toBeVisible();
  });
});
