import { z } from "zod"
import { Scene } from "./scene.js"
import { TrimmedTurn, Choice } from "./turn.js"

export const GameSession = z.object({
  id: z.string(),
  userId: z.string(), // userId -> User.id
  characterId: z.string(), // characterId -> Character.id
  title: z.string().optional(),
  currentSceneId: z.string(), // currentScene -> Scene.id
  scenes: z.array(Scene).default([]), // discovered world
  turnCount: z.number().int().min(0).default(0),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(), // last save
  pendingChoices: z.array(Choice).default([]),
  summary: z.string().default(""),
  recentTurns: z.array(TrimmedTurn).default([]), // most recent turns for agent memory
  rootSeed: z.number().int().min(0).max(0xFFFFFFFF),
})

export type GameSession = z.infer<typeof GameSession>