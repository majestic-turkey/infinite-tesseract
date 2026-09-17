import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["packages/**/*.ts"],
      reporter: ["text", "html"],
      // Fail the run if any source line, branch, function or statement goes untested
      thresholds: { lines: 100, branches: 100, functions: 100, statements: 100 },
    },
  },
})
