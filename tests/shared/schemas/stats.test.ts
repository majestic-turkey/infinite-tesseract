import { describe, expect, it } from "vitest"
import { Stat, StatName } from "../../../packages/shared/schemas/stats.js"
import { expectInvalid, expectValid, omit, validStat } from "../test-utils/fixtures.js"

describe("StatName", () => {
  it.each(["strength", "dexterity", "will", "charisma"])("accepts %s", (name) => {
    expect(expectValid(StatName, name)).toBe(name)
  })

  it.each(["luck", "Strength", ""])("rejects %j", (name) => {
    expectInvalid(StatName, name)
  })
})

describe("Stat", () => {
  it("accepts a valid stat", () => {
    expect(expectValid(Stat, validStat())).toEqual(validStat())
  })

  it.each([1, 10])("accepts boundary rank %i", (rank) => {
    expectValid(Stat, { ...validStat(), rank })
  })

  it.each([0, 11, 2.5])("rejects rank %d", (rank) => {
    expectInvalid(Stat, { ...validStat(), rank }, ["rank"])
  })

  it("accepts zero xp", () => {
    expectValid(Stat, { ...validStat(), xp: 0 })
  })

  it.each([-1, 1.5])("rejects xp %d", (xp) => {
    expectInvalid(Stat, { ...validStat(), xp }, ["xp"])
  })

  it.each(["rank", "xp"] as const)("requires %s", (key) => {
    expectInvalid(Stat, omit(validStat(), key), [key])
  })
})
