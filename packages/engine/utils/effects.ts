import type { Character, GameSession, Effect, Slot } from "../../shared/schemas.js"
import { rankUp } from "./progression.js"

// A turn mutates both the character and the session, so the reducer operates
// over the whole game state rather than the Character alone

export type GameState = { character: Character; session: GameSession }

export function applyEffect(state: GameState, effect: Effect): GameState {
    const { character } = state
    switch (effect.kind) {
        case "damage":
            return { ...state, character: { ...character, hp: Math.max(0, character.hp - effect.amount) } }
        case "heal":
            return { ...state, character: { ...character, hp: Math.min(character.maxHp, character.hp + effect.amount) } }
        case "gold":
            return { ...state, character: { ...character, gold: (character.gold + effect.amount > 0 ? character.gold + effect.amount : 0) } }
        case "xp":
            return { ...state, character: rankUp(character, effect) }
        case "gainItem": {
            const exists = character.inventory.some((item) => item.id === effect.item.id)
            const inventory = exists
                ? character.inventory.map((item) =>
                    item.id === effect.item.id ? { ...item, qty: item.qty + effect.item.qty } : item)
                : [...character.inventory, effect.item]
            return { ...state, character: { ...character, inventory } }
        }
        case "loseItem":
            const nextEquipment = { ...character.equipment }
            const slot = Object.entries(character.equipment).find(([_, item]) => item === effect.itemId,)?.[0] as Slot | undefined
            if (slot) {
                delete nextEquipment[slot]
            }
            return {
                ...state,
                character: {
                    ...character,
                    inventory: character.inventory
                        .map((item) => (item.id === effect.itemId ? { ...item, qty: item.qty - effect.qty } : item))
                        .filter((item) => item.qty > 0),
                    equipment: nextEquipment,
                }
            }
        case "gainPerk":
            // Perks are a set — skip if already owned.
            return character.perks.includes(effect.perk)
                ? state
                : { ...state, character: { ...character, perks: [...character.perks, effect.perk] } }
        case "reputation":
            return {
                ...state,
                character: {
                    ...character,
                    reputation: {
                        renown: character.reputation.renown + effect.renown,
                        morality: character.reputation.morality + effect.morality,
                    },
                },
            }
        case "move": {
            const { session } = state
            const currentScene = session.scenes.find((scene) => scene.id === session.currentSceneId)
            if (!currentScene) return state

            // New scene: add it, add an exit to it from here, and move in
            if (effect.newScene) {
                const { scene, exitLabel } = effect.newScene
                if (session.scenes.some((known) => known.id === scene.id)) return state
                const scenes = session.scenes.map((known) =>
                    known.id === currentScene.id
                        ? { ...known, exits: [...known.exits, { label: exitLabel, toSceneId: scene.id }] }
                        : known,
                )
                return { ...state, session: { ...session, scenes: [...scenes, scene], currentSceneId: scene.id } }
            }

            // Known scene: needs an exit from here, and the scene must actually exist
            const { sceneId } = effect
            if (sceneId === undefined) return state
            if (!currentScene.exits.some((exit) => exit.toSceneId === sceneId)) return state
            if (!session.scenes.some((known) => known.id === sceneId)) return state
            return { ...state, session: { ...session, currentSceneId: sceneId } }
        }
        default: {
            // Compile error if you add a kind and forget it; at runtime an unvalidated effect fails loudly
            const unhandled: never = effect
            throw new Error(`Unhandled effect kind: ${JSON.stringify(unhandled)}`)
        }
    }
}

// Apply a whole turn's effects in order
export function applyEffects(state: GameState, effects: readonly Effect[]): GameState {
    return effects.reduce(applyEffect, state)
}
