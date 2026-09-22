// Take a wire turn output, mint IDs for new scenes and items, return AgentTurnOutput
import type { AgentTurnOutput, WireAgentTurnOutput } from "../shared/schemas.js"

function generateId(turnNumber: number) {
    return String(turnNumber + 1)
}

function withAccessionedItems<T extends { effects: Array<any> }>(branch: T, turnNumber: number): T {
    return {
        ...branch,
        effects: branch.effects.map((effect) => {
            if (effect.kind !== "gainItem") return effect

            return {
                ...effect,
                item: {
                    ...effect.item,
                    id: generateId(turnNumber),
                },
            }
        }),
    }
}

export function accessionOutput(wireOutput: WireAgentTurnOutput, turnNumber: number): AgentTurnOutput {
    if (wireOutput.kind === "narration") {
        return {
            ...wireOutput,
            outcome: withAccessionedItems(wireOutput.outcome, turnNumber),
        } as AgentTurnOutput
    }

    return {
        ...wireOutput,
        onSuccess: withAccessionedItems(wireOutput.onSuccess, turnNumber),
        onFailure: withAccessionedItems(wireOutput.onFailure, turnNumber),
    } as AgentTurnOutput
}