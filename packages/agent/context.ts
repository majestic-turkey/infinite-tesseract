// Generates prompts for the agent based on the current GameState
import { effectiveStats, chosenActionText, type GameState } from "../engine/engine.js"
import type { PlayerAction } from "../shared/schemas.js"

export function generatePrompt(gameState: GameState, userMessage: PlayerAction): string {
    // Get information about the game state
    const { summary, recentTurns } = gameState.session
    const character = gameState.character
    if (!character) {
        throw new Error("Current character not found")
    }
    const scene = gameState.session.scenes?.find(scene => scene.id === gameState.session.currentSceneId)
    if (!scene) {
        throw new Error("Current scene not found")
    }
    const characterEffectiveStats = effectiveStats(character)

    // Look up each exit's toSceneId from gameState and render label, ID and roomName
    const exitsWithDetails = scene.exits?.map(exit => {
        const toScene = gameState.session.scenes?.find(scene => scene.id === exit.toSceneId)
        return {
            ...exit,
            toSceneRoomName: toScene?.roomName
        }
    })

    // Resolve the PlayerAction text from the user message so the model gets sent actual text
    const actionTextResolved = chosenActionText(userMessage, gameState.session.pendingChoices)

    // subprompts
    // Equipment and Inventory don't have lookup tables yet for their ids, so this will just pass raw IDs for now
    const characterPrompt = `=== Character ===
name: ${character.name}
background: ${character.background}
stats: ${JSON.stringify(characterEffectiveStats, null, 2)}
hp: ${character.hp} / ${character.maxHp}
Gold on hand: ${character.gold ?? 0}
Perks: ${JSON.stringify(character.perks, null, 2)}
Renown: ${character.reputation.renown}
Morality: ${character.reputation.morality}
Equipment: ${JSON.stringify(character.equipment, null, 2)}
Inventory: ${JSON.stringify(character.inventory, null, 2)}
`

    const currentStatePrompt = `=== Current State ===
Summary: ${summary}
Current Scene: ${JSON.stringify(scene.roomName, null, 2)} (tags: ${JSON.stringify(scene.tags, null, 2)})
Description: ${scene.description ?? "No description available."}
Exits: ${JSON.stringify(exitsWithDetails, null, 2)}
Recent Turns: ${JSON.stringify(recentTurns.toReversed(), null, 2)}
`

    const actionPrompt = `=== Player's Action ===
Player Action: *${actionTextResolved}*
`

    return `
${characterPrompt}
${currentStatePrompt}
${actionPrompt}
`
}