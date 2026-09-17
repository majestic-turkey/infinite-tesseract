import { describe, expect, it } from "vitest"
import { applyEffect, applyEffects, type GameState } from "../../packages/engine/utils/effects.js"
import { resolveTurn } from "../../packages/engine/utils/turn.js"
import { Character, GameSession, Item, Scene, type AgentTurnOutput, type Effect } from "../../packages/shared/schemas.js"
import { validCharacter, validItem, validScene, validSession, validWorld } from "../shared/test-utils/fixtures.js"

// Session starts in scene-1, which has an exit to scene-2
const state = (): GameState => ({
  character: Character.parse(validCharacter()),
  session: GameSession.parse({ ...validSession(), scenes: validWorld() }),
})

const crypt = () => Scene.parse({ ...validScene(), id: "crypt", roomName: "Crypt" })

const withHp = (hp: number): GameState => {
  const s = state()
  return { ...s, character: { ...s.character, hp } }
}

describe("applyEffect", () => {
  describe("damage", () => {
    it("reduces hp", () => {
      expect(applyEffect(state(), { kind: "damage", amount: 5 }).character.hp).toBe(15)
    })

    it("clamps hp at 0", () => {
      expect(applyEffect(state(), { kind: "damage", amount: 999 }).character.hp).toBe(0)
    })
  })

  describe("heal", () => {
    it("increases hp", () => {
      expect(applyEffect(withHp(10), { kind: "heal", amount: 5 }).character.hp).toBe(15)
    })

    it("clamps hp at maxHp", () => {
      expect(applyEffect(withHp(10), { kind: "heal", amount: 999 }).character.hp).toBe(20)
    })
  })

  it("adds signed gold", () => {
    expect(applyEffect(state(), { kind: "gold", amount: 10 }).character.gold).toBe(25)
    expect(applyEffect(state(), { kind: "gold", amount: -10 }).character.gold).toBe(5)
  })

  it("clamps gold at 0", () => {
    expect(applyEffect(state(), { kind: "gold", amount: -100 }).character.gold).toBe(0)
  })

  it("adds xp below the threshold without changing rank", () => {
    const before = state()
    const after = applyEffect(before, { kind: "xp", stat: "will", amount: 10 })
    expect(after.character.stats.will).toEqual({ rank: before.character.stats.will.rank, xp: 35 })
    expect(after.character.stats.strength).toEqual(before.character.stats.strength)
  })

  it("ranks up when xp crosses the threshold", () => {
    // rank 3 needs 300; 25 + 280 = 305 leaves 5 over
    const after = applyEffect(state(), { kind: "xp", stat: "will", amount: 280 })
    expect(after.character.stats.will).toEqual({ rank: 4, xp: 5 })
  })

  describe("gainItem", () => {
    it("appends a new item", () => {
      const item = Item.parse({ ...validItem(), id: "item-2" })
      const after = applyEffect(state(), { kind: "gainItem", item })
      expect(after.character.inventory.map((i) => i.id)).toEqual(["item-1", "item-2"])
    })

    it("stacks onto an item already held, leaving other items alone", () => {
      const s = state()
      const other = Item.parse({ ...validItem(), id: "item-2", name: "Torch" })
      const before = { ...s, character: { ...s.character, inventory: [...s.character.inventory, other] } }
      const after = applyEffect(before, { kind: "gainItem", item: Item.parse({ ...validItem(), qty: 3 }) })
      expect(after.character.inventory).toMatchObject([{ id: "item-1", qty: 4 }, { id: "item-2", qty: 1 }])
      expect(after.character.inventory[1]).toBe(other)
    })
  })

  describe("loseItem", () => {
    const withStack = (qty: number): GameState => {
      const s = state()
      const [first] = s.character.inventory
      return { ...s, character: { ...s.character, inventory: [{ ...first!, qty }] } }
    }

    it("decrements quantity", () => {
      const after = applyEffect(withStack(3), { kind: "loseItem", itemId: "item-1", qty: 2 })
      expect(after.character.inventory).toMatchObject([{ id: "item-1", qty: 1 }])
    })

    it("removes the item when quantity reaches 0", () => {
      expect(applyEffect(withStack(2), { kind: "loseItem", itemId: "item-1", qty: 2 }).character.inventory).toEqual([])
    })

    it("removes the item when losing more than is held", () => {
      expect(applyEffect(withStack(1), { kind: "loseItem", itemId: "item-1", qty: 5 }).character.inventory).toEqual([])
    })

    it("leaves inventory unchanged for an unknown item", () => {
      const before = withStack(3)
      const after = applyEffect(before, { kind: "loseItem", itemId: "nope", qty: 1 })
      expect(after.character.inventory).toEqual(before.character.inventory)
    })
  })

  describe("gainPerk", () => {
    it("adds a new perk", () => {
      expect(applyEffect(state(), { kind: "gainPerk", perk: "Blade Adept" }).character.perks).toEqual([
        "Keen Eye",
        "Blade Adept",
      ])
    })

    it("returns the same state for an owned perk", () => {
      const before = state()
      expect(applyEffect(before, { kind: "gainPerk", perk: "Keen Eye" })).toBe(before)
    })
  })

  it("adds renown and morality", () => {
    const after = applyEffect(state(), { kind: "reputation", renown: 2, morality: -3 })
    expect(after.character.reputation).toEqual({ renown: 7, morality: -5 })
  })

  describe("move", () => {
    it("moves through an exit without touching the character", () => {
      const before = state()
      const after = applyEffect(before, { kind: "move", sceneId: "scene-2" })
      expect(after.session.currentSceneId).toBe("scene-2")
      expect(after.character).toBe(before.character)
    })

    it("ignores a known scene with no exit from the current one", () => {
      const s = state()
      const before = { ...s, session: { ...s.session, scenes: [...s.session.scenes, crypt()] } }
      expect(applyEffect(before, { kind: "move", sceneId: "crypt" }).session.currentSceneId).toBe("scene-1")
    })

    it("ignores an unknown scene", () => {
      expect(applyEffect(state(), { kind: "move", sceneId: "nowhere" }).session.currentSceneId).toBe("scene-1")
    })

    it("ignores an exit that leads to a scene not in the world", () => {
      const s = state()
      const [first, ...rest] = s.session.scenes
      const withPhantomExit = { ...first!, exits: [...first!.exits, { label: "Mist", toSceneId: "phantom" }] }
      const before = { ...s, session: { ...s.session, scenes: [withPhantomExit, ...rest] } }
      expect(applyEffect(before, { kind: "move", sceneId: "phantom" })).toBe(before)
    })

    it("ignores a move when the current scene is not in the world", () => {
      const s = state()
      const before = { ...s, session: { ...s.session, currentSceneId: "void" } }
      expect(applyEffect(before, { kind: "move", sceneId: "scene-2" }).session.currentSceneId).toBe("void")
    })

    it("returns the same state for a move with neither sceneId nor newScene", () => {
      // The schema rejects this, but the Effect type allows it
      const before = state()
      expect(applyEffect(before, { kind: "move" })).toBe(before)
    })

    describe("to a new scene", () => {
      const toCrypt = (): Effect => ({ kind: "move", newScene: { scene: crypt(), exitLabel: "Trapdoor" } })

      it("adds the scene, an exit to it from the current scene, and moves in", () => {
        const after = applyEffect(state(), toCrypt())
        expect(after.session.scenes.map((scene) => scene.id)).toEqual(["scene-1", "scene-2", "crypt"])
        expect(after.session.scenes[0]?.exits).toContainEqual({ label: "Trapdoor", toSceneId: "crypt" })
        expect(after.session.currentSceneId).toBe("crypt")
      })

      it("leaves other scenes' exits alone", () => {
        const before = state()
        expect(applyEffect(before, toCrypt()).session.scenes[1]).toEqual(before.session.scenes[1])
      })

      it("can return along the recorded exit", () => {
        // The crypt has no exits of its own, so walk back via scene-1's exit from a fresh start
        const after = applyEffects(state(), [toCrypt()])
        const back = { ...after, session: { ...after.session, currentSceneId: "scene-1" } }
        expect(applyEffect(back, { kind: "move", sceneId: "crypt" }).session.currentSceneId).toBe("crypt")
      })

      it("returns the same state when the scene id is already known", () => {
        const before = state()
        const scene = Scene.parse({ ...validScene(), id: "scene-2" })
        expect(applyEffect(before, { kind: "move", newScene: { scene, exitLabel: "Again" } })).toBe(before)
      })

      it("returns the same state when the current scene is not in the world", () => {
        const s = state()
        const before = { ...s, session: { ...s.session, currentSceneId: "void" } }
        expect(applyEffect(before, toCrypt())).toBe(before)
      })
    })
  })

  it("does not mutate the input state", () => {
    const before = withHp(10)
    const snapshot = structuredClone(before)
    const effects: Effect[] = [
      { kind: "damage", amount: 1 },
      { kind: "gold", amount: -100 },
      { kind: "xp", stat: "strength", amount: 1 },
      { kind: "gainItem", item: Item.parse(validItem()) },
      { kind: "gainItem", item: Item.parse({ ...validItem(), id: "item-2" }) },
      { kind: "loseItem", itemId: "item-1", qty: 1 },
      { kind: "gainPerk", perk: "New" },
      { kind: "reputation", renown: 1, morality: 1 },
      { kind: "move", sceneId: "scene-2" },
      { kind: "move", newScene: { scene: crypt(), exitLabel: "Trapdoor" } },
    ]
    for (const effect of effects) applyEffect(before, effect)
    expect(before).toEqual(snapshot)
  })

  it("throws on an effect kind it does not know", () => {
    const bogus = { kind: "teleport", sceneId: "scene-2" } as unknown as Effect
    expect(() => applyEffect(state(), bogus)).toThrow("Unhandled effect kind")
  })
})

