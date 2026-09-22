import { describe, expect, it } from "vitest"
import { createClaudeNarrator } from "../../packages/agent/agent.js"
import { validGameState } from "../shared/test-utils/fixtures.js"

describe("createClaudeNarrator", () => {
  it("creates a narrator that delegates to generatePrompt", async () => {
    const narrator = createClaudeNarrator()
    await expect(narrator.nextTurn(validGameState(), { text: "Look around" } as never)).resolves.toEqual({})
  })

  it("uses a provided client instead of constructing one", () => {
    const client = { custom: true } as never

    const narrator = createClaudeNarrator({ client })

    expect(narrator).toHaveProperty("nextTurn")
  })
})