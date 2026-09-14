import { z } from "zod";

export const StatName = z.enum([
    "strength",     // physical power
    "dexterity",    // agility and reflexes
    "will",         // mental fortitude/magical aptitude
    "charisma"      // social influence
]);
export const Slot = z.enum([
    "head",
    "torso",
    "legs",
    "feet",
    "mainHand",
    "offHand",
    "accessory"
]);
export const ItemType = z.enum([
    "weapon",
    "armor",
    "accessory",
    "consumable",
    "key",
    "misc"
]);

const Stat = z.object({
  rank: z.number().int().min(1).max(10),
  xp: z.number().int().min(0),        // progress toward next rank
});

export const Item = z.object({
  id: z.string(),
  name: z.string(),                   // AI supplies the flavor name
  category: ItemType,
  tier: z.number().int().min(0),      // engine derives stats from category + tier
  slot: Slot.optional(),              // present = equippable
  twoHanded: z.boolean().default(false), // only relevant for weapons
  bonuses: z.partialRecord(StatName, z.number().int()).default({}), // stat bonuses provided by the item
  qty: z.number().int().min(1).default(1), // quantity of the item in the inventory
});

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
});
export type Character = z.infer<typeof Character>;