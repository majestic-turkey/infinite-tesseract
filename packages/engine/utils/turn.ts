import { applyEffect } from "./effects.js"
import type { GameState } from "./effects.js"
import { resolveCheck, type CheckResult } from "./checks.js"
import { rankUp } from "./progression.js"
import { mulberry32 } from "./rng.js"
import type { Rng } from "./rng.js"
import type { AgentTurnOutput, Effect, PlayerAction, Turn, TrimmedTurn } from "../../shared/schemas.js"

// Turn orchestration - resolveTurn(state, action, agentOutput, { rng, now }). It resolves the check, picks the branch, applies its effects, checks for rank-ups, creates the Turn, increments turnCount, adds to and trims recentTurns, and sets updatedAt.

export type TurnContext = {
    rng?: Rng
    now: string
}

export type TurnResult = {
    state: GameState
    turn: Turn
    check?: CheckResult
}

function turnSeed(rootSeed: number, turnCount: number): number {
    return rootSeed + turnCount
}

function chosenActionText(action: PlayerAction, choices: readonly { id: string; label: string }[] = []): string {
    if (action.selectedChoiceId) {
        const match = choices.find((choice) => choice.id === action.selectedChoiceId)
        if (match) return match.label
    }
    return action.text
}

function applyBranchEffects(state: GameState, effects: readonly Effect[]): GameState {
    let next = state
    for (const effect of effects) {
        if (effect.kind === "xp") {
            next = {
                ...next,
                character: rankUp(next.character, { stat: effect.stat, amount: effect.amount }),
            }
            continue
        }
        next = applyEffect(next, effect)
    }
    return next
}

export function resolveTurn(state: GameState, action: PlayerAction, agentOutput: AgentTurnOutput, ctx: TurnContext):
    TurnResult {
    const { rootSeed, turnCount } = state.session
    const rng = ctx.rng ?? mulberry32(turnSeed(rootSeed, turnCount))
    const choices = agentOutput.choices ?? []
    const turnId = `turn-${turnCount + 1}`
    const actionText = chosenActionText(action, choices)

    if (agentOutput.kind === "narration") {
        const outcome = agentOutput.outcome
        const applied = applyBranchEffects(state, outcome.effects)
        const nextSession = {
            ...applied.session,
            turnCount: applied.session.turnCount + 1,
            updatedAt: ctx.now,
            recentTurns: [
                { turnId, narrative: outcome.narrative, action: actionText } satisfies TrimmedTurn,
                ...applied.session.recentTurns,
            ],
        }

        const turn: Turn = {
            id: turnId,
            narrative: outcome.narrative,
            effects: outcome.effects,
            choices,
            timestamp: ctx.now,
        }

        return {
            state: { ...applied, session: nextSession },
            turn,
        }
    }

    const check = resolveCheck(state.character, agentOutput.check, rng)
    const branch = check.success ? agentOutput.onSuccess : agentOutput.onFailure
    const applied = applyBranchEffects(state, branch.effects)
    const nextSession = {
        ...applied.session,
        turnCount: applied.session.turnCount + 1,
        updatedAt: ctx.now,
        recentTurns: [
            { turnId, narrative: branch.narrative, action: actionText } satisfies TrimmedTurn,
            ...applied.session.recentTurns,
        ],
    }

    const turn: Turn = {
        id: turnId,
        narrative: branch.narrative,
        effects: branch.effects,
        choices,
        timestamp: ctx.now,
    }

    return {
        state: { ...applied, session: nextSession },
        turn,
        check,
    }
}