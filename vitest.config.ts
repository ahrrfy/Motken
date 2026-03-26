import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client/src"),
      "@shared": path.resolve(__dirname, "shared"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: [
      "server/__tests__/**/*.test.ts",
      "client/__tests__/**/*.test.ts",
      "client/__tests__/**/*.test.tsx",
    ],
    exclude: ["node_modules", "dist"],
    coverage: {
      provider: "v8",
      include: [
        "server/**/*.ts",
        "shared/**/*.ts",
      ],
      exclude: [
        "server/__tests__/**",
        "server/vite.ts",
        "script/**",
      ],
    },
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
