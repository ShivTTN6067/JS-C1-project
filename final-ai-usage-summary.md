# Final AI Usage Summary

<!-- TEMPLATE: Summarize, in your own words, how AI factored into the final
     result. Replace the prompts below before submitting. Italic notes point to
     supporting evidence in the repo. -->

## One-paragraph summary

_<Summarize how AI (Cursor) was used end-to-end and how you stayed in control of
the result. Evidence: `tool-workflow.md`, `ai-prompts/`.>_

## Where AI added the most value

- _<e.g. scaffolding and boilerplate>_
- _<e.g. exhaustive test-case enumeration for the state machine>_
- _<e.g. root-causing tooling/interop errors>_

## Where I drove the decisions (not AI)

- _<e.g. choosing SQLite/Prisma and the layering>_
- _<e.g. keeping status changes on a dedicated endpoint so the state machine
  can't be bypassed>_
- _<e.g. scope discipline: Core only, invest in artifacts>_

## How I ensured quality and ownership

- _<e.g. every change validated by `tsc` + tests + smoke tests; hand-checked the
  transition rules; reviewed generated code before accepting.>_

## Honest limitations

- _<e.g. no auth, limited automated frontend coverage, no E2E/CI — see
  `pr-description.md`.>_

## Traceability

- Requirements: `requirements-analysis.md`, `acceptance-criteria.md`
- Design: `design-notes.md`, `api-contract.md`, `data-model.md`, `ui-flow.md`
- Implementation: `src/backend/`, `src/frontend/`
- Tests: `tests/`, `src/frontend/src/pages/TicketListPage.test.tsx`,
  `test-strategy.md`, `test-results.md`
- Debugging/Review: `debugging-notes.md`, `code-review-notes.md`, `review-fixes.md`
- Prompt history: `ai-prompts/`
- Tool context: `tool-specific/cursor-workflow/`
