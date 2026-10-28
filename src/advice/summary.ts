import { isCompletedRunSummary, type CompletedRunSummary } from '../../shared/advice-contract'
import type { GameState } from '../game/state'

export type ActiveTrafficOrigin = 'preset' | 'generated'

export function buildCompletedRunSummary(
  state: GameState | null,
  origin: ActiveTrafficOrigin = 'preset',
): CompletedRunSummary | null {
  if (!state || state.status === 'active') return null

  const summary: CompletedRunSummary = {
    outcome: state.status,
    difficulty: origin === 'generated' ? 'generated' : state.config.difficulty,
    ticks: state.tick,
    crossings: state.crossings,
    targetCrossings: state.config.crossingsToWin,
    startingLives: state.config.lives,
    remainingLives: state.lives,
    score: state.score,
  }

  return isCompletedRunSummary(summary) ? summary : null
}
