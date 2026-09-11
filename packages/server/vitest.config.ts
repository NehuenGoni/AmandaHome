import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    testTimeout: 30000,
    hookTimeout: 30000,
    env: {
      NODE_ENV: "test",
      CLIENT_URL: "http://localhost:5173",
      MONGODB_URI: "mongodb://localhost:27017/amanda-test",
      JWT_ACCESS_SECRET: "test-access-secret-0123456789-0123456789",
      JWT_REFRESH_SECRET: "test-refresh-secret-0123456789-0123456789",
      JWT_ACCESS_EXPIRES_IN: "15m",
      JWT_REFRESH_EXPIRES_IN: "30d",
    },
  },
});
