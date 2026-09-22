// Narrator implementation. Test with Claude, chatGPT, and some HuggingFace models
import type { Narrator } from "./narrator.js"
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod"
import { AgentTurnOutput, WireAgentTurnOutput } from "../shared/schemas.js"
import { generatePrompt } from "./context.js"
import Anthropic from "@anthropic-ai/sdk"

const claudeConfig = {
    model: "claude-opus-5",
    effort: "medium",
} satisfies ClaudeNarratorConfig


export type ClaudeNarratorConfig = {
    client?: Anthropic
    model?: string
    effort?: "low" | "medium" | "high"
}

export function createClaudeNarrator(config: ClaudeNarratorConfig = {}): Narrator {
    const client = config.client ?? new Anthropic()
    const model = config.model ?? "claude-opus-5"

    return {
        async nextTurn(state, action) {
            const prompt = generatePrompt(state, action);
            return Promise.resolve({} as AgentTurnOutput);
        },
    }
}

zodOutputFormat(WireAgentTurnOutput)

const claude = createClaudeNarrator(claudeConfig)