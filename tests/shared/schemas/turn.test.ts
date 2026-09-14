import { describe, expect, it } from "vitest"
import { AgentTurnOutput, Choice, PlayerAction, StatDelta, TrimmedTurn, Turn } from "../../../packages/shared/schemas/turn.js"
import {
  TIMESTAMP,
  expectInvalid,
  expectValid,
  omit,
  str,
  validAgentTurnOutput,
  validChoice,
  validItem,
  validTrimmedTurn,
  validTurn,
} from "../test-utils/fixtures.js"

const turnDefaults = {
  hpDelta: 0,
  goldDelta: 0,
  xpGained: {},
  itemsGained: [],
  itemsLost: [],
  perksGained: [],
  reputationDelta: { renown: 0, morality: 0 },
  choices: [],
}

describe("StatDelta", () => {
  it.each([{}, { strength: 5 }, { dexterity: -3, charisma: 0 }])("accepts %j", (delta) => {
    expect(expectValid(StatDelta, delta)).toEqual(delta)
  })

  it("rejects an unknown stat", () => {
    expectInvalid(StatDelta, { luck: 1 })
  })

  it("rejects a fractional delta", () => {
    expectInvalid(StatDelta, { will: 1.5 }, ["will"])
  })
})

describe("Choice", () => {
  it("accepts a choice without a description", () => {
    const choice = expectValid(Choice, validChoice())
    expect(choice).toEqual(validChoice())
    expect(choice).not.toHaveProperty("description")
  })

  it("accepts boundary lengths", () => {
    expectValid(Choice, { ...validChoice(), label: str(100), description: str(500) })
  })

  it.each(["id", "label"] as const)("requires %s", (key) => {
    expectInvalid(Choice, omit(validChoice(), key), [key])
  })

  it.each([
    ["label over 100 chars", { label: str(101) }, ["label"]],
    ["description over 500 chars", { description: str(501) }, ["description"]],
  ])("rejects %s", (_, overrides, path) => {
    expectInvalid(Choice, { ...validChoice(), ...overrides }, path)
  })
})

describe("PlayerAction", () => {
  it("accepts free text alone", () => {
    expect(expectValid(PlayerAction, { text: "Look around" })).toEqual({ text: "Look around" })
  })

  it("accepts a selected choice", () => {
    const input = { text: "Approach the bar", selectedChoiceId: "choice-1" }
    expect(expectValid(PlayerAction, input)).toEqual(input)
  })

  it("requires text", () => {
    expectInvalid(PlayerAction, { selectedChoiceId: "choice-1" }, ["text"])
  })

  it("rejects a non-string selectedChoiceId", () => {
    expectInvalid(PlayerAction, { text: "Go", selectedChoiceId: 1 }, ["selectedChoiceId"])
  })
})

describe("AgentTurnOutput", () => {
  it("applies defaults to a minimal output", () => {
    const output = expectValid(AgentTurnOutput, validAgentTurnOutput())
    expect(output).toEqual({ ...validAgentTurnOutput(), ...turnDefaults })
    expect(output).not.toHaveProperty("locationChange")
  })

  it("accepts a fully specified output", () => {
    const input = {
      narrative: "You find a sword and lose your torch.",
      hpDelta: -4,
      goldDelta: 10,
      xpGained: { strength: 5 },
      itemsGained: [{ ...validItem(), twoHanded: false, bonuses: {}, qty: 1 }],
      itemsLost: ["item-torch"],
      perksGained: ["Blade Adept"],
      reputationDelta: { renown: 1, morality: -1 },
      locationChange: "scene-2",
      choices: [validChoice()],
    }
    expect(expectValid(AgentTurnOutput, input)).toEqual(input)
  })

  it("fills in a partial reputationDelta", () => {
    const output = expectValid(AgentTurnOutput, { ...validAgentTurnOutput(), reputationDelta: { renown: 3 } })
    expect(output.reputationDelta).toEqual({ renown: 3, morality: 0 })
  })

  it("does not require an id or timestamp", () => {
    expect(expectValid(AgentTurnOutput, validAgentTurnOutput())).not.toHaveProperty("id")
  })
})

