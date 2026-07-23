# Candidate Information

<!-- TEMPLATE: Fill in your own details before submitting. -->

- **Name:** Shivang Garg
- **Role:** SSE
- **Primary Technology Stack:** JavaScript / TypeScript (React, Node.js)
- **Primary AI Tool Used:** Cursor
- **Project Option Selected:** Support Ticket Management System (Core)
- **Assessment Start Date:** 2026-07-22
- **Submission Date:** 2026-07-23

## Project Summary

A full-stack Support Ticket Management System: a React + TypeScript frontend, an
Express + TypeScript REST API, and a SQLite database (via Prisma). Internal users
can create, list, view, update, comment on, search, and progress tickets through
an enforced status state machine. See `README.md` for setup.

## Tools Used

- **Cursor** — primary AI-assisted development (planning, code generation,
  testing, debugging, review, documentation). See `tool-workflow.md` and
  `tool-specific/cursor-workflow/`.
- _<add any other tools you used, e.g. Prisma Studio, Postman>_

## Setup Summary

- Backend: `cd src/backend && npm install && cp .env.example .env && npx prisma migrate dev && npm run dev`
- Frontend: `cd src/frontend && npm install && npm run dev`
- Tests: `npm test` in each package.
