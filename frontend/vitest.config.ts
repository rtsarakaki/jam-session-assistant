import path from "node:path";
import { defineConfig } from "vitest/config";

/**
 * Cobertura medida só em módulos `lib/` adequados a testes unitários puros.
 * Ao acrescentar código em `lib/`, inclui o glob aqui e cobre com testes para manter ≥ 80%.
 */
const coverageInclude = [
  "lib/validation/**/*.ts",
  "lib/auth/safe-post-auth-path.ts",
  "lib/auth/user-display.ts",
  "lib/platform/friends-candidates.ts",
  "lib/platform/link-preview-meta.ts",
];

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: ["node_modules/**", ".next/**"],
    coverage: {
      provider: "v8",
      reportsDirectory: "./coverage",
      include: coverageInclude,
      exclude: ["**/*.test.ts", "**/*.d.ts", "**/node_modules/**"],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
