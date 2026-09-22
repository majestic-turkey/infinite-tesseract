// Interface narrator. nextTurn takes state and an actionText and returns AgentTurnOutput as a promise
import type { GameState } from "../engine/engine.js"
import type { AgentTurnOutput, PlayerAction } from "../shared/schemas.js"

export type Narrator = {
    nextTurn(state: GameState, action: PlayerAction): Promise<AgentTurnOutput>;
}