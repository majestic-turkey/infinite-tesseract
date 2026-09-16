import { describe, expect, it } from "vitest"
import { DIFFICULTY_CLASS, resolveCheck, type Rng } from "../../packages/engine/utils/checks.js"
import { Character, Check, Item } from "../../packages/shared/schemas.js"
import { validCharacter, validCheck, validItem } from "../shared/test-utils/fixtures.js"

// Fixture stats are all rank 3 and the equipped item has no bonuses.
const character = Character.parse(validCharacter())

const check = (over: Partial<Check> = {}) => Check.parse({ ...validCheck(), ...over })

// An rng that hands out the given values in order, then throws if over-drawn.
const rngOf = (...values: number[]): Rng => {
  let i = 0
  return () => {
    const v = values[i++]
    if (v === undefined) throw new Error(`rng called ${i} times, only ${values.length} values queued`)
    return v
  }
}

// rng value that produces a specific d20 face
const face = (n: number) => (n - 1) / 20

describe("resolveCheck", () => {
  it("rolls a d20 and adds the effective rank", () => {
    const r = resolveCheck(character, check(), rngOf(face(11)))
    expect(r).toMatchObject({ roll: 11, rank: 3, total: 14, dc: 12, success: true })
  })

  it("maps the rng range onto faces 1-20", () => {
    expect(resolveCheck(character, check(), rngOf(0)).roll).toBe(1)
    expect(resolveCheck(character, check(), rngOf(0.999999)).roll).toBe(20)
  })

  describe("difficulty", () => {
    it.each(Object.entries(DIFFICULTY_CLASS))("succeeds at exactly the %s DC", (_difficulty, dc) => {
      const difficulty = _difficulty as Check["difficulty"]
      // rank 3, so the die has to cover dc - 3
      const r = resolveCheck(character, check({ difficulty }), rngOf(face(dc - 3)))
      expect(r).toMatchObject({ dc, total: dc, success: true })
    })

    it.each(Object.entries(DIFFICULTY_CLASS))("fails one under the %s DC", (_difficulty, dc) => {
      const difficulty = _difficulty as Check["difficulty"]
      const r = resolveCheck(character, check({ difficulty }), rngOf(face(dc - 4)))
      expect(r).toMatchObject({ total: dc - 1, success: false })
    })
  })

  describe("modifier", () => {
    it("rolls once with no modifier", () => {
      const r = resolveCheck(character, check({ modifier: "none" }), rngOf(face(7)))
      expect(r.rolls).toEqual([7])
    })

    it("keeps the higher of two rolls with advantage", () => {
      const r = resolveCheck(character, check({ modifier: "advantage" }), rngOf(face(4), face(17)))
      expect(r.rolls).toEqual([4, 17])
      expect(r.roll).toBe(17)
    })

    it("keeps the lower of two rolls with disadvantage", () => {
      const r = resolveCheck(character, check({ modifier: "disadvantage" }), rngOf(face(4), face(17)))
      expect(r.rolls).toEqual([4, 17])
      expect(r.roll).toBe(4)
    })
  })

  it("counts equipment bonuses toward the total", () => {
    const armed = Character.parse({
      ...validCharacter(),
      inventory: [Item.parse({ ...validItem(), bonuses: { dexterity: 2 } })],
      equipment: { mainHand: "item-1" },
    })
    const r = resolveCheck(armed, check({ stat: "dexterity" }), rngOf(face(9)))
    expect(r).toMatchObject({ rank: 5, total: 14, success: true })
  })

  it("uses the stat named by the check", () => {
    const armed = Character.parse({
      ...validCharacter(),
      inventory: [Item.parse({ ...validItem(), bonuses: { dexterity: 2 } })],
      equipment: { mainHand: "item-1" },
    })
    expect(resolveCheck(armed, check({ stat: "will" }), rngOf(face(9))).rank).toBe(3)
  })

  it("is deterministic for the same rolls", () => {
    const a = resolveCheck(character, check(), rngOf(face(13)))
    const b = resolveCheck(character, check(), rngOf(face(13)))
    expect(a).toEqual(b)
  })
})
