# Review Fixes

Concrete changes made in response to the review (`code-review-notes.md`) and
debugging findings (`debugging-notes.md`).

| # | Finding | Fix | File(s) |
| - | ------- | --- | ------- |
| 1 | Bad `createdById`/`assignedToId` surfaced as a generic 500 | Added `assertUserExists` pre-checks returning `400` with a clear message | `src/backend/src/routes/tickets.ts` |
| 2 | Empty update body would be a no-op | `updateTicketSchema` refined to require at least one field | `src/backend/src/validation/schemas.ts` |
| 3 | Status could in theory be changed via the generic update | Kept status out of `PATCH /:id`; only `PATCH /:id/status` changes it (state-machine enforced) | `src/backend/src/routes/tickets.ts` |
| 4 | Fragile HTTP test client (supertest) broke under Vitest | Replaced with real-server + `fetch` harness; removed supertest deps | `tests/tickets.integration.test.ts`, `src/backend/package.json`, `src/backend/vitest.config.ts` |
| 5 | Backend `tsc` build pulled in sibling `tests/` (rootDir error) | Scoped backend build `include` to `src`/`prisma` | `src/backend/tsconfig.json` |
| 6 | Frontend `import.meta.env` untyped | Added `vite/client` to `types` | `src/frontend/tsconfig.json` |

## Verification After Fixes

- Backend: `npm test` -> 18/18 passing; `tsc --noEmit` clean.
- Frontend: `npm test` -> 3/3 passing; `npm run build` succeeds.
- Manual API smoke test re-run (see `test-results.md`) — all checks pass,
  including invalid-transition rejection.
