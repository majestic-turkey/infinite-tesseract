import type { Narrator } from "./narrator.js"
import { NarratorError } from "./narrator.js"
import { WireTurnEnvelope } from "../shared/schemas.js"
import type { AgentTurnOutput, PlayerAction } from "../shared/schemas.js"
import { generatePrompt } from "./context.js"
import type { GameState } from "../engine/engine.js"
import { SYSTEM_PROMPT } from "./prompt.js"
import Anthropic from "@anthropic-ai/sdk"
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod"
import { accessionOutput } from "./accessioner.js"

export type ClaudeNarratorConfig = {
    client?: Anthropic
    model?: string
    effort?: "low" | "medium" | "high"
}

const outputFormat = zodOutputFormat(WireTurnEnvelope)


export function createClaudeNarrator(config: ClaudeNarratorConfig = {}): Narrator {
    const client = config.client ?? new Anthropic()
    const model = config.model ?? "claude-opus-5"
    const effort = config.effort ?? "medium"

    async function nextTurn(state: GameState, action: PlayerAction): Promise<AgentTurnOutput> {
        const response = await client.messages.parse({
            model,
            max_tokens: 16000,
            system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
            messages: [{ role: "user", content: generatePrompt(state, action) }],
            output_config: { format: outputFormat, effort },
        })

        if (response.stop_reason === "refusal") throw new NarratorError("refused")
        if (response.stop_reason === "max_tokens") throw new NarratorError("truncated")
        if (!response.parsed_output) throw new NarratorError("unparsable")

        return accessionOutput(response.parsed_output.turn, state)
    }

    return {nextTurn}
}