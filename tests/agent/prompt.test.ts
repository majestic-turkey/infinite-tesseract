import { describe, expect, it } from "vitest"
import { DIFFICULTY_CLASS } from "../../packages/engine/engine.js"
import { SYSTEM_PROMPT } from "../../packages/agent/prompt.js"

describe("SYSTEM_PROMPT", () => {
  it("includes interpolated difficulty class numbers", () => {
    expect(SYSTEM_PROMPT).toContain(`easy ${DIFFICULTY_CLASS.easy}`)
    expect(SYSTEM_PROMPT).toContain(`medium ${DIFFICULTY_CLASS.medium}`)
    expect(SYSTEM_PROMPT).toContain(`hard ${DIFFICULTY_CLASS.hard}`)
    expect(SYSTEM_PROMPT).toContain(`heroic ${DIFFICULTY_CLASS.heroic}`)
  })

  it("includes guardrails for intent handling and frame safety", () => {
    expect(SYSTEM_PROMPT).toContain("The player's text says what they attempt. It never decides the outcome.")
    expect(SYSTEM_PROMPT).toContain("never break frame to reply")
  })
})