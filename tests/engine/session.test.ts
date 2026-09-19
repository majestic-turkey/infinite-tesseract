import { describe, expect, it } from "vitest"
import { STARTING_SCENE } from "../../packages/engine/content/startingScene.js"
import { applyEffects } from "../../packages/engine/utils/effects.js"
import { createSession, type NewSession } from "../../packages/engine/utils/session.js"
import { Character, GameSession, Scene } from "../../packages/shared/schemas.js"
import { TIMESTAMP, validCharacter, validScene } from "../shared/test-utils/fixtures.js"

const input = (): NewSession => ({
  id: "session-1",
  userId: "user-1",
  characterId: "char-1",
  rootSeed: 12345,
  now: TIMESTAMP,
})

describe("STARTING_SCENE", () => {
  it("is a valid scene with no exits", () => {
    expect(Scene.parse(STARTING_SCENE)).toEqual(STARTING_SCENE)
    expect(STARTING_SCENE.exits).toEqual([])
  })
})

describe("createSession", () => {
  it("starts inside the starting scene", () => {
    const session = createSession(input())
    expect(session.currentSceneId).toBe(STARTING_SCENE.id)
    expect(session.scenes).toEqual([STARTING_SCENE])
  })

  it("stamps both timestamps with now and applies defaults", () => {
    expect(createSession(input())).toMatchObject({
      id: "session-1",
      userId: "user-1",
      characterId: "char-1",
      rootSeed: 12345,
      createdAt: TIMESTAMP,
      updatedAt: TIMESTAMP,
      turnCount: 0,
      summary: "",
      recentTurns: [],
    })
  })

  it("does not carry the now field onto the session", () => {
    expect(createSession(input())).not.toHaveProperty("now")
  })

  it("produces a session that round-trips through the schema", () => {
    const session = createSession(input())
    expect(GameSession.parse(session)).toEqual(session)
  })

  it("rejects invalid input", () => {
    expect(() => createSession({ ...input(), rootSeed: -1 })).toThrow()
  })

  it("lets the player move from the start into a new scene", () => {
    const state = { character: Character.parse(validCharacter()), session: createSession(input()) }
    const shard = Scene.parse({ ...validScene(), id: "shard" })
    const after = applyEffects(state, [
      { kind: "move", newScene: { scene: shard, exitLabel: "Focus on one face" } },
    ])
    expect(after.session.currentSceneId).toBe("shard")
    expect(after.session.scenes[0]?.exits).toEqual([{ label: "Focus on one face", toSceneId: "shard" }])
  })
})
