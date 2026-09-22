// Take a wire turn output, mint IDs for new scenes and items, return AgentTurnOutput
import type { GameState } from "../engine/engine.js"
import { AgentTurnOutput, Branch, WireAgentTurnOutput, WireBranch, WireEffect, Effect, Choice, Scene } from "../shared/schemas.js"

const counters = { item: 0, scene: 0, choice: 0 }

function createMinter(turnNumber: number) {
    const counters = { item: 0, scene: 0, choice: 0 }
    return (kind: keyof typeof counters) => `${kind}-${turnNumber}-${++counters[kind]}`
}

export function accessionOutput(wireOutput: WireAgentTurnOutput, state: GameState): AgentTurnOutput {
    const mint = createMinter(state.session.turnCount + 1)

    const accessionEffect = (effect: WireEffect): Effect => {
        switch (effect.kind) {
            case "gainItem":
                const existingItem = Object.values(state.character.inventory).find(
                    (item) => item.name === effect.item.name && item.tier === effect.item.tier
                )
                if (existingItem) {
                    return { ...effect, item: { ...effect.item, id: existingItem.id } }
                }
                return { ...effect, item: { ...effect.item, id: mint("item") } }
            case "move":
                if (!("newScene" in effect)) return effect
                // step 8: re-mint while the id is already in state.session.scenes
                let newId = mint("scene")
                while (state.session.scenes.find(scene => scene.id === newId)) {
                    newId = mint("scene")
                }
                return {
                    ...effect,
                    newScene: {
                        ...effect.newScene,
                        scene: { ...effect.newScene.scene, id: newId },
                    },
                }
            default:
                return effect
        }
    }

    const accessionBranch = (branch: WireBranch): Branch => ({
        ...branch,
        effects: branch.effects.map(accessionEffect),
    })

    const choices = wireOutput.choices.map((choice) => ({ ...choice, id: mint("choice") }))

    if (wireOutput.kind === "narration") {
        return AgentTurnOutput.parse({
            ...wireOutput,
            choices,
            outcome: accessionBranch(wireOutput.outcome),
        })
    }

    return AgentTurnOutput.parse({
        ...wireOutput,
        choices,
        onSuccess: accessionBranch(wireOutput.onSuccess),
        onFailure: accessionBranch(wireOutput.onFailure),
    })
}
