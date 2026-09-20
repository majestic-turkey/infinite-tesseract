// Generates prompts for the agent based on the current GameState
import { effectiveStats, chosenActionText, type GameState } from "../engine/engine.js"
import type { PlayerAction } from "../shared/schemas.js"

export function generatePrompt(gameState: GameState, userMessage: PlayerAction): string {
    // Get information about the game state
    const { summary, recentTurns } = gameState.session
    const character = gameState.character
    const scenes = gameState.session.scenes?.filter(scene => scene.id === gameState.session.currentSceneId)
    const characterEffectiveStats = effectiveStats(character)

    // Look up each exit's toSceneId from gameState and render label, ID and roomName
    const exitsWithDetails = scenes?.[0]?.exits?.map(exit => {
        const toScene = gameState.session.scenes?.find(scene => scene.id === exit.toSceneId)
        return {
            ...exit,
            toSceneLabel: exit.label,
            toSceneRoomName: toScene?.roomName
        }
    })

    // Resolve the PlayerAction text from the user message so the model gets sent actual text
    const actionTextResolved = chosenActionText(userMessage)

    // subprompts
    // Equipment and Inventory don't have lookup tables yet for their ids, so this will just pass raw IDs for now
    const characterPrompt = `=== Character ===
name: ${character?.name}
background: ${character?.background}
stats: ${JSON.stringify(characterEffectiveStats, null, 2)}
hp: ${character?.hp} / ${character?.maxHp}
Gold on hand: ${character?.gold ?? 0}
Perks: ${JSON.stringify(character?.perks, null, 2)}
Renown: ${character?.reputation.renown}
Morality: ${character?.reputation.morality}
Equipment: ${JSON.stringify(character?.equipment, null, 2)}
Inventory: ${JSON.stringify(character?.inventory, null, 2)}
`

    const currentStatePrompt = `=== Current State ===
Summary: ${summary}
Current Scene: ${JSON.stringify(scenes?.[0], null, 2)}
Exits: ${JSON.stringify(exitsWithDetails, null, 2)}
Recent Turns: ${JSON.stringify(recentTurns.reverse(), null, 2)}
`

    const actionPrompt = `=== Player's Action ===
Selected Choice: ${JSON.stringify(userMessage.selectedChoiceId, null, 2)}
Player Action: ${JSON.stringify(userMessage.text, null, 2)}: *${JSON.stringify(actionTextResolved, null, 2)}*
`

    return `
${characterPrompt}
${currentStatePrompt}
${actionPrompt}
`
}