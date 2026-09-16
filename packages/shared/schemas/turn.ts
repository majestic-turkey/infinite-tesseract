import { z } from "zod"
import { StatName } from "./stats.js"
import { Effect } from "./effect.js"

export type Difficulty = "easy" | "medium" | "hard" | "heroic"

export type AdvantageModifier = "none" | "advantage" | "disadvantage"

export const StatDelta = z.partialRecord(StatName, z.number().int())


export const Choice = z.object({
    id: z.string(),
    label: z.string().max(100),
    description: z.string().max(500).optional(),
})

export const PlayerAction = z.object({
  text: z.string(),
  selectedChoiceId: z.string().optional(), // selectedChoiceId -> Choice.id
})

export const Check = z.object({
    stat: StatName,
    difficulty: z.enum(["easy", "medium", "hard", "heroic"]),
    modifier: z.enum(["none", "advantage", "disadvantage"])
})

export const Branch = z.object({
    narrative: z.string(),
    effects: z.array(Effect).default([]),
})

export const AgentTurnOutput = z.object({
  check: Check.optional(),
  onSuccess: Branch.optional(),
  onFailure: Branch.optional(),
  choices: z.array(Choice).default([]),
})


export const Turn = z.object({
    id: z.string(),
    narrative: z.string(),
    effects: z.array(Effect).default([]),
    choices: z.array(Choice).default([]),
    timestamp: z.iso.datetime(),
})

export const TrimmedTurn = z.object({
    turnId: z.string(), // turnId -> Turn.id
    narrative: z.string().max(500),
    action: z.string().max(200),
})

export type StatDelta = z.infer<typeof StatDelta>
export type Choice = z.infer<typeof Choice>
export type Check = z.infer<typeof Check>
export type Branch = z.infer<typeof Branch>
export type PlayerAction = z.infer<typeof PlayerAction>
export type AgentTurnOutput = z.infer<typeof AgentTurnOutput>
export type Turn = z.infer<typeof Turn>
export type TrimmedTurn = z.infer<typeof TrimmedTurn>