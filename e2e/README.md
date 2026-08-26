# Playwright End-to-End Regression Tests

These tests exercise the Support Ticket Management System through the browser so QA can catch UI and integration regressions.

## Prerequisites

- Node.js 18+
- Backend and frontend dependencies installed:

```bash
cd src/backend && npm ci
cd ../frontend && npm ci
cd ../..
npm install
npx playwright install chromium
```

The first run of `npm install` at the repository root installs `@playwright/test`. Run `npx playwright install chromium` once to download the browser.

## Run the regression suite

From the repository root:

```bash
npm run test:e2e
```

Playwright starts the backend (`http://localhost:4000`) and frontend (`http://localhost:5173`) automatically. If those servers are already running locally, they are reused.

### Other useful commands

```bash
npm run test:e2e:headed   # Run with a visible browser window
npm run test:e2e:ui       # Open the Playwright UI runner
npm run test:e2e:report     # Open the HTML report after a run
```

## What is covered

| Area | Checks |
| --- | --- |
| Ticket list | Seeded tickets render, keyword search, status filter |
| Profiles | Upload and remove a profile photo |
| Ticket create | Form submission and detail redirect |
| Ticket detail | Edit fields, status transition, add comment |
| Navigation | Header links between tickets, profiles, and create page |

Tests run serially against the shared SQLite dev database. Each run resets data to the seed snapshot before executing.

## Troubleshooting

- **Port already in use:** Stop existing dev servers on ports `4000` and `5173`, or let Playwright reuse them.
- **Missing browser:** Run `npx playwright install chromium`.
- **Database errors:** Ensure `src/backend/.env` exists (`cp src/backend/.env.example src/backend/.env`) and run `cd src/backend && npx prisma migrate deploy && npm run db:seed`.

## CI

Set `CI=1` to disable server reuse and enable a retry on failure:

```bash
CI=1 npm run test:e2e
```
