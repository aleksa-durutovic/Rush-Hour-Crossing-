import { isCompletedRunSummary, type CompletedRunSummary } from '../../shared/advice-contract'
import type { GameState } from '../game/state'

export function buildCompletedRunSummary(state: GameState | null): CompletedRunSummary | null {
  if (!state || state.status === 'active') return null

  const summary: CompletedRunSummary = {
    outcome: state.status,
    difficulty: state.config.difficulty,
    ticks: state.tick,
    crossings: state.crossings,
    targetCrossings: state.config.crossingsToWin,
    startingLives: state.config.lives,
    remainingLives: state.lives,
    score: state.score,
  }

  return isCompletedRunSummary(summary) ? summary : null
}
