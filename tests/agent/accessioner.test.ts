import { describe, expect, it } from "vitest"
import { accessionOutput } from "../../packages/agent/accessioner.js"
import type { GameState } from "../../packages/engine/engine.js"
import { AgentTurnOutput, Character, GameSession, WireAgentTurnOutput } from "../../packages/shared/schemas.js"
import { validCharacter, validCheck, validScene, validSession, validWorld } from "../shared/test-utils/fixtures.js"

// turnCount 4 means this is turn 5, so minted ids carry a 5 - the same numbering resolveTurn uses for turn ids
const makeState = (over: Partial<{ turnCount: number; scenes: unknown[] }> = {}): GameState => ({
  character: Character.parse(validCharacter()),
  session: GameSession.parse({
    ...validSession(),
    turnCount: over.turnCount ?? 4,
    scenes: over.scenes ?? validWorld(),
  }),
})

const potion = { name: "Potion", category: "consumable", tier: 1 }
const torch = { name: "Torch", category: "misc", tier: 1 }

// Defaults (qty, bonuses, twoHanded, empty effects/choices) come from the wire schema, as they will in production
const narration = (effects: unknown[] = [], choices: unknown[] = []) =>
  WireAgentTurnOutput.parse({
    kind: "narration",
    outcome: { narrative: "The room exhales.", effects },
    choices,
  })

const checked = (onSuccessEffects: unknown[] = [], onFailureEffects: unknown[] = []) =>
  WireAgentTurnOutput.parse({
    kind: "check",
    check: validCheck(),
    onSuccess: { narrative: "You slip past.", effects: onSuccessEffects },
    onFailure: { narrative: "You slip and fall.", effects: onFailureEffects },
    choices: [],
  })

const asNarration = (output: AgentTurnOutput) => {
  if (output.kind !== "narration") throw new Error("expected a narration turn")
  return output
}

const asCheck = (output: AgentTurnOutput) => {
  if (output.kind !== "check") throw new Error("expected a check turn")
  return output
}

describe("accessionOutput", () => {
  it("returns output the engine schema accepts", () => {
    const result = accessionOutput(
      narration(
        [{ kind: "gainItem", item: potion }, { kind: "move", newScene: { scene: { roomName: "Low Tunnel", description: "It narrows." }, exitLabel: "the low tunnel" } }],
        [{ label: "Press on" }, { label: "Turn back" }],
      ),
      makeState(),
    )

    expect(() => AgentTurnOutput.parse(result)).not.toThrow()
  })

  it("mints sequential choice ids from the turn number", () => {
    const result = accessionOutput(narration([], [{ label: "Press on" }, { label: "Turn back" }]), makeState())

    expect(result.choices.map((choice) => choice.id)).toEqual(["choice-5-1", "choice-5-2"])
    expect(result.choices.map((choice) => choice.label)).toEqual(["Press on", "Turn back"])
  })

  it("gives two new items in one turn different ids", () => {
    const result = asNarration(
      accessionOutput(narration([{ kind: "gainItem", item: potion }, { kind: "gainItem", item: torch }]), makeState()),
    )

    expect(result.outcome.effects[0]).toMatchObject({ kind: "gainItem", item: { id: "item-5-1", name: "Potion", qty: 1 } })
    expect(result.outcome.effects[1]).toMatchObject({ kind: "gainItem", item: { id: "item-5-2", name: "Torch", qty: 1 } })
  })

  // Otherwise applyEffect can never stack: it merges on item.id, so a fresh id always adds a second line
  it("reuses the existing inventory id when an item matches by name and tier", () => {
    const result = asNarration(
      accessionOutput(
        narration([{ kind: "gainItem", item: { name: "Rusty Sword", category: "weapon", tier: 1, qty: 2 } }]),
        makeState(),
      ),
    )

    expect(result.outcome.effects[0]).toMatchObject({ kind: "gainItem", item: { id: "item-1", qty: 2 } })
  })

  it("mints an id for a new scene", () => {
    const result = asNarration(
      accessionOutput(
        narration([{ kind: "move", newScene: { scene: { roomName: "Wet Stairs", description: "They go down." }, exitLabel: "the stairs down" } }]),
        makeState(),
      ),
    )

    expect(result.outcome.effects[0]).toMatchObject({
      kind: "move",
      newScene: { exitLabel: "the stairs down", scene: { id: "scene-5-1", roomName: "Wet Stairs" } },
    })
  })

  // applyEffect drops a move whose scene id is already known, so a collision would silently strand the player
  it("never mints a scene id that already exists", () => {
    const state = makeState({ scenes: [...validWorld(), { ...validScene(), id: "scene-5-1" }] })
    const result = asNarration(
      accessionOutput(
        narration([{ kind: "move", newScene: { scene: { roomName: "Wet Stairs", description: "They go down." }, exitLabel: "the stairs down" } }]),
        state,
      ),
    )

    const known = state.session.scenes.map((scene) => scene.id)
    const effect = result.outcome.effects[0]
    const mintedId = effect?.kind === "move" && "newScene" in effect ? effect.newScene.scene.id : undefined

    expect(mintedId).toBeDefined()
    expect(known).not.toContain(mintedId)
  })

  it("leaves effects that carry no new entity untouched", () => {
    const effects = [
      { kind: "heal", amount: 2 },
      { kind: "gold", amount: -5 },
      { kind: "xp", stat: "dexterity", amount: 10 },
      { kind: "loseItem", itemId: "item-1", qty: 1 },
      { kind: "gainPerk", perk: "cave-sight" },
      { kind: "reputation", renown: 1, morality: -1 },
      { kind: "move", sceneId: "scene-2" },
    ]
    const wire = narration(effects)
    const result = asNarration(accessionOutput(wire, makeState()))

    expect(result.outcome.effects).toEqual(asNarration(AgentTurnOutput.parse(wire)).outcome.effects)
  })

  it("mints ids across both branches of a check turn without repeating one", () => {
    const result = asCheck(
      accessionOutput(
        checked([{ kind: "gainItem", item: { name: "Key", category: "key", tier: 1 } }], [{ kind: "gainItem", item: potion }]),
        makeState({ turnCount: 9 }),
      ),
    )

    const successEffect = result.onSuccess.effects[0]
    const failureEffect = result.onFailure.effects[0]
    const successId = successEffect?.kind === "gainItem" ? successEffect.item.id : undefined
    const failureId = failureEffect?.kind === "gainItem" ? failureEffect.item.id : undefined

    expect(successId).toMatch(/^item-10-\d+$/)
    expect(failureId).toMatch(/^item-10-\d+$/)
    expect(successId).not.toBe(failureId)
  })
})
