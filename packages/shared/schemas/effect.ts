import { z } from "zod"
import { StatName } from "./stats.js"
import { Item } from "./items.js"
import { Scene } from "./scene.js"

export const Effect = z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("damage"),     amount: z.number().int().min(0) }),
    z.object({ kind: z.literal("heal"),       amount: z.number().int().min(0) }),
    z.object({ kind: z.literal("gold"),       amount: z.number().int() }),          // signed
    z.object({ kind: z.literal("xp"),         stat: StatName, amount: z.number().int().min(0) }),
    z.object({ kind: z.literal("gainItem"),   item: Item }),                         // full item — it's new
    z.object({ kind: z.literal("loseItem"),   itemId: z.string(), qty: z.number().int().min(1).default(1) }),
    z.object({ kind: z.literal("gainPerk"),   perk: z.string() }),
    z.object({ kind: z.literal("reputation"), renown: z.number().int().default(0), morality: z.number().int().default(0) }),
    // Known scene: sceneId, reached by an exit. New scene: the full scene plus a label for the exit leading to it.
    z.object({
        kind: z.literal("move"),
        sceneId: z.string().optional(),
        newScene: z.object({ scene: Scene, exitLabel: z.string().min(1) }).optional(),
    }).refine((move) => (move.sceneId === undefined) !== (move.newScene === undefined), {
        message: "move needs exactly one of sceneId or newScene",
    }),
])

export type Effect = z.infer<typeof Effect>