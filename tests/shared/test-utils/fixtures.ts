import { expect } from "vitest"
import { z } from "zod"

export const TIMESTAMP = "2026-09-14T12:00:00Z"

export const str = (length: number) => "a".repeat(length)

export function omit<T extends object, K extends keyof T>(obj: T, key: K): Omit<T, K> {
  const copy: Partial<T> = { ...obj }
  delete copy[key]
  return copy as Omit<T, K>
}

// Parses input and returns the output, failing the test with a readable error if invalid
export function expectValid<S extends z.ZodType>(schema: S, input: unknown): z.output<S> {
  const result = schema.safeParse(input)
  if (!result.success) throw new Error(z.prettifyError(result.error))
  return result.data
}

// Asserts parsing fails with at least one issue located at (or under) the given path
export function expectInvalid(schema: z.ZodType, input: unknown, path: PropertyKey[] = []) {
  const result = schema.safeParse(input)
  expect(result.success, "expected parse to fail").toBe(false)
  const paths = result.error?.issues.map((issue) => issue.path) ?? []
  const matched = paths.some((p) => path.every((key, i) => p[i] === key))
  expect(matched, `no issue at [${path.join(".")}]; got ${JSON.stringify(paths)}`).toBe(true)
}

export const validStat = () => ({ rank: 3, xp: 25 })

export const validItem = () => ({
  id: "item-1",
  name: "Rusty Sword",
  category: "weapon",
  tier: 1,
  slot: "mainHand",
})

export const validCharacter = () => ({
  id: "char-1",
  name: "Aria",
  background: "A wandering sellsword.",
  hp: 20,
  maxHp: 20,
  gold: 15,
  stats: {
    strength: validStat(),
    dexterity: validStat(),
    will: validStat(),
    charisma: validStat(),
  },
  equipment: { mainHand: "item-1" },
  inventory: [validItem()],
  perks: ["Keen Eye"],
  reputation: { renown: 5, morality: -2 },
})

export const validUser = () => ({
  id: "user-1",
  username: "turkey",
  email: "turkey@example.com",
  createdAt: TIMESTAMP,
})

export const validScene = () => ({
  id: "scene-1",
  roomName: "Dusty Tavern",
  description: "Smoke hangs low over the tables.",
})

// Two connected scenes for engine tests; validScene stays minimal for schema default tests
export const validWorld = () => [
  { ...validScene(), exits: [{ label: "Back door", toSceneId: "scene-2" }] },
  { id: "scene-2", roomName: "Alley", description: "Wet cobbles.", exits: [{ label: "Tavern", toSceneId: "scene-1" }] },
]

export const validChoice = () => ({ id: "choice-1", label: "Approach the bar" })

export const validCheck = () => ({ stat: "dexterity", difficulty: "medium", modifier: "none" })

export const validBranch = () => ({ narrative: "You slip past the guard." })

export const validAgentTurnOutput = () => ({
  kind: "check",
  check: validCheck(),
  onSuccess: validBranch(),
  onFailure: { narrative: "The guard spots you.", effects: [{ kind: "damage", amount: 3 }] },
  choices: [],
})

export const validTurn = () => ({ id: "turn-1", narrative: "The door creaks open.", timestamp: TIMESTAMP })

export const validTrimmedTurn = () => ({
  turnId: "turn-1",
  narrative: "The door creaks open.",
  action: "Open the door",
})

export const validSession = () => ({
  id: "session-1",
  userId: "user-1",
  characterId: "char-1",
  currentSceneId: "scene-1",
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP,
  rootSeed: 12345,
})
