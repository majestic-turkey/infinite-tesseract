import { describe, expect, it } from "vitest"
import { mulberry32 } from "../../packages/engine/utils/rng.js"

const draw = (seed: number, count: number) => {
  const rng = mulberry32(seed)
  return Array.from({ length: count }, () => rng())
}

describe("mulberry32", () => {
  it("replays the same sequence for the same seed", () => {
    expect(draw(12345, 20)).toEqual(draw(12345, 20))
  })

  it("gives different sequences for different seeds", () => {
    expect(draw(0, 5)).not.toEqual(draw(1, 5))
  })

  it("advances on every call", () => {
    const [a, b] = draw(12345, 2)
    expect(a).not.toBe(b)
  })

  it("keeps independent state per generator", () => {
    const first = mulberry32(99)
    first()
    first()
    expect(mulberry32(99)()).toBe(draw(99, 1)[0])
  })

  it("returns floats in [0, 1)", () => {
    for (const value of draw(42, 10_000)) {
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })

  it("treats seeds as unsigned 32-bit integers", () => {
    expect(draw(2 ** 32, 3)).toEqual(draw(0, 3))
    expect(draw(-1, 3)).toEqual(draw(0xffffffff, 3))
  })
})
