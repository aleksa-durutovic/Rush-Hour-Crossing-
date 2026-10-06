import { isHintSnapshot, type HintSnapshot } from '../../shared/hint-agent-contract'
import type { GameConfig, GameState } from '../game/state'

/** Build the smallest active-game snapshot the safe-path solver needs. */
export function createHintSnapshot(state: GameState, config: GameConfig): HintSnapshot | null {
  const candidate = {
    status: state.status,
    difficulty: config.difficulty,
    tick: state.tick,
    x: state.player.x,
    y: state.player.y,
    lives: state.lives,
    crossings: state.crossings,
    crossingsToWin: config.crossingsToWin,
  }
  return isHintSnapshot(candidate) ? candidate : null
}
