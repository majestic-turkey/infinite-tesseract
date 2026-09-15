import { describe, expect, it } from "vitest"
import * as schemas from "../../../packages/shared/schemas.js"

describe("schemas barrel", () => {
  it.each([
    "Character",
    "Item",
    "ItemType",
    "Slot",
    "Stat",
    "StatName",
    "Scene",
    "StatDelta",
    "Choice",
    "PlayerAction",
    "Check",
    "Branch",
    "Effect",
    "AgentTurnOutput",
    "Turn",
    "TrimmedTurn",
    "GameSession",
    "User",
  ])("exports %s", (name) => {
    expect(schemas).toHaveProperty(name)
  })
})
