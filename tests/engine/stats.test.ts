import { describe, expect, it } from "vitest"
import { effectiveStats } from "../../packages/engine/utils/stats.js"
import { Character, Item } from "../../packages/shared/schemas.js"
import { validCharacter, validItem } from "../shared/test-utils/fixtures.js"

const item = (id: string, bonuses: Record<string, number>, slot = "mainHand") =>
  Item.parse({ ...validItem(), id, slot, bonuses })

const character = (inventory: Item[], equipment: Record<string, string>) =>
  Character.parse({ ...validCharacter(), inventory, equipment })

// Every fixture stat has rank 3
const base = { strength: 3, dexterity: 3, will: 3, charisma: 3 }

describe("effectiveStats", () => {
  it("returns base ranks with nothing equipped", () => {
    expect(effectiveStats(character([], {}))).toEqual(base)
  })

  it("adds an equipped item's bonus to only its stat", () => {
    const c = character([item("sword", { strength: 2 })], { mainHand: "sword" })
    expect(effectiveStats(c)).toEqual({ ...base, strength: 5 })
  })

  it("sums bonuses across slots, including negatives", () => {
    const c = character(
      [item("sword", { dexterity: 2, strength: -1 }), item("helm", { dexterity: 1 }, "head")],
      { mainHand: "sword", head: "helm" },
    )
    expect(effectiveStats(c)).toEqual({ ...base, dexterity: 6, strength: 2 })
  })

  it("ignores items held but not equipped", () => {
    const c = character([item("sword", { strength: 2 })], {})
    expect(effectiveStats(c)).toEqual(base)
  })

  it("ignores a slot pointing at an item no longer held", () => {
    expect(effectiveStats(character([], { mainHand: "gone" }))).toEqual(base)
  })
})
