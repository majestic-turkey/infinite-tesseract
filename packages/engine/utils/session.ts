import { GameSession } from "../../shared/schemas.js"
import { STARTING_SCENE } from "../content/startingScene.js"

export type NewSession = {
    id: string
    userId: string
    characterId: string
    rootSeed: number
    now: string
}

// Every session starts inside a real scene, so the first move always has a current scene to leave from
export function createSession({ now, ...input }: NewSession): GameSession {
    return GameSession.parse({
        ...input,
        createdAt: now,
        updatedAt: now,
        currentSceneId: STARTING_SCENE.id,
        scenes: [STARTING_SCENE],
    })
}