// Turn duplicates AgentTurnOutput's fields, so run the shared validation against both
describe.each([
  ["AgentTurnOutput", AgentTurnOutput, validAgentTurnOutput],
  ["Turn", Turn, validTurn],
] as const)("%s field validation", (_, schema, valid) => {
  it("requires narrative", () => {
    expectInvalid(schema, omit(valid(), "narrative"), ["narrative"])
  })

  it.each([
    ["fractional hpDelta", { hpDelta: 1.5 }, ["hpDelta"]],
    ["fractional goldDelta", { goldDelta: 0.1 }, ["goldDelta"]],
    ["xp for an unknown stat", { xpGained: { luck: 1 } }, ["xpGained"]],
    ["fractional xp", { xpGained: { will: 0.5 } }, ["xpGained", "will"]],
    ["an invalid gained item", { itemsGained: [{ ...validItem(), tier: -1 }] }, ["itemsGained", 0, "tier"]],
    ["a non-string lost item id", { itemsLost: [1] }, ["itemsLost", 0]],
    ["a non-string perk", { perksGained: [null] }, ["perksGained", 0]],
    ["fractional renown", { reputationDelta: { renown: 0.5 } }, ["reputationDelta", "renown"]],
    ["a non-string locationChange", { locationChange: 2 }, ["locationChange"]],
    ["an invalid choice", { choices: [{ id: "c", label: str(101) }] }, ["choices", 0, "label"]],
  ])("rejects %s", (_, overrides, path) => {
    expectInvalid(schema, { ...valid(), ...overrides }, path)
  })
})

describe("Turn", () => {
  it("applies defaults to a minimal turn", () => {
    expect(expectValid(Turn, validTurn())).toEqual({ ...validTurn(), ...turnDefaults })
  })

  it("has exactly AgentTurnOutput's fields plus id and timestamp", () => {
    const expected = [...Object.keys(AgentTurnOutput.shape), "id", "timestamp"].sort()
    expect(Object.keys(Turn.shape).sort()).toEqual(expected)
  })

  it("accepts an agent output extended with id and timestamp", () => {
    const output = expectValid(AgentTurnOutput, { ...validAgentTurnOutput(), hpDelta: -2 })
    const turn = expectValid(Turn, { ...output, id: "turn-1", timestamp: TIMESTAMP })
    expect(turn).toEqual({ ...output, id: "turn-1", timestamp: TIMESTAMP })
  })

  it.each(["id", "timestamp"] as const)("requires %s", (key) => {
    expectInvalid(Turn, omit(validTurn(), key), [key])
  })

  it("rejects a malformed timestamp", () => {
    expectInvalid(Turn, { ...validTurn(), timestamp: "not a date" }, ["timestamp"])
  })
})

describe("TrimmedTurn", () => {
  it("accepts a valid trimmed turn", () => {
    expect(expectValid(TrimmedTurn, validTrimmedTurn())).toEqual(validTrimmedTurn())
  })

  it("accepts boundary lengths", () => {
    expectValid(TrimmedTurn, { ...validTrimmedTurn(), narrative: str(500), action: str(200) })
  })

  it.each(["turnId", "narrative", "action"] as const)("requires %s", (key) => {
    expectInvalid(TrimmedTurn, omit(validTrimmedTurn(), key), [key])
  })

  it.each([
    ["narrative over 500 chars", { narrative: str(501) }, ["narrative"]],
    ["action over 200 chars", { action: str(201) }, ["action"]],
  ])("rejects %s", (_, overrides, path) => {
    expectInvalid(TrimmedTurn, { ...validTrimmedTurn(), ...overrides }, path)
  })
})
