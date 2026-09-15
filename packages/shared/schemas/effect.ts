import { z } from "zod"
import { StatName } from "./stats.js"
import { Item } from "./items.js"

export const Effect = z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("damage"),     amount: z.number().int().min(0) }),
    z.object({ kind: z.literal("heal"),       amount: z.number().int().min(0) }),
    z.object({ kind: z.literal("gold"),       amount: z.number().int() }),          // signed
    z.object({ kind: z.literal("xp"),         stat: StatName, amount: z.number().int().min(0) }),
    z.object({ kind: z.literal("gainItem"),   item: Item }),                         // full item — it's new
    z.object({ kind: z.literal("loseItem"),   itemId: z.string(), qty: z.number().int().min(1).default(1) }),
    z.object({ kind: z.literal("gainPerk"),   perk: z.string() }),
    z.object({ kind: z.literal("reputation"), renown: z.number().int().default(0), morality: z.number().int().default(0) }),
    z.object({ kind: z.literal("move"),       sceneId: z.string() }),
])

export type Effect = z.infer<typeof Effect>