import { Stat } from "./stats.js"
import { Item, Slot } from "./items.js"
import { z } from "zod"

export const Character = z.object({
  id: z.string(),
  name: z.string().min(1).max(40),
  background: z.string().max(200), // character's backstory or lore
  hp: z.number().int().min(0),
  maxHp: z.number().int().min(1),
  gold: z.number().int().min(0),
  stats: z.object({ strength: Stat, dexterity: Stat, will: Stat, charisma: Stat }),
  equipment: z.partialRecord(Slot, z.string()),  // slot -> inventory item id
  inventory: z.array(Item),
  perks: z.array(z.string()), // list of character perks or abilities
  reputation: z.object({ renown: z.number().int(), morality: z.number().int() }), // character's reputation metrics
})
export type Character = z.infer<typeof Character>