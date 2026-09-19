import type { Character, GameSession, Effect, Item, Slot } from "../../shared/schemas.js"
import { rankUp } from "./progression.js"

// A turn mutates both the character and the session, so the reducer operates
// over the whole game state rather than the Character alone

export type GameState = { character: Character; session: GameSession }

function nextUniqueId(baseId: string, existingIds: ReadonlySet<string>): string {
    if (!existingIds.has(baseId)) return baseId
    let suffix = 2
    let candidate = `${baseId}-${suffix}`
    while (existingIds.has(candidate)) {
        suffix += 1
        candidate = `${baseId}-${suffix}`
    }
    return candidate
}

function sameItemDefinition(a: Item, b: Item): boolean {
    return a.name === b.name
        && a.category === b.category
        && a.tier === b.tier
        && a.slot === b.slot
        && a.twoHanded === b.twoHanded
        && a.bonuses.strength === b.bonuses.strength
        && a.bonuses.dexterity === b.bonuses.dexterity
        && a.bonuses.will === b.bonuses.will
        && a.bonuses.charisma === b.bonuses.charisma
}

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
            const existing = character.inventory.find((item) => item.id === effect.item.id)
            if (existing && sameItemDefinition(existing, effect.item)) {
                const inventory = character.inventory.map((item) =>
                    item.id === effect.item.id ? { ...item, qty: item.qty + effect.item.qty } : item)
                return { ...state, character: { ...character, inventory } }
            }

            const usedIds = new Set(character.inventory.map((item) => item.id))
            const itemId = nextUniqueId(effect.item.id, usedIds)
            const inventory = [...character.inventory, itemId === effect.item.id ? effect.item : { ...effect.item, id: itemId }]
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
            if ("newScene" in effect) {
                const { scene, exitLabel } = effect.newScene
                const usedIds = new Set(session.scenes.map((known) => known.id))
                const sceneId = nextUniqueId(scene.id, usedIds)
                const sceneToAdd = sceneId === scene.id ? scene : { ...scene, id: sceneId }
                const scenes = session.scenes.map((known) =>
                    known.id === currentScene.id
                        ? { ...known, exits: [...known.exits, { label: exitLabel, toSceneId: sceneToAdd.id }] }
                        : known,
                )
                return { ...state, session: { ...session, scenes: [...scenes, sceneToAdd], currentSceneId: sceneToAdd.id } }
            }

            // Known scene: needs an exit from here, and the scene must actually exist
            const { sceneId } = effect
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