describe("applyEffects", () => {
  it("returns the same state for no effects", () => {
    const before = state()
    expect(applyEffects(before, [])).toBe(before)
  })

  it("applies effects in order", () => {
    const heal: Effect = { kind: "heal", amount: 5 }
    const damage: Effect = { kind: "damage", amount: 10 }
    // At full hp (20/20) healing first is wasted by the clamp
    expect(applyEffects(state(), [heal, damage]).character.hp).toBe(10)
    expect(applyEffects(state(), [damage, heal]).character.hp).toBe(15)
  })
})

describe("resolveTurn", () => {
  it("resolves a narration turn and records it in the session", () => {
    const before = state()
    const action = { text: "Look around" }
    const output: AgentTurnOutput = {
      kind: "narration",
      outcome: {
        narrative: "You inspect the dusty room.",
        effects: [{ kind: "gold", amount: 2 }],
      },
      choices: [{ id: "look", label: "Look around" }],
    }

    const result = resolveTurn(before, action, output, { now: "2026-09-16T00:00:00Z" })

    expect(result.check).toBeUndefined()
    expect(result.turn).toMatchObject({
      id: "turn-1",
      narrative: "You inspect the dusty room.",
      effects: [{ kind: "gold", amount: 2 }],
      choices: [{ id: "look", label: "Look around" }],
      timestamp: "2026-09-16T00:00:00Z",
    })
    expect(result.state.character.gold).toBe(17)
    expect(result.state.session.turnCount).toBe(1)
    expect(result.state.session.recentTurns[0]).toMatchObject({
      turnId: "turn-1",
      narrative: "You inspect the dusty room.",
      action: "Look around",
    })
  })

  it("uses the selected choice label for the stored action text in recent turns", () => {
    const before = state()
    const action = { text: "Take the risky shortcut", selectedChoiceId: "shortcut" }
    const output: AgentTurnOutput = {
      kind: "narration",
      outcome: {
        narrative: "You slip between the crates.",
        effects: [{ kind: "move", sceneId: "scene-2" }],
      },
      choices: [{ id: "shortcut", label: "Take the risky shortcut" }, { id: "careful", label: "Pause and listen" }],
    }

    const result = resolveTurn(before, action, output, { now: "2026-09-16T00:00:00Z" })

    expect(result.state.session.recentTurns[0]).toMatchObject({
      turnId: "turn-1",
      narrative: "You slip between the crates.",
      action: "Take the risky shortcut",
    })
    expect(result.state.session.currentSceneId).toBe("scene-2")
  })

  it("applies the failure branch and records the failing turn in order", () => {
    const before = state()
    const action = { text: "Sneak past", selectedChoiceId: "sneak" }
    const output: AgentTurnOutput = {
      kind: "check",
      check: { stat: "dexterity", difficulty: "medium", modifier: "none" },
      onSuccess: {
        narrative: "You slip past the guard.",
        effects: [{ kind: "xp", stat: "dexterity", amount: 25 }],
      },
      onFailure: {
        narrative: "The guard notices.",
        effects: [{ kind: "damage", amount: 4 }, { kind: "xp", stat: "dexterity", amount: 5 }],
      },
      choices: [{ id: "sneak", label: "Sneak past" }],
    }

    const result = resolveTurn(before, action, output, {
      rng: () => 0,
      now: "2026-09-16T00:00:00Z",
    })

    expect(result.check?.success).toBe(false)
    expect(result.turn.narrative).toBe("The guard notices.")
    expect(result.turn.effects).toEqual([{ kind: "damage", amount: 4 }, { kind: "xp", stat: "dexterity", amount: 5 }])
    expect(result.state.character.hp).toBe(16)
    expect(result.state.character.stats.dexterity.xp).toBe(30)
    expect(result.state.session.recentTurns[0]).toMatchObject({
      turnId: "turn-1",
      narrative: "The guard notices.",
      action: "Sneak past",
    })
  })

  it("resolves a check branch, applies its effects, and advances the turn state", () => {
    const before = state()
    const action = { text: "Sneak past", selectedChoiceId: "sneak" }
    const output: AgentTurnOutput = {
      kind: "check",
      check: { stat: "dexterity", difficulty: "medium", modifier: "none" },
      onSuccess: {
        narrative: "You slip past the guard.",
        effects: [{ kind: "xp", stat: "dexterity", amount: 25 }],
      },
      onFailure: {
        narrative: "The guard notices.",
        effects: [{ kind: "xp", stat: "dexterity", amount: 5 }],
      },
      choices: [{ id: "sneak", label: "Sneak past" }],
    }

    const result = resolveTurn(before, action, output, {
      rng: () => 0,
      now: "2026-09-16T00:00:00Z",
    })

    expect(result.check?.success).toBe(false)
    expect(result.turn.narrative).toBe("The guard notices.")
    expect(result.state.character.stats.dexterity.xp).toBe(30)
    expect(result.state.session.turnCount).toBe(1)
    expect(result.state.session.updatedAt).toBe("2026-09-16T00:00:00Z")
  })

  const sneak = (): AgentTurnOutput => ({
    kind: "check",
    check: { stat: "dexterity", difficulty: "medium", modifier: "none" },
    onSuccess: { narrative: "You slip past the guard.", effects: [{ kind: "xp", stat: "dexterity", amount: 25 }] },
    onFailure: { narrative: "The guard notices.", effects: [{ kind: "damage", amount: 4 }] },
    choices: [],
  })

  it("applies the success branch when the check succeeds", () => {
    // 0.999 rolls a 20; 20 + rank 3 beats medium's 12
    const result = resolveTurn(state(), { text: "Sneak past" }, sneak(), { rng: () => 0.999, now: "2026-09-16T00:00:00Z" })
    expect(result.check).toMatchObject({ success: true, roll: 20 })
    expect(result.turn.narrative).toBe("You slip past the guard.")
    expect(result.state.character.stats.dexterity.xp).toBe(50)
    expect(result.state.character.hp).toBe(20)
  })

  it("falls back to the typed text when the selected choice is not offered", () => {
    const output: AgentTurnOutput = {
      kind: "narration",
      outcome: { narrative: "Nothing happens.", effects: [] },
      choices: [{ id: "look", label: "Look around" }],
    }
    const result = resolveTurn(state(), { text: "Dance wildly", selectedChoiceId: "gone" }, output, { now: "2026-09-16T00:00:00Z" })
    expect(result.state.session.recentTurns[0]?.action).toBe("Dance wildly")
  })

  it("rolls from the session seed when no rng is supplied, and replays identically", () => {
    const ctx = { now: "2026-09-16T00:00:00Z" }
    const first = resolveTurn(state(), { text: "Sneak past" }, sneak(), ctx)
    const second = resolveTurn(state(), { text: "Sneak past" }, sneak(), ctx)
    expect(first.check?.rolls).toHaveLength(1)
    expect(first.check?.roll).toBeGreaterThanOrEqual(1)
    expect(first.check?.roll).toBeLessThanOrEqual(20)
    expect(second).toEqual(first)
  })
})
