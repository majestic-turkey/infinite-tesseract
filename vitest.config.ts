import { defineConfig } from "vitest/config"
import { loadEnv } from "vite"

export default defineConfig(({ mode }) => ({
  test: {
    // Vitest does not read .env on its own. The empty prefix loads unprefixed names too,
    // so ANTHROPIC_API_KEY reaches process.env where the SDK looks for it.
    env: loadEnv(mode, ".", ""),
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["packages/**/*.ts"],
      reporter: ["text", "html"],
      // Fail the run if any source line, branch, function or statement goes untested
      thresholds: { lines: 100, branches: 100, functions: 100, statements: 100 },
    },
  },
}))
