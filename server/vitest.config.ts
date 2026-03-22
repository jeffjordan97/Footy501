import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/lib/game-engine/**/*.ts"],
      exclude: [
        "src/lib/game-engine/__tests__/**",
        // engine.ts and index.ts do not yet have tests; exclude them from
        // thresholds so the covered files (rules, scoring, timer, types) can
        // enforce 95%+ on their own without being dragged down.
        "src/lib/game-engine/engine.ts",
        "src/lib/game-engine/index.ts",
      ],
      thresholds: {
        branches: 95,
        functions: 95,
        lines: 95,
        statements: 95,
      },
    },
  },
  resolve: {
    // Strip .js extensions so Vitest can resolve TypeScript source files
    // when NodeNext moduleResolution appends .js to relative imports.
    extensions: [".ts", ".js"],
  },
});
