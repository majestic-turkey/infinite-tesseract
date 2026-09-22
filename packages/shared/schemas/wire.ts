import { z } from "zod"
import { Item } from "./items.js"
import { MoveKnownScene } from "./effect.js"
import { Scene } from "./scene.js"
import { Choice, Check } from "./turn.js"
import { StatName } from "./stats.js"

export const WireItem = Item.omit({ id: true })
export const WireScene = Scene.omit({ id: true })
export const WireChoice = Choice.omit({ id: true })
export const MoveNewWireScene = z.strictObject({
    kind: z.literal("move"),
    newScene: z.object({ scene: WireScene, exitLabel: z.string().min(1) }),
})

export const WireEffect = z.union([
    z.object({ kind: z.literal("damage"),     amount: z.number().int().min(0) }),
    z.object({ kind: z.literal("heal"),       amount: z.number().int().min(0) }),
    z.object({ kind: z.literal("gold"),       amount: z.number().int() }),          // signed
    z.object({ kind: z.literal("xp"),         stat: StatName, amount: z.number().int().min(0) }),
    z.object({ kind: z.literal("gainItem"),   item: WireItem }),                         // full item — it's new
    z.object({ kind: z.literal("loseItem"),   itemId: z.string(), qty: z.number().int().min(1).default(1) }),
    z.object({ kind: z.literal("gainPerk"),   perk: z.string() }),
    z.object({ kind: z.literal("reputation"), renown: z.number().int().default(0), morality: z.number().int().default(0) }),
    // Known scene: sceneId, reached by an exit. New scene: full scene plus a label for the exit leading to it.
    MoveKnownScene,
    MoveNewWireScene,
])

export const WireBranch = z.object({
    narrative: z.string(),
    effects: z.array(WireEffect).default([]),
})
    
const NarrativeTurn = z.object({
  kind: z.literal("narration"),
  outcome: WireBranch,                       // Only one outcome, no choices
  choices: z.array(WireChoice).default([]),
})

const CheckedTurn = z.object({
  kind: z.literal("check"),
  check: Check,                          // Can be either success or failure based on dice roll
  onSuccess: WireBranch,
  onFailure: WireBranch,
  choices: z.array(WireChoice).default([]),
})

export const AgentWireOutput = z.discriminatedUnion("kind", [
    NarrativeTurn,
    CheckedTurn,
])