import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const backendDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../src/backend",
);

/** Reset the dev database to the deterministic seed snapshot. */
export function resetDatabase() {
  execSync("npm run db:seed", {
    cwd: backendDir,
    stdio: "inherit",
  });
}
