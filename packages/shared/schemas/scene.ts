import { z } from "zod"

export const Scene = z.object({
  id: z.string(),
  roomName: z.string().min(1).max(100),
  description: z.string().max(500),
  characters: z.array(z.string()).optional(), // list of NPC IDs present in the scene, if any
  enemies: z.array(z.string()).optional(), // list of enemy IDs present in the scene, if any
  items: z.array(z.string()).optional(), // list of item IDs present in the scene, if any
  exits: z.array(z.object({
    label: z.string().min(1),
    toSceneId: z.string()
  })).default([]),
  tags: z.array(z.string()).default([])
})

export type Scene = z.infer<typeof Scene>