import { GOAL_ROW, GRID_COLUMNS, GRID_ROWS, START_POSITION } from './constants'
import type { GameState, LaneDefinition, PlayerAction, Position } from './state'
import { hasTrafficAt } from './traffic'

export function applyAction(
  state: GameState,
  action: PlayerAction,
  lanes: readonly LaneDefinition[],
): GameState {
  if (state.status !== 'active') {
    return state
  }

  const player = moveWithinGrid(state.player, action)
  const collisionBeforeTraffic = hasTrafficAt(player, lanes, state.tick)
  const nextTick = state.tick + 1
  const collisionAfterTraffic = hasTrafficAt(player, lanes, nextTick)

  if (collisionBeforeTraffic || collisionAfterTraffic) {
    const lives = Math.max(0, state.lives - 1)
    return {
      ...state,
      tick: nextTick,
      player: { ...START_POSITION },
      lives,
      status: lives === 0 ? 'lost' : 'active',
    }
  }

  if (player.y === GOAL_ROW) {
    const crossings = state.crossings + 1
    return {
      ...state,
      tick: nextTick,
      player: { ...START_POSITION },
      crossings,
      score: state.score + 100,
      status: crossings >= state.config.crossingsToWin ? 'won' : 'active',
    }
  }

  return {
    ...state,
    tick: nextTick,
    player,
  }
}

function moveWithinGrid(position: Position, action: PlayerAction): Position {
  const delta = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
    wait: { x: 0, y: 0 },
  }[action]
  const candidate = { x: position.x + delta.x, y: position.y + delta.y }

  if (
    candidate.x < 0 ||
    candidate.x >= GRID_COLUMNS ||
    candidate.y < 0 ||
    candidate.y >= GRID_ROWS
  ) {
    return { ...position }
  }

  return candidate
}
