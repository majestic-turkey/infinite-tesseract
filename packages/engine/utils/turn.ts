import type { GameState } from "./effects.js"
import type { Rng } from "./checks.js"
import type { AgentTurnOutput, Check } from "../../shared/schemas.js"

// Turn orchestration - resolveTurn(state, action, agentOutput, { rng, now }). It resolves the check, picks the branch, applies its effects, checks for rank-ups, creates the Turn, increments turnCount, adds to and trims recentTurns, and sets updatedAt.

export function resolveTurn(state: GameState, action: Check, agentOutput: AgentTurnOutput, { rng, now }: { rng: Rng; now: Date }) {
  // Implementation goes here
}