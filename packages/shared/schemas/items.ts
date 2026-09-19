import { z } from "zod"

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
  tier: z.number().int().min(0),      // power level; bonuses are stored per item, not derived from tier
  slot: Slot.optional(),              // present = equippable
  twoHanded: z.boolean().default(false), // only relevant for weapons
  bonuses: z.strictObject({
    strength: z.number().int().optional(),
    dexterity: z.number().int().optional(),
    will: z.number().int().optional(),
    charisma: z.number().int().optional(),
  }).default({}), // stat bonuses provided by the item
  qty: z.number().int().min(1).default(1), // quantity of the item in the inventory
})

export type Item = z.infer<typeof Item>
export type ItemType = z.infer<typeof ItemType>
export type Slot = z.infer<typeof Slot>