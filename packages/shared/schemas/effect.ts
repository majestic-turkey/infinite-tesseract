import { z } from "zod"
import { StatName } from "./stats.js"
import { Item } from "./items.js"
import { Scene } from "./scene.js"

export const MoveKnownScene = z.strictObject({
    kind: z.literal("move"),
    sceneId: z.string(),
})

const MoveNewScene = z.strictObject({
    kind: z.literal("move"),
    newScene: z.object({ scene: Scene, exitLabel: z.string().min(1) }),
})

export const DamageEffect = z.object({ kind: z.literal("damage"), amount: z.number().int().min(0) })
export const HealEffect = z.object({ kind: z.literal("heal"), amount: z.number().int().min(0) })
export const GoldEffect = z.object({ kind: z.literal("gold"), amount: z.number().int() })
export const XpEffect = z.object({ kind: z.literal("xp"), stat: StatName, amount: z.number().int().min(0) })
export const GainItemEffect = z.object({ kind: z.literal("gainItem"), item: Item })
export const LoseItemEffect = z.object({ kind: z.literal("loseItem"), itemId: z.string(), qty: z.number().int().min(1).default(1) })
export const GainPerkEffect = z.object({ kind: z.literal("gainPerk"), perk: z.string() })
export const ReputationEffect = z.object({ kind: z.literal("reputation"), renown: z.number().int().default(0), morality: z.number().int().default(0) })

export const Effect = z.union([
    DamageEffect,
    HealEffect,
    GoldEffect,
    XpEffect,
    GainItemEffect,
    LoseItemEffect,
    GainPerkEffect,
    ReputationEffect,
    // Known scene: sceneId, reached by an exit. New scene: full scene plus a label for the exit leading to it.
    MoveKnownScene,
    MoveNewScene,
])

export type Effect = z.infer<typeof Effect>