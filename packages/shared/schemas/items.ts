import { z } from "zod"
import { StatName } from "./stats.js"

export const Slot = z.enum([
    "head",
    "torso",
    "legs",
    "feet",
    "mainHand",
    "offHand",
    "accessory"
])

export const ItemType = z.enum([
    "weapon",
    "armor",
    "accessory",
    "consumable",
    "key",
    "misc"
])

export const Item = z.object({
  id: z.string(),
  name: z.string(),                   // AI supplies the flavor name
  category: ItemType,
  tier: z.number().int().min(0),      // engine derives stats from category + tier
  slot: Slot.optional(),              // present = equippable
  twoHanded: z.boolean().default(false), // only relevant for weapons
  bonuses: z.partialRecord(StatName, z.number().int()).default({}), // stat bonuses provided by the item
  qty: z.number().int().min(1).default(1), // quantity of the item in the inventory
})

export type Item = z.infer<typeof Item>
export type ItemType = z.infer<typeof ItemType>
export type Slot = z.infer<typeof Slot>