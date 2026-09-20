import { describe, expect, it } from "vitest"
import { generatePrompt } from "../../packages/agent/context.js"
import type { GameState } from "../../packages/engine/engine.js"
import { Character, GameSession } from "../../packages/shared/schemas.js"
import { TIMESTAMP, validCharacter, validSession, validWorld } from "../shared/test-utils/fixtures.js"

const makeState = (): GameState => ({
  character: Character.parse(validCharacter()),
  session: GameSession.parse({
    ...validSession(),
    summary: "A hush falls over the tavern.",
    recentTurns: [
      { turnId: "turn-1", narrative: "You enter.", action: "Open the door" },
      { turnId: "turn-2", narrative: "The barkeep stares.", action: "Step inside" },
    ],
    pendingChoices: [{ id: "choice-1", label: "Ask about rumors" }],
    scenes: [
      {
        ...validWorld()[0],
        exits: [
          { label: "Alley", toSceneId: "scene-2" },
          { label: "Broken arch", toSceneId: "missing-scene" },
        ],
        tags: ["safe", "social"],
      },
      validWorld()[1],
    ],
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
  }),
})

describe("generatePrompt", () => {
  it("renders game context, resolves selected choices, and defaults missing gold to 0", () => {
    const base = makeState()
    const state: GameState = {
      ...base,
      character: {
        ...base.character,
        gold: undefined,
      },
    }

    const prompt = generatePrompt(state, { text: "Ignore me", selectedChoiceId: "choice-1" })

    expect(prompt).toContain("=== Character ===")
    expect(prompt).toContain("name: Aria")
    expect(prompt).toContain("Gold on hand: 0")
    expect(prompt).toContain("Summary: A hush falls over the tavern.")
    expect(prompt).toContain("Current Scene: \"Dusty Tavern\"")
    expect(prompt).toContain("\"toSceneRoomName\": \"Alley\"")
    expect(prompt).toContain("\"toSceneId\": \"missing-scene\"")
    expect(prompt).toContain("Player Action: *Ask about rumors*")

    const newerTurnIndex = prompt.indexOf("The barkeep stares.")
    const olderTurnIndex = prompt.indexOf("You enter.")
    expect(newerTurnIndex).toBeGreaterThan(-1)
    expect(olderTurnIndex).toBeGreaterThan(-1)
    expect(newerTurnIndex).toBeLessThan(olderTurnIndex)
  })

  it("falls back to action text when selectedChoiceId has no match", () => {
    const prompt = generatePrompt(makeState(), {
      text: "Kick the doorframe twice for luck",
      selectedChoiceId: "choice-does-not-exist",
    })

    expect(prompt).toContain("Gold on hand: 15")
    expect(prompt).toContain("Player Action: *Kick the doorframe twice for luck*")
  })

  it("throws when character is missing", () => {
    const state = makeState() as unknown as { character?: GameState["character"]; session: GameState["session"] }
    delete state.character

    expect(() => generatePrompt(state as GameState, { text: "Look around" })).toThrow("Current character not found")
  })

  it("throws when current scene is missing", () => {
    const state: GameState = {
      ...makeState(),
      session: {
        ...makeState().session,
        currentSceneId: "scene-nowhere",
      },
    }

    expect(() => generatePrompt(state, { text: "Look around" })).toThrow("Current scene not found")
  })

  it("handles scenes without exits", () => {
    const base = makeState()
    const state: GameState = {
      ...base,
      session: {
        ...base.session,
        scenes: [
          {
            ...base.session.scenes[0]!,
            exits: undefined as unknown as typeof base.session.scenes[number]["exits"],
          },
          ...base.session.scenes.slice(1),
        ],
      },
    }

    const prompt = generatePrompt(state, { text: "Wait" })
    expect(prompt).toContain("Exits: undefined")
  })
})