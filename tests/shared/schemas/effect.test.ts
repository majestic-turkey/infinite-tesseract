import { describe, expect, it } from "vitest"
import { Effect } from "../../../packages/shared/schemas/effect.js"
import { expectInvalid, expectValid, validItem } from "../test-utils/fixtures.js"

// [kind, input, expected output after defaults]
const validEffects = [
  ["damage", { kind: "damage", amount: 5 }, { kind: "damage", amount: 5 }],
  ["heal", { kind: "heal", amount: 5 }, { kind: "heal", amount: 5 }],
  ["gold", { kind: "gold", amount: -10 }, { kind: "gold", amount: -10 }],
  ["xp", { kind: "xp", stat: "will", amount: 3 }, { kind: "xp", stat: "will", amount: 3 }],
  [
    "gainItem",
    { kind: "gainItem", item: validItem() },
    { kind: "gainItem", item: { ...validItem(), twoHanded: false, bonuses: {}, qty: 1 } },
  ],
  ["loseItem", { kind: "loseItem", itemId: "item-1" }, { kind: "loseItem", itemId: "item-1", qty: 1 }],
  ["gainPerk", { kind: "gainPerk", perk: "Keen Eye" }, { kind: "gainPerk", perk: "Keen Eye" }],
  ["reputation", { kind: "reputation" }, { kind: "reputation", renown: 0, morality: 0 }],
  ["move", { kind: "move", sceneId: "scene-2" }, { kind: "move", sceneId: "scene-2" }],
] as const

describe("Effect", () => {
  it("has a test case for every kind", () => {
    const kinds = Effect.options.map((option) => option.shape.kind.value)
    expect(validEffects.map(([kind]) => kind).sort()).toEqual([...kinds].sort())
  })

  it.each(validEffects)("accepts %s and applies defaults", (_, input, expected) => {
    expect(expectValid(Effect, input)).toEqual(expected)
  })

  it("strips fields that belong to other kinds", () => {
    expect(expectValid(Effect, { kind: "damage", amount: 2, sceneId: "scene-2" })).toEqual({ kind: "damage", amount: 2 })
  })

  it.each([
    ["missing kind", { amount: 5 }, ["kind"]],
    ["unknown kind", { kind: "teleport", sceneId: "scene-2" }, ["kind"]],
    ["negative damage", { kind: "damage", amount: -1 }, ["amount"]],
    ["fractional damage", { kind: "damage", amount: 1.5 }, ["amount"]],
    ["damage without amount", { kind: "damage" }, ["amount"]],
    ["negative heal", { kind: "heal", amount: -1 }, ["amount"]],
    ["fractional gold", { kind: "gold", amount: 0.5 }, ["amount"]],
    ["xp for an unknown stat", { kind: "xp", stat: "luck", amount: 1 }, ["stat"]],
    ["negative xp", { kind: "xp", stat: "will", amount: -1 }, ["amount"]],
    ["gainItem with an invalid item", { kind: "gainItem", item: { ...validItem(), tier: -1 } }, ["item", "tier"]],
    ["gainItem without an item", { kind: "gainItem" }, ["item"]],
    ["loseItem without itemId", { kind: "loseItem" }, ["itemId"]],
    ["loseItem with zero qty", { kind: "loseItem", itemId: "item-1", qty: 0 }, ["qty"]],
    ["non-string perk", { kind: "gainPerk", perk: 1 }, ["perk"]],
    ["fractional renown", { kind: "reputation", renown: 0.5 }, ["renown"]],
    ["fractional morality", { kind: "reputation", morality: 0.5 }, ["morality"]],
    ["move without sceneId", { kind: "move" }, ["sceneId"]],
  ])("rejects %s", (_, input, path) => {
    expectInvalid(Effect, input, path)
  })
})
