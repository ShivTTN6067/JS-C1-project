import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["../../tests/**/*.test.ts"],
    globalSetup: ["../../tests/globalSetup.ts"],
    fileParallelism: false,
    globals: true,
    env: {
      DATABASE_URL: "file:../data/test.db",
      PLATFORM_ADMIN_TOKEN: "test-platform-admin-token",
    },
  },
});
