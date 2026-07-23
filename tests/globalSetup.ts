import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

/**
 * Vitest global setup for backend integration tests.
 *
 * Creates a dedicated SQLite test database (separate from the dev DB) and
 * applies the Prisma schema to it via `prisma db push --force-reset` so each
 * test run starts from a clean, up-to-date schema. The same DATABASE_URL is
 * configured for the test workers in vitest.config.ts.
 */
const TEST_DATABASE_URL = "file:../data/test.db";

export default function setup() {
  const dirname = path.dirname(fileURLToPath(import.meta.url));
  const backendDir = path.resolve(dirname, "../src/backend");

  execSync("npx prisma db push --force-reset --skip-generate", {
    cwd: backendDir,
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: "inherit",
  });
}
