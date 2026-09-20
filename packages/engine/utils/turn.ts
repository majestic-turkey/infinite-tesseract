import { applyEffects } from "./effects.js"
import type { GameState } from "./effects.js"
import { resolveCheck, type CheckResult } from "./checks.js"
import { mulberry32 } from "./rng.js"
import type { Rng } from "./rng.js"
import type { AgentTurnOutput, PlayerAction, Turn, TrimmedTurn } from "../../shared/schemas.js"

// Turn orchestration - resolveTurn(state, action, agentOutput, { rng, now }). It resolves the check, picks the branch, applies its effects, creates the Turn, increments turnCount, adds to and trims recentTurns, and sets updatedAt.

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

export function chosenActionText(action: PlayerAction, choices: readonly { id: string; label: string }[] = []): string {
    if (action.selectedChoiceId) {
        const match = choices.find((choice) => choice.id === action.selectedChoiceId)
        if (match) return match.label
    }
    return action.text
}

export function resolveTurn(state: GameState, action: PlayerAction, agentOutput: AgentTurnOutput, ctx: TurnContext):
    TurnResult {
    const { rootSeed, turnCount } = state.session
    const rng = ctx.rng ?? mulberry32(turnSeed(rootSeed, turnCount))
    const choices = agentOutput.choices
    const turnId = `turn-${turnCount + 1}`
    const actionText = chosenActionText(action, state.session.pendingChoices)

        const check = agentOutput.kind === "check"
        ? resolveCheck(state.character, agentOutput.check, rng)
        : undefined
    const branch = agentOutput.kind === "narration"
        ? agentOutput.outcome
        : check!.success ? agentOutput.onSuccess : agentOutput.onFailure

    const applied = applyEffects(state, branch.effects)
    const nextSession = {
        ...applied.session,
        turnCount: applied.session.turnCount + 1,
        pendingChoices: choices,
        updatedAt: ctx.now,
        recentTurns: [
            { turnId, narrative: branch.narrative.slice(0,500), action: actionText.slice(0,200) } satisfies TrimmedTurn,
            ...applied.session.recentTurns.slice(0,9),
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
        ...(check && { check }),
    }
}