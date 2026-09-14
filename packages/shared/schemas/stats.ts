import { z } from "zod"

export const StatName = z.enum([
    "strength",     // physical power
    "dexterity",    // agility and reflexes
    "will",         // mental fortitude/magical aptitude
    "charisma"      // social influence
])

export const Stat = z.object({
  rank: z.number().int().min(1).max(10),
  xp: z.number().int().min(0),        // progress toward next rank
})

export type Stat = z.infer<typeof Stat>
export type StatName = z.infer<typeof StatName>