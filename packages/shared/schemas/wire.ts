import { z } from "zod"
import { Item } from "./items.js"
import { MoveKnownScene, DamageEffect, HealEffect, GoldEffect, XpEffect, LoseItemEffect, GainPerkEffect, ReputationEffect } from "./effect.js"
import { Scene } from "./scene.js"
import { Choice, Check } from "./turn.js"

export const WireItem = Item.omit({ id: true })
export const WireScene = Scene.omit({ id: true })
export const WireChoice = Choice.omit({ id: true })
export const WireMoveNewScene = z.strictObject({
    kind: z.literal("move"),
    newScene: z.object({ scene: WireScene, exitLabel: z.string().min(1) }),
})

export const WireEffect = z.union([
    DamageEffect,
    HealEffect,
    GoldEffect,
    XpEffect,
    z.object({ kind: z.literal("gainItem"), item: WireItem }),
    LoseItemEffect,
    GainPerkEffect,
    ReputationEffect,
    // Known scene: sceneId, reached by an exit. New scene: full scene plus a label for the exit leading to it.
    MoveKnownScene,
    WireMoveNewScene,
])

export const WireBranch = z.strictObject({
    narrative: z.string(),
    effects: z.array(WireEffect).default([]),
})
    
const NarrativeTurn = z.strictObject({
  kind: z.literal("narration"),
  outcome: WireBranch,                       // Only one outcome, no choices
  choices: z.array(WireChoice).default([]),
})

const CheckedTurn = z.strictObject({
  kind: z.literal("check"),
  check: Check,                          // Can be either success or failure based on dice roll
  onSuccess: WireBranch,
  onFailure: WireBranch,
  choices: z.array(WireChoice).default([]),
})

export const WireAgentTurnOutput = z.discriminatedUnion("kind", [
    NarrativeTurn,
    CheckedTurn,
])

export type AgentWireOutput = z.infer<typeof WireAgentTurnOutput>
export type WireEffect = z.infer<typeof WireEffect>