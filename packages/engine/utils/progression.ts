import type { Character, StatName } from "../../shared/schemas.js";

// Rank up logic when xp hits a threshold
export function rankUp(character: Character, xp: { stat: StatName, amount: number }): Character {
    if (!xp.stat || !(xp.stat in character.stats)) {
        return character
    }
    const currentStat = { ...character.stats[xp.stat] }
    currentStat.xp += xp.amount
    while (currentStat.rank < 10) {
        const xpNeeded = currentStat.rank * 100 // linear progression curve, can be adjusted for different scaling
        if (currentStat.xp < xpNeeded) break
        currentStat.xp -= xpNeeded
        currentStat.rank += 1
    }

    if (currentStat.rank >= 10) {
        currentStat.xp = Math.max(currentStat.xp, 0) // Ensure xp is non-negative at cap
    }

    return { 
        ...character, 
        stats: { 
            ...character.stats, 
            [xp.stat]: currentStat 
        } 
    }
}