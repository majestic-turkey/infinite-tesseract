import { describe, expect, it } from "vitest"
import { Item, ItemType, Slot } from "../../../packages/shared/schemas/items.js"
import { expectInvalid, expectValid, omit, validItem } from "../test-utils/fixtures.js"

describe("Slot", () => {
  it.each(Slot.options)("accepts %s", (slot) => {
    expectValid(Slot, slot)
  })

  it("rejects an unknown slot", () => {
    expectInvalid(Slot, "hands")
  })
})

describe("ItemType", () => {
  it.each(ItemType.options)("accepts %s", (type) => {
    expectValid(ItemType, type)
  })

  it("rejects an unknown type", () => {
    expectInvalid(ItemType, "potion")
  })
})

describe("Item", () => {
  it("applies defaults to a minimal item", () => {
    const item = expectValid(Item, omit(validItem(), "slot"))
    expect(item).toEqual({
      id: "item-1",
      name: "Rusty Sword",
      category: "weapon",
      tier: 1,
      twoHanded: false,
      bonuses: {},
      qty: 1,
    })
    expect(item).not.toHaveProperty("slot")
  })

  it("accepts a fully specified item", () => {
    const input = { ...validItem(), twoHanded: true, bonuses: { strength: 2, will: -1 }, qty: 3 }
    expect(expectValid(Item, input)).toEqual(input)
  })

  it("strips unknown keys", () => {
    expect(expectValid(Item, { ...validItem(), damage: 99 })).not.toHaveProperty("damage")
  })

  it.each(["id", "name", "category", "tier"] as const)("requires %s", (key) => {
    expectInvalid(Item, omit(validItem(), key), [key])
  })

  it("accepts tier 0", () => {
    expectValid(Item, { ...validItem(), tier: 0 })
  })

  it.each([
    ["negative tier", { tier: -1 }, ["tier"]],
    ["fractional tier", { tier: 1.5 }, ["tier"]],
    ["zero qty", { qty: 0 }, ["qty"]],
    ["fractional qty", { qty: 1.5 }, ["qty"]],
    ["unknown category", { category: "potion" }, ["category"]],
    ["unknown slot", { slot: "hands" }, ["slot"]],
    ["non-boolean twoHanded", { twoHanded: "yes" }, ["twoHanded"]],
    ["bonus for an unknown stat", { bonuses: { luck: 1 } }, ["bonuses"]],
    ["fractional bonus", { bonuses: { strength: 0.5 } }, ["bonuses", "strength"]],
  ])("rejects %s", (_, overrides, path) => {
    expectInvalid(Item, { ...validItem(), ...overrides }, path)
  })
})
