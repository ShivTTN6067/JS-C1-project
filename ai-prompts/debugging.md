# AI Prompts — Debugging

Full write-ups (problem, investigation, fix, validation) are in
`debugging-notes.md`. This file records the debugging prompts.

---

## DB1 — Test runner can't load supertest

**Prompt (summary):** "Vitest fails collecting the integration test with
`Cannot find module './lib/test.js'` from supertest. Explain the root cause and
the best fix."

**AI response (summary):** Explained it as an ESM/Vite transform vs. supertest's
CJS internal require; options were to inline, externalize, or drop supertest.
Recommended dropping it and testing the real server with `fetch`.

**Accepted:** the drop-and-use-fetch recommendation.
**Changed:** rewrote the suite with an ephemeral-port server + `fetch` helper;
removed supertest.
**Validated:** re-ran the suite -> 18/18 passing.

---

## DB2 — `tsc` rootDir error

**Prompt (summary):** "Backend `tsc` reports TS6059: `tests/globalSetup.ts` is not
under rootDir. How do I keep the build scoped but still run those tests?"

**AI response (summary):** The build `tsconfig` shouldn't include the sibling
`tests/`; Vitest transpiles the tests itself.

**Accepted:** removed `../../tests` from the backend `tsconfig` include.
**Validated:** `tsc --noEmit` clean; `npm test` still 18/18.

---

## DB3 — `import.meta.env` type error

**Prompt (summary):** "Frontend `tsc -b` says `Property 'env' does not exist on
type 'ImportMeta'`. Fix without casting to any."

**AI response (summary):** The explicit `types` array dropped Vite's client types;
add `"vite/client"`.

**Accepted:** added `vite/client` to `types`.
**Validated:** `npm run build` succeeds; component tests pass.
