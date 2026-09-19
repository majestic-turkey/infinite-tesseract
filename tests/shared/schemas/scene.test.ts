import { describe, expect, it } from "vitest"
import { Scene } from "../../../packages/shared/schemas/scene.js"
import { expectInvalid, expectValid, omit, str, validScene } from "../test-utils/fixtures.js"

describe("Scene", () => {
  it("applies defaults to a minimal scene", () => {
    expect(expectValid(Scene, validScene())).toEqual({
      ...validScene(),
      characters: [],
      enemies: [],
      items: [],
      exits: [],
      tags: [],
    })
  })

  it("accepts a fully specified scene", () => {
    const input = {
      ...validScene(),
      characters: ["npc-1"],
      enemies: ["enemy-1", "enemy-2"],
      items: ["item-1"],
      exits: [{ label: "North door", toSceneId: "scene-2" }],
      tags: ["indoors", "safe"],
    }
    expect(expectValid(Scene, input)).toEqual(input)
  })

  it.each(["id", "roomName", "description"] as const)("requires %s", (key) => {
    expectInvalid(Scene, omit(validScene(), key), [key])
  })

  it("accepts boundary lengths", () => {
    expectValid(Scene, { ...validScene(), roomName: str(1), description: "" })
    expectValid(Scene, { ...validScene(), roomName: str(100), description: str(5000) })
  })

  it.each([
    ["empty roomName", { roomName: "" }, ["roomName"]],
    ["roomName over 100 chars", { roomName: str(101) }, ["roomName"]],
    ["non-string enemy id", { enemies: [7] }, ["enemies", 0]],
    ["non-array tags", { tags: "indoors" }, ["tags"]],
  ])("rejects %s", (_, overrides, path) => {
    expectInvalid(Scene, { ...validScene(), ...overrides }, path)
  })

  describe("exits", () => {
    it("rejects an empty label", () => {
      const exits = [{ label: "", toSceneId: "scene-2" }]
      expectInvalid(Scene, { ...validScene(), exits }, ["exits", 0, "label"])
    })

    it.each(["label", "toSceneId"] as const)("requires %s", (key) => {
      const exits = [omit({ label: "North door", toSceneId: "scene-2" }, key)]
      expectInvalid(Scene, { ...validScene(), exits }, ["exits", 0, key])
    })
  })
})
