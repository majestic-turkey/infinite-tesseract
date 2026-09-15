import { describe, expect, it } from "vitest"
import { applyEffect, applyEffects, type GameState } from "../../packages/engine/utils/effects.js"
import { Character, GameSession, Item, type Effect } from "../../packages/shared/schemas.js"
import { validCharacter, validItem, validSession } from "../shared/test-utils/fixtures.js"

const state = (): GameState => ({
  character: Character.parse(validCharacter()),
  session: GameSession.parse(validSession()),
})

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

  it("adds xp to only the named stat without changing rank", () => {
    const before = state()
    const after = applyEffect(before, { kind: "xp", stat: "will", amount: 10 })
    expect(after.character.stats.will).toEqual({ rank: before.character.stats.will.rank, xp: 35 })
    expect(after.character.stats.strength).toEqual(before.character.stats.strength)
  })

  it("appends a gained item", () => {
    const item = Item.parse({ ...validItem(), id: "item-2" })
    const after = applyEffect(state(), { kind: "gainItem", item })
    expect(after.character.inventory.map((i) => i.id)).toEqual(["item-1", "item-2"])
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

  it("moves the session to a new scene without touching the character", () => {
    const before = state()
    const after = applyEffect(before, { kind: "move", sceneId: "scene-2" })
    expect(after.session.currentSceneId).toBe("scene-2")
    expect(after.character).toBe(before.character)
  })

  it("does not mutate the input state", () => {
    const before = withHp(10)
    const snapshot = structuredClone(before)
    const effects: Effect[] = [
      { kind: "damage", amount: 1 },
      { kind: "xp", stat: "strength", amount: 1 },
      { kind: "loseItem", itemId: "item-1", qty: 1 },
      { kind: "gainPerk", perk: "New" },
      { kind: "reputation", renown: 1, morality: 1 },
      { kind: "move", sceneId: "scene-2" },
    ]
    for (const effect of effects) applyEffect(before, effect)
    expect(before).toEqual(snapshot)
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
