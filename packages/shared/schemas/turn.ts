import { z } from "zod"
import { Item } from "./items.js"
import { StatName } from "./stats.js"

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

export const AgentTurnOutput = z.object({
  narrative: z.string(),
  hpDelta: z.number().int().default(0),
  goldDelta: z.number().int().default(0),
  xpGained: StatDelta.default({}),
  itemsGained: z.array(Item).default([]),
  itemsLost: z.array(z.string()).default([]), // item ids
  perksGained: z.array(z.string()).default([]),
  reputationDelta: z.object({
      renown: z.number().int().default(0),
      morality: z.number().int().default(0),
  }).default({
      renown: 0,
      morality: 0,
  }),
  locationChange: z.string().optional(), // target scene id
  choices: z.array(Choice).default([]),
})


export const Turn = z.object({
    id: z.string(),
    narrative: z.string(),
    hpDelta: z.number().int().default(0),
    goldDelta: z.number().int().default(0),
    xpGained: StatDelta.default({}),
    itemsGained: z.array(Item).default([]),
    itemsLost: z.array(z.string()).default([]), // item ids
    perksGained: z.array(z.string()).default([]),
    reputationDelta: z.object({
        renown: z.number().int().default(0),
        morality: z.number().int().default(0),
    }).default({
        renown: 0,
        morality: 0,
    }),
    locationChange: z.string().optional(), // target scene id
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
export type PlayerAction = z.infer<typeof PlayerAction>
export type AgentTurnOutput = z.infer<typeof AgentTurnOutput>
export type Turn = z.infer<typeof Turn>
export type TrimmedTurn = z.infer<typeof TrimmedTurn>