import { describe, expect, expectTypeOf, it } from "vitest"
import type { z } from "zod"
import {
  AgentTurnOutput,
  Branch,
  Check,
  Choice,
  PlayerAction,
  StatDelta,
  TrimmedTurn,
  Turn,
  type AdvantageModifier,
  type Difficulty,
} from "../../../packages/shared/schemas/turn.js"
import {
  expectInvalid,
  expectValid,
  omit,
  str,
  validAgentTurnOutput,
  validBranch,
  validCheck,
  validChoice,
  validTrimmedTurn,
  validTurn,
} from "../test-utils/fixtures.js"

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

describe("Check", () => {
  it("accepts a valid check", () => {
    expect(expectValid(Check, validCheck())).toEqual(validCheck())
  })

  it.each(Check.shape.difficulty.options)("accepts difficulty %s", (difficulty) => {
    expectValid(Check, { ...validCheck(), difficulty })
  })

  it.each(Check.shape.modifier.options)("accepts modifier %s", (modifier) => {
    expectValid(Check, { ...validCheck(), modifier })
  })

  it.each(["stat", "difficulty", "modifier"] as const)("requires %s", (key) => {
    expectInvalid(Check, omit(validCheck(), key), [key])
  })

  it.each([
    ["unknown stat", { stat: "luck" }, ["stat"]],
    ["unknown difficulty", { difficulty: "impossible" }, ["difficulty"]],
    ["unknown modifier", { modifier: "double" }, ["modifier"]],
  ])("rejects %s", (_, overrides, path) => {
    expectInvalid(Check, { ...validCheck(), ...overrides }, path)
  })

  it("keeps the Difficulty and AdvantageModifier types in sync with the enums", () => {
    expectTypeOf<Difficulty>().toEqualTypeOf<z.infer<typeof Check>["difficulty"]>()
    expectTypeOf<AdvantageModifier>().toEqualTypeOf<z.infer<typeof Check>["modifier"]>()
  })
})

describe("Branch", () => {
  it("defaults effects to an empty list", () => {
    expect(expectValid(Branch, validBranch())).toEqual({ ...validBranch(), effects: [] })
  })

  it("accepts effects and applies their defaults", () => {
    const branch = expectValid(Branch, { ...validBranch(), effects: [{ kind: "loseItem", itemId: "item-1" }] })
    expect(branch.effects).toEqual([{ kind: "loseItem", itemId: "item-1", qty: 1 }])
  })

  it("requires narrative", () => {
    expectInvalid(Branch, {}, ["narrative"])
  })

  it("rejects an invalid effect", () => {
    expectInvalid(Branch, { ...validBranch(), effects: [{ kind: "heal", amount: -1 }] }, ["effects", 0, "amount"])
  })
})

describe("AgentTurnOutput", () => {
  it("accepts a narration turn and defaults choices", () => {
    const output = expectValid(AgentTurnOutput, {
      kind: "narration",
      outcome: validBranch(),
    })
    expect(output).toEqual({
      kind: "narration",
      outcome: { ...validBranch(), effects: [] },
      choices: [],
    })
  })

  it("accepts a check with both branches and applies nested defaults", () => {
    const output = expectValid(AgentTurnOutput, { ...validAgentTurnOutput(), choices: [validChoice()] })
    expect(output).toEqual({
      kind: "check",
      check: validCheck(),
      onSuccess: { ...validBranch(), effects: [] },
      onFailure: { narrative: "The guard spots you.", effects: [{ kind: "damage", amount: 3 }] },
      choices: [validChoice()],
    })
  })

  it.each([
    ["an invalid check", { kind: "check", check: { ...validCheck(), difficulty: "trivial" } }, ["check", "difficulty"]],
    ["an onSuccess branch without narrative", { kind: "check", onSuccess: {} }, ["onSuccess", "narrative"]],
    [
      "an invalid onFailure effect",
      { kind: "check", onFailure: { narrative: "Ouch", effects: [{ kind: "damage", amount: 1.5 }] } },
      ["onFailure", "effects", 0, "amount"],
    ],
    ["an invalid choice", { kind: "check", choices: [{ id: "c", label: str(101) }] }, ["choices", 0, "label"]],
  ])("rejects %s", (_, overrides, path) => {
    expectInvalid(AgentTurnOutput, { ...validAgentTurnOutput(), ...overrides }, path)
  })
})

describe("Turn", () => {
  it("applies defaults to a minimal turn", () => {
    expect(expectValid(Turn, validTurn())).toEqual({ ...validTurn(), effects: [], choices: [] })
  })

  it("accepts effects and choices", () => {
    const input = {
      ...validTurn(),
      effects: [
        { kind: "gold", amount: -5 },
        { kind: "move", sceneId: "scene-2" },
      ],
      choices: [validChoice()],
    }
    expect(expectValid(Turn, input)).toEqual(input)
  })

  it.each(["id", "narrative", "timestamp"] as const)("requires %s", (key) => {
    expectInvalid(Turn, omit(validTurn(), key), [key])
  })

  it.each([
    ["a malformed timestamp", { timestamp: "not a date" }, ["timestamp"]],
    ["an invalid effect", { effects: [{ kind: "xp", stat: "luck", amount: 1 }] }, ["effects", 0, "stat"]],
    ["an unknown effect kind", { effects: [{ kind: "teleport" }] }, ["effects", 0, "kind"]],
    ["an invalid choice", { choices: [{ label: "Go" }] }, ["choices", 0, "id"]],
  ])("rejects %s", (_, overrides, path) => {
    expectInvalid(Turn, { ...validTurn(), ...overrides }, path)
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
