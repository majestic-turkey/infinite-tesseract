import { z } from "zod"
import { Item } from "./items.js"
import { MoveKnownScene, DamageEffect, HealEffect, GoldEffect, XpEffect, LoseItemEffect, GainPerkEffect, ReputationEffect } from "./effect.js"
import { Scene } from "./scene.js"
import { Choice, Check } from "./turn.js"

export const WireItem = Item.omit({ id: true })
// The engine owns the id and the exit into the scene; characters/enemies/items are id lists
// nothing resolves yet. Leaving all five out also keeps the compiled grammar under the API's limit.
export const WireScene = Scene.omit({ id: true, exits: true, characters: true, enemies: true, items: true })
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

// The structured-output schema must have an object at its root - a union root is rejected - so the
// turn travels in an envelope. The model fills `turn`; accessionOutput unwraps it.
export const WireTurnEnvelope = z.strictObject({ turn: WireAgentTurnOutput })

export type WireBranch = z.infer<typeof WireBranch>
export type WireAgentTurnOutput = z.infer<typeof WireAgentTurnOutput>
export type WireTurnEnvelope = z.infer<typeof WireTurnEnvelope>
export type WireEffect = z.infer<typeof WireEffect>