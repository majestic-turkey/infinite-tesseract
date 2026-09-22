import { describe, expect, it } from "vitest"
import { accessionOutput } from "../../packages/agent/accessioner.js"

describe("accessionOutput", () => {
  it("adds ids to gainItem effects in a narration turn", () => {
    const result = accessionOutput(
      {
        kind: "narration",
        outcome: {
          narrative: "You find a potion.",
          effects: [{ kind: "gainItem", item: { name: "Potion", category: "consumable", tier: 1, twoHanded: false, bonuses: {}, qty: 1 } }],
        },
        choices: [],
      },
      4,
    )

    expect(result.kind).toBe("narration")
    expect(result.outcome.effects).toHaveLength(1)
    expect(result.outcome.effects[0]).toMatchObject({
      kind: "gainItem",
      item: { id: "5", name: "Potion", qty: 1 },
    })
  })

  it("leaves non-gainItem effects unchanged", () => {
    const result = accessionOutput(
      {
        kind: "check",
        check: { stat: "dexterity", difficulty: "medium", modifier: "none" },
        onSuccess: {
          narrative: "You slip past.",
          effects: [{ kind: "heal", amount: 2 }],
        },
        onFailure: {
          narrative: "You slip and fall.",
          effects: [],
        },
        choices: [],
      },
      9,
    )

    expect(result.onSuccess.effects).toEqual([{ kind: "heal", amount: 2 }])
  })

  it("adds ids to gainItem effects in check branches", () => {
    const result = accessionOutput(
      {
        kind: "check",
        check: { stat: "dexterity", difficulty: "medium", modifier: "none" },
        onSuccess: {
          narrative: "You slip past.",
          effects: [{ kind: "gainItem", item: { name: "Key", category: "key", tier: 1, twoHanded: false, bonuses: {}, qty: 1 } }],
        },
        onFailure: {
          narrative: "You slip and fall.",
          effects: [],
        },
        choices: [],
      },
      9,
    )

    expect(result.kind).toBe("check")
    expect(result.onSuccess.effects).toHaveLength(1)
    expect(result.onSuccess.effects[0]).toMatchObject({
      kind: "gainItem",
      item: { id: "10", name: "Key", qty: 1 },
    })
  })
})
