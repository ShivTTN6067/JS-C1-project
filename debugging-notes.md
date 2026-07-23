# Debugging Notes

## Issue 1 — HTTP test client failed to load under Vitest (ESM interop)

### Problem

The first version of the integration tests used `supertest`. Running
`npm test` failed at suite collection with:

```
Error: Cannot find module './lib/test.js'
Require stack:
- .../src/backend/supertest
 FAIL  tests/tickets.integration.test.ts (0 test)
```

The state-machine unit test passed, so the failure was specific to how
`supertest` (CommonJS, with an internal `require('./lib/test.js')`) resolved
under Vitest's ESM/Vite transform. The module id was being rebased to the
backend root, so its relative internal require pointed at a non-existent path.

### How I Investigated

- Confirmed the app itself imported fine (the `.js`-extension ESM imports in the
  backend resolved correctly), isolating the problem to `supertest`.
- Tried Vitest's `server.deps.inline: ['supertest']` to force Vite to bundle it;
  the same error persisted, indicating an inlining/transform incompatibility with
  supertest's CJS internals rather than a missing-dep issue.

### How AI Helped

Asked the assistant to explain the resolution error and weigh options
(inline vs. externalize vs. drop supertest). It recommended removing the fragile
dependency and testing the real server directly, which also removes a dependency
from the tree.

### What I Validated

Rewrote the integration test to boot the Express app on an ephemeral port
(`app.listen(0)`) and drive it with Node's built-in `fetch` via a small `http()`
helper. Re-ran the suite: **18/18 passing**. I also removed `supertest` and
`@types/supertest` from `package.json` and reinstalled to confirm nothing else
depended on them.

### Final Fix

- Replaced supertest with a real-server + `fetch` harness in
  `tests/tickets.integration.test.ts`.
- Removed the `server.deps.inline` workaround and the supertest dependencies.
- Net result: fewer dependencies, no interop workaround, identical coverage.

---

## Issue 2 — `tsc` build error: files outside `rootDir`

### Problem

`npx tsc -p tsconfig.json --noEmit` in the backend reported:

```
error TS6059: File '.../tests/globalSetup.ts' is not under 'rootDir' 'src/backend'.
```

The backend `tsconfig.json` had included `../../tests` so tests would be
type-checked, but that conflicts with `rootDir` used by the `build` script.

### How I Investigated

Recognized this is a `rootDir`/`include` conflict: the build compiles `src` with
`rootDir: .`, so pulling in files from a sibling directory breaks the output
layout.

### How AI Helped

Confirmed the diagnosis and the cleanest fix: keep the build scoped to backend
source and let Vitest (esbuild) handle the test files, which it transpiles
without needing them in the build `tsconfig`.

### What I Validated

Removed `../../tests` from the backend `tsconfig.json` `include`. Re-ran
`tsc --noEmit` (clean) and `npm test` (still 18/18), confirming tests still run.

### Final Fix

Backend `tsconfig.json` includes only `src` and `prisma`.

---

## Issue 3 — Frontend type error: `import.meta.env`

### Problem

`tsc -b` on the frontend failed:

```
src/api/client.ts: error TS2339: Property 'env' does not exist on type 'ImportMeta'.
```

### How I Investigated

The frontend `tsconfig.json` set an explicit `types` array, which overrides the
default type inclusion and dropped Vite's client types that declare
`ImportMeta.env`.

### How AI Helped

Suggested adding `"vite/client"` to the `types` array (the idiomatic Vite fix)
rather than casting `import.meta` to `any`.

### What I Validated

Added `"vite/client"` to `compilerOptions.types`. `npm run build` then completed
and produced a production bundle; component tests still pass.

### Final Fix

`"types": ["vite/client", "vitest/globals", "@testing-library/jest-dom"]` in
`src/frontend/tsconfig.json`.
