import { describe, expect, it } from "vitest"
import { rankUp } from "../../packages/engine/utils/progression.js"
import { Character, type StatName } from "../../packages/shared/schemas.js"
import { validCharacter } from "../shared/test-utils/fixtures.js"

const makeCharacter = (rank: number, xp: number) =>
  Character.parse({
    ...validCharacter(),
    stats: {
      strength: { rank, xp },
      dexterity: { rank: 1, xp: 0 },
      will: { rank: 1, xp: 0 },
      charisma: { rank: 1, xp: 0 },
    },
  })

const thresholdForRank = (rank: number) => rank * 100

describe("rankUp", () => {
  it("uses the linear threshold for each rank without reusing the stale one", () => {
    const start = makeCharacter(1, 90)
    const next = rankUp(start, { stat: "strength", amount: 200 })

    expect(next.stats.strength).toEqual({
      rank: 2,
      xp: 190,
    })
    expect(next.stats.strength.xp).toBeLessThan(thresholdForRank(2))
  })

  it("returns the same character for a stat it does not have", () => {
    // Unvalidated input: the type system rules this out, the guard handles it at runtime
    const start = makeCharacter(1, 0)
    expect(rankUp(start, { stat: "luck" as StatName, amount: 500 })).toBe(start)
  })

  it("never exceeds rank 10", () => {
    const start = makeCharacter(10, 0)
    const next = rankUp(start, { stat: "strength", amount: 9999 })

    expect(next.stats.strength).toEqual({
      rank: 10,
      xp: 9999,
    })
  })
})
