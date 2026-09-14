import { describe, expect, it } from "vitest"
import { GameSession } from "../../../packages/shared/schemas/session.js"
import { expectInvalid, expectValid, omit, validScene, validSession, validTrimmedTurn } from "../test-utils/fixtures.js"

describe("GameSession", () => {
  it("applies defaults to a minimal session", () => {
    const session = expectValid(GameSession, validSession())
    expect(session).toEqual({ ...validSession(), scenes: [], turnCount: 0, summary: "", recentTurns: [] })
    expect(session).not.toHaveProperty("title")
  })

  it("accepts a fully specified session", () => {
    const input = {
      ...validSession(),
      title: "The Long Road",
      scenes: [{ ...validScene(), characters: [], enemies: [], items: [], exits: [], tags: [] }],
      turnCount: 12,
      summary: "Aria arrived in town.",
      recentTurns: [validTrimmedTurn()],
    }
    expect(expectValid(GameSession, input)).toEqual(input)
  })

  it("applies scene defaults to nested scenes", () => {
    const session = expectValid(GameSession, { ...validSession(), scenes: [validScene()] })
    expect(session.scenes[0]).toMatchObject({ exits: [], tags: [] })
  })

  it.each(["id", "userId", "characterId", "currentSceneId", "createdAt", "updatedAt"] as const)(
    "requires %s",
    (key) => {
      expectInvalid(GameSession, omit(validSession(), key), [key])
    },
  )

  it("does not accept the legacy currentScene key", () => {
    const { currentSceneId, ...rest } = validSession()
    expectInvalid(GameSession, { ...rest, currentScene: currentSceneId }, ["currentSceneId"])
  })

  it.each([
    ["negative turnCount", { turnCount: -1 }, ["turnCount"]],
    ["fractional turnCount", { turnCount: 1.5 }, ["turnCount"]],
    ["non-string title", { title: 5 }, ["title"]],
    ["malformed createdAt", { createdAt: "2026-09-14" }, ["createdAt"]],
    ["malformed updatedAt", { updatedAt: "later" }, ["updatedAt"]],
    ["an invalid scene", { scenes: [{ ...validScene(), roomName: "" }] }, ["scenes", 0, "roomName"]],
    ["an invalid recent turn", { recentTurns: [omit(validTrimmedTurn(), "action")] }, ["recentTurns", 0, "action"]],
  ])("rejects %s", (_, overrides, path) => {
    expectInvalid(GameSession, { ...validSession(), ...overrides }, path)
  })
})
