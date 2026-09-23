// Live smoke test - spends real money, so it is skipped unless SMOKE_TEST is set:
//   $env:SMOKE_TEST=1; npx vitest run tests/smoke/liveTurn.test.ts
// It is not a unit test: it checks that the request shape, the wire schema and the prompt
// survive contact with the real API, and prints what came back so the writing can be judged.
import { describe, expect, it } from "vitest"
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod"
import { createClaudeNarrator } from "../../packages/agent/agent.js"
import { createSession, resolveTurn, type GameState } from "../../packages/engine/engine.js"
import { Character, WireAgentTurnOutput } from "../../packages/shared/schemas.js"
import { validCharacter } from "../shared/test-utils/fixtures.js"

// tsconfig sets types: [], so there are no node globals to lean on here
declare const process: { env: Record<string, string | undefined> }

const live = process.env.SMOKE_TEST ? it : it.skip
const TURN_TIMEOUT = 180_000

const newGame = (): GameState => ({
  character: Character.parse(validCharacter()),
  session: createSession({
    id: "smoke-session",
    userId: "user-1",
    characterId: "char-1",
    rootSeed: 1,
    now: new Date().toISOString(),
  }),
})

// Cheap enough to always run: if the schema can't be converted, every live call fails
it("converts the wire schema to a structured output format", () => {
  const format = zodOutputFormat(WireAgentTurnOutput)

  expect(format).toBeDefined()
  if (process.env.SMOKE_TEST) console.log(JSON.stringify(format, null, 2))
})

describe("live narrator", () => {
  live(
    "narrates a first turn the engine can resolve",
    async () => {
      const state = newGame()
      const narrator = createClaudeNarrator()
      const action = { text: "Reach out and press a palm against one face of the Tesseract" }

      const output = await narrator.nextTurn(state, action)
      console.log(JSON.stringify(output, null, 2))

      // The model must not mint ids - these come from accessionOutput
      for (const choice of output.choices) expect(choice.id).toMatch(/^choice-1-\d+$/)

      const result = resolveTurn(state, action, output, { now: new Date().toISOString() })
      expect(result.turn.narrative.length).toBeGreaterThan(0)
      expect(result.state.session.turnCount).toBe(1)
      console.log(result.check ? `check: ${JSON.stringify(result.check)}` : "narration turn, no check")
    },
    TURN_TIMEOUT,
  )

  live(
    "narrates a second turn from a chosen option",
    async () => {
      const narrator = createClaudeNarrator()
      const state = newGame()
      const firstAction = { text: "Look for the least unsettling face of the Tesseract" }

      const first = await narrator.nextTurn(state, firstAction)
      const afterFirst = resolveTurn(state, firstAction, first, { now: new Date().toISOString() }).state
      console.log("turn 1:", first.kind, "|", JSON.stringify(first.choices.map((c) => c.label)))

      // Take the model up on its own first choice, which exercises the pendingChoices round trip
      const pending = afterFirst.session.pendingChoices[0]
      const secondAction = pending
        ? { text: pending.label, selectedChoiceId: pending.id }
        : { text: "Step through whatever opening presents itself" }

      const second = await narrator.nextTurn(afterFirst, secondAction)
      console.log("turn 2:", JSON.stringify(second, null, 2))

      const result = resolveTurn(afterFirst, secondAction, second, { now: new Date().toISOString() })
      expect(result.state.session.turnCount).toBe(2)
      expect(result.state.session.recentTurns).toHaveLength(2)
      // Turn 2's ids are minted from the new turn number
      for (const choice of second.choices) expect(choice.id).toMatch(/^choice-2-\d+$/)
    },
    TURN_TIMEOUT * 2,
  )
})
