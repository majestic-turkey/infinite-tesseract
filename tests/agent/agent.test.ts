import { describe, expect, it } from "vitest"
import { createClaudeNarrator } from "../../packages/agent/agent.js"
import { NarratorError } from "../../packages/agent/narrator.js"
import { SYSTEM_PROMPT } from "../../packages/agent/prompt.js"
import { validGameState } from "../shared/test-utils/fixtures.js"
import { WireAgentTurnOutput } from "../../packages/shared/schemas.js"
import Anthropic from "@anthropic-ai/sdk"

describe("createClaudeNarrator", () => {

    // Only messages.parse is ever called, so a stub with that one method stands in for the SDK -
    // and keeps the suite from spending money now that .env reaches the tests
    const stubClient = (response: unknown) =>
        ({ messages: { parse: async () => response } }) as unknown as Anthropic

    // Records what the narrator sent, so the request shape can be asserted without a real call
    const capturingClient = (response: unknown) => {
        const sent: { params?: Record<string, any> } = {}
        const client = {
            messages: {
                parse: async (params: Record<string, any>) => {
                    sent.params = params
                    return response
                },
            },
        } as unknown as Anthropic
        return { client, sent }
    }

    const wireTurn = () =>
        WireAgentTurnOutput.parse({
            kind: "narration",
            outcome: {
                narrative: "The lamp gutters and steadies.",
                effects: [{ kind: "gainItem", item: { name: "Tallow Candle", category: "misc", tier: 0 } }],
            },
            choices: [{ label: "Light it" }, { label: "Pocket it" }],
        })

    const okResponse = () => ({ stop_reason: "end_turn", parsed_output: { turn: wireTurn() } })

    it("mints ids on the model's output", async () => {
        const client = stubClient(okResponse())
        const narrator = createClaudeNarrator({ client })

        const output = await narrator.nextTurn(validGameState(), { text: "Look around" })

        expect(output.choices.map((choice) => choice.id)).toEqual(["choice-1-1", "choice-1-2"])
        if (output.kind !== "narration") throw new Error("expected a narration turn")
        expect(output.outcome.effects[0]).toMatchObject({ kind: "gainItem", item: { id: "item-1-1" } })
    })

    // Constructing the default client reads credentials but makes no request, so this stays free
    it("builds its own client when none is given", () => {
        expect(createClaudeNarrator()).toHaveProperty("nextTurn")
    })

    it("sends the system prompt as a cacheable block and the turn context as the user message", async () => {
        const { client, sent } = capturingClient(okResponse())
        const narrator = createClaudeNarrator({ client })

        await narrator.nextTurn(validGameState(), { text: "Look around" })

        expect(sent.params?.system).toEqual([
            { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
        ])
        expect(sent.params?.messages).toHaveLength(1)
        expect(sent.params?.messages[0].role).toBe("user")
        expect(sent.params?.messages[0].content).toContain("=== Character ===")
        expect(sent.params?.messages[0].content).toContain("Player Action: *Look around*")
        // The system prompt is the cached prefix, so it must not leak into the per-turn message
        expect(sent.params?.messages[0].content).not.toContain(SYSTEM_PROMPT)
    })

    it("defaults the model and effort, and constrains the output to the wire schema", async () => {
        const { client, sent } = capturingClient(okResponse())

        await createClaudeNarrator({ client }).nextTurn(validGameState(), { text: "Look around" })

        expect(sent.params?.model).toBe("claude-opus-5")
        expect(sent.params?.output_config.effort).toBe("medium")
        expect(sent.params?.output_config.format.type).toBe("json_schema")
    })

    it("uses the configured model and effort when given them", async () => {
        const { client, sent } = capturingClient(okResponse())

        await createClaudeNarrator({ client, model: "claude-sonnet-5", effort: "low" })
            .nextTurn(validGameState(), { text: "Look around" })

        expect(sent.params?.model).toBe("claude-sonnet-5")
        expect(sent.params?.output_config.effort).toBe("low")
    })

    it.each([
        ["refused", { stop_reason: "refusal", parsed_output: { turn: wireTurn() } }],
        ["truncated", { stop_reason: "max_tokens", parsed_output: { turn: wireTurn() } }],
        ["unparsable", { stop_reason: "end_turn", parsed_output: null }],
    ])("throws a %s NarratorError", async (reason, response) => {
        const narrator = createClaudeNarrator({ client: stubClient(response) })

        const attempt = narrator.nextTurn(validGameState(), { text: "Look around" })

        await expect(attempt).rejects.toThrow(NarratorError)
        await expect(attempt).rejects.toMatchObject({ reason })
    })
})
