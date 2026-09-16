import type { Character, GameSession, Effect } from "../../shared/schemas.js"

// A turn mutates both the character and the session, so the reducer operates
// over the whole game state rather than the Character alone

export type GameState = { character: Character; session: GameSession }

export function applyEffect(s: GameState, e: Effect): GameState {
    const { character } = s
    switch (e.kind) {
        case "damage":
            return { ...s, character: { ...character, hp: Math.max(0, character.hp - e.amount) } }
        case "heal":
              return { ...s, character: { ...character, hp: Math.min(character.maxHp, character.hp + e.amount) } }
        case "gold":
              return { ...s, character: { ...character, gold: character.gold + e.amount } }
        case "xp":
              // Accumulates xp only; crossing a rank threshold is separate engine logic
              return {
                  ...s,
                  character: {
                      ...character,
                      stats: {
                          ...character.stats,
                          [e.stat]: { ...character.stats[e.stat], xp: character.stats[e.stat].xp + e.amount },
                      },
                  },
              }
        case "gainItem":
          return { ...s, character: { ...character, inventory: [...character.inventory, e.item] } }
        case "loseItem":
          return {
            ...s,
            character: {
              ...character,
              inventory: character.inventory
                .map((item) => (item.id === e.itemId ? { ...item, qty: item.qty - e.qty } : item))
                .filter((item) => item.qty > 0),
            },
          }
        case "gainPerk":
          // Perks are a set — skip if already owned.
          return character.perks.includes(e.perk)
            ? s
            : { ...s, character: { ...character, perks: [...character.perks, e.perk] } }
        case "reputation":
          return {
            ...s,
            character: {
              ...character,
              reputation: {
                renown: character.reputation.renown + e.renown,
                morality: character.reputation.morality + e.morality,
              },
            },
          }
        case "move":
          return { ...s, session: { ...s.session, currentSceneId: e.sceneId } }
        default: {
          const _never: never = e // compile error if you add a kind and forget it
          return _never
        }
      }
}

// Apply a whole turn's effects in order
export function applyEffects(s: GameState, effects: readonly Effect[]): GameState {
  return effects.reduce(applyEffect, s)
}
