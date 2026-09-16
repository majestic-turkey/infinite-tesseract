// Check resolution - returns whether it succeeded, and roll details. Includes modifiers and difficulty
import type { Character, Check } from "../../shared/schemas.js"
import { effectiveStats } from "./stats.js"

// Target number a d20 + effective rank has to reach
export const DIFFICULTY_CLASS = {
  easy: 8,
  medium: 12,
  hard: 16,
  heroic: 20,
} as const satisfies Record<Check["difficulty"], number>

export type CheckResult = {
  success: boolean
  dc: number
  rank: number // effective rank, equipment included
  roll: number // the die that counted
  rolls: number[] // every die rolled, in order
  total: number // roll + rank
}

// rng returns a float in [0, 1) — mulberry32's output.
export type Rng = () => number

const d20 = (rng: Rng) => Math.floor(rng() * 20) + 1

// Advantage rolls twice and keeps the better die, disadvantage the worse. See 5e ruleset
export function resolveCheck(character: Character, check: Check, rng: Rng): CheckResult {
  const rolls = check.modifier === "none" ? [d20(rng)] : [d20(rng), d20(rng)]
  const roll = check.modifier === "disadvantage" ? Math.min(...rolls) : Math.max(...rolls)

  const rank = effectiveStats(character)[check.stat]
  const dc = DIFFICULTY_CLASS[check.difficulty]
  const total = roll + rank

  return { success: total >= dc, dc, rank, roll, rolls, total }
}
