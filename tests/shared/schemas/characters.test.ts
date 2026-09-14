import { describe, expect, it } from "vitest"
import { Character } from "../../../packages/shared/schemas/characters.js"
import { expectInvalid, expectValid, omit, str, validCharacter, validItem, validStat } from "../test-utils/fixtures.js"

describe("Character", () => {
  it("accepts a valid character", () => {
    expectValid(Character, validCharacter())
  })

  it("applies item defaults to inventory entries", () => {
    const character = expectValid(Character, validCharacter())
    expect(character.inventory[0]).toMatchObject({ twoHanded: false, bonuses: {}, qty: 1 })
  })

  it("accepts empty equipment, inventory, and perks", () => {
    expectValid(Character, { ...validCharacter(), equipment: {}, inventory: [], perks: [] })
  })

  it("accepts equipment across multiple slots", () => {
    const equipment = { head: "item-2", mainHand: "item-1", accessory: "item-3" }
    expect(expectValid(Character, { ...validCharacter(), equipment }).equipment).toEqual(equipment)
  })

  it.each(["id", "name", "background", "hp", "maxHp", "gold", "stats", "equipment", "inventory", "perks", "reputation"] as const)(
    "requires %s",
    (key) => {
      expectInvalid(Character, omit(validCharacter(), key), [key])
    },
  )

  it("accepts boundary values", () => {
    expectValid(Character, { ...validCharacter(), name: str(1), background: "", hp: 0, maxHp: 1, gold: 0 })
    expectValid(Character, { ...validCharacter(), name: str(40), background: str(200) })
  })

  it.each([
    ["empty name", { name: "" }, ["name"]],
    ["name over 40 chars", { name: str(41) }, ["name"]],
    ["background over 200 chars", { background: str(201) }, ["background"]],
    ["negative hp", { hp: -1 }, ["hp"]],
    ["fractional hp", { hp: 1.5 }, ["hp"]],
    ["zero maxHp", { maxHp: 0 }, ["maxHp"]],
    ["negative gold", { gold: -1 }, ["gold"]],
    ["non-string perk", { perks: [42] }, ["perks", 0]],
  ])("rejects %s", (_, overrides, path) => {
    expectInvalid(Character, { ...validCharacter(), ...overrides }, path)
  })

  describe("stats", () => {
    it.each(["strength", "dexterity", "will", "charisma"] as const)("requires %s", (name) => {
      const stats = omit(validCharacter().stats, name)
      expectInvalid(Character, { ...validCharacter(), stats }, ["stats", name])
    })

    it("rejects an invalid stat", () => {
      const stats = { ...validCharacter().stats, will: { ...validStat(), rank: 0 } }
      expectInvalid(Character, { ...validCharacter(), stats }, ["stats", "will", "rank"])
    })
  })

  describe("equipment", () => {
    it("rejects an unknown slot", () => {
      expectInvalid(Character, { ...validCharacter(), equipment: { hands: "item-1" } }, ["equipment"])
    })

    it("rejects a non-string item id", () => {
      expectInvalid(Character, { ...validCharacter(), equipment: { head: 1 } }, ["equipment", "head"])
    })
  })

  it("rejects an invalid inventory item", () => {
    const inventory = [validItem(), { ...validItem(), qty: 0 }]
    expectInvalid(Character, { ...validCharacter(), inventory }, ["inventory", 1, "qty"])
  })

  describe("reputation", () => {
    it("accepts negative values", () => {
      expectValid(Character, { ...validCharacter(), reputation: { renown: -10, morality: -10 } })
    })

    it.each(["renown", "morality"] as const)("requires integer %s", (key) => {
      const reputation = { ...validCharacter().reputation, [key]: 0.5 }
      expectInvalid(Character, { ...validCharacter(), reputation }, ["reputation", key])
      expectInvalid(Character, { ...validCharacter(), reputation: omit(validCharacter().reputation, key) }, ["reputation", key])
    })
  })
})
