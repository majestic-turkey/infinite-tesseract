import { z } from "zod"

export const User = z.object({
  id: z.string(),
  username: z.string().min(1).max(30),
  email: z.string().email(),
  passwordHash: z.string(),
  createdAt: z.date(),
  updatedAt: z.date().optional(), // last save
  characters: z.array(z.string()).default([]), // character IDs owned by the user
})

export type User = z.infer<typeof User>