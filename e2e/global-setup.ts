import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const backendDir = path.join(repoRoot, "src/backend");

function run(command: string) {
  execSync(command, {
    cwd: backendDir,
    stdio: "inherit",
    env: process.env,
  });
}

export default function globalSetup() {
  const envPath = path.join(backendDir, ".env");
  if (!fs.existsSync(envPath)) {
    fs.copyFileSync(path.join(backendDir, ".env.example"), envPath);
  }

  run("npx prisma generate");
  run("npx prisma migrate deploy");
  run("npm run db:seed");
}
