import { StatName, type Character } from "../../shared/schemas.js"

export function effectiveStats(character: Character): Record<StatName, number> {
    const equipped = new Set(Object.values(character.equipment))
    const totals = Object.fromEntries(
        StatName.options.map((stat) => [stat, character.stats[stat].rank]),
    ) as Record<StatName, number>
    for (const item of character.inventory) {
        if (!equipped.has(item.id)) continue
        for (const stat of StatName.options) {
            totals[stat] += item.bonuses[stat] ?? 0
        }
    }
    return totals
}
