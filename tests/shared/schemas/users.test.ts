import { describe, expect, it } from "vitest"
import { User } from "../../../packages/shared/schemas/users.js"
import { TIMESTAMP, expectInvalid, expectValid, omit, str, validUser } from "../test-utils/fixtures.js"

describe("User", () => {
  it("applies defaults to a minimal user", () => {
    const user = expectValid(User, validUser())
    expect(user).toEqual({ ...validUser(), characters: [] })
    expect(user).not.toHaveProperty("updatedAt")
  })

  it("accepts a fully specified user", () => {
    const input = { ...validUser(), updatedAt: "2026-09-15T08:30:00.123Z", characters: ["char-1", "char-2"] }
    expect(expectValid(User, input)).toEqual(input)
  })

  it.each(["id", "username", "email", "createdAt"] as const)("requires %s", (key) => {
    expectInvalid(User, omit(validUser(), key), [key])
  })

  it.each([1, 30])("accepts username of length %i", (length) => {
    expectValid(User, { ...validUser(), username: str(length) })
  })

  it.each([
    ["empty username", { username: "" }, ["username"]],
    ["username over 30 chars", { username: str(31) }, ["username"]],
    ["malformed email", { email: "not-an-email" }, ["email"]],
    ["date-only createdAt", { createdAt: "2026-09-14" }, ["createdAt"]],
    ["createdAt with offset", { createdAt: "2026-09-14T12:00:00+02:00" }, ["createdAt"]],
    ["non-ISO createdAt", { createdAt: "Sept 14, 2026" }, ["createdAt"]],
    ["invalid updatedAt", { updatedAt: "yesterday" }, ["updatedAt"]],
    ["non-string character id", { characters: [1] }, ["characters", 0]],
  ])("rejects %s", (_, overrides, path) => {
    expectInvalid(User, { ...validUser(), ...overrides }, path)
  })

  it("rejects a timestamp as a number", () => {
    expectInvalid(User, { ...validUser(), createdAt: Date.parse(TIMESTAMP) }, ["createdAt"])
  })
})
