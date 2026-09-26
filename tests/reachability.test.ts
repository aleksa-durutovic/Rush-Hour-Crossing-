import { describe, expect, it } from 'vitest'
import { DIFFICULTY_PRESETS } from '../src/config/presets'
import type {
  GameConfig,
  GameState,
  GameStatus,
  LaneDefinition,
  PlayerAction,
} from '../src/game/state'
import { createInitialState } from '../src/game/state'
import { applyAction } from '../src/game/turn'
import type { CoveredDifficulty } from './fixtures/golden-paths'
import { LOSING_PATHS, SHORTEST_SAFE_WIN, WINNING_PATHS } from './fixtures/golden-paths'

const actions: readonly PlayerAction[] = ['up', 'down', 'left', 'right', 'wait']
const difficulties: readonly CoveredDifficulty[] = ['easy', 'normal']
const MAX_PATH_LENGTH = 80

describe('real preset reachability', () => {
  it.each(difficulties)('%s can be won without losing a life', (difficulty) => {
    const path = findPath(difficulty, 1, 'won')

    expect(path).not.toBeNull()
    expect(path?.length).toBe(SHORTEST_SAFE_WIN[difficulty])
  })

  it.each(difficulties)('%s can be lost through player actions', (difficulty) => {
    expect(findPath(difficulty, 3, 'lost')).not.toBeNull()
  })
})

describe('recorded golden paths', () => {
  it.each(difficulties)('the recorded winning path wins %s', (difficulty) => {
    const golden = WINNING_PATHS[difficulty]
    const state = replay(difficulty, golden.actions)

    expect(state.status).toBe('won')
    expect(state.tick).toBe(golden.finalTick)
    expect(state.lives).toBe(golden.finalLives)
    expect(state.crossings).toBe(1)
    expect(state.score).toBe(100)
  })

  it.each(difficulties)('the recorded losing path loses %s', (difficulty) => {
    const golden = LOSING_PATHS[difficulty]
    const state = replay(difficulty, golden.actions)

    expect(state.status).toBe('lost')
    expect(state.tick).toBe(golden.finalTick)
    expect(state.lives).toBe(golden.finalLives)
    expect(state.crossings).toBe(0)
  })
})

function replay(difficulty: CoveredDifficulty, path: readonly PlayerAction[]): GameState {
  const config: GameConfig = { lives: 3, crossingsToWin: 1, difficulty }
  const lanes = DIFFICULTY_PRESETS[difficulty]
  return path.reduce(
    (state, action) => applyAction(state, action, lanes),
    createInitialState(config),
  )
}

function findPath(
  difficulty: CoveredDifficulty,
  lives: number,
  target: Extract<GameStatus, 'won' | 'lost'>,
): PlayerAction[] | null {
  const config: GameConfig = { lives, crossingsToWin: 1, difficulty }
  const lanes: readonly LaneDefinition[] = DIFFICULTY_PRESETS[difficulty]
  const queue: { state: GameState; path: PlayerAction[] }[] = [
    { state: createInitialState(config), path: [] },
  ]
  const visited = new Set<string>()

  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const current = queue[cursor]
    if (!current) {
      continue
    }
    if (current.state.status === target) {
      return current.path
    }
    if (current.path.length >= MAX_PATH_LENGTH || current.state.status !== 'active') {
      continue
    }

    for (const action of actions) {
      const state = applyAction(current.state, action, lanes)
      const key = stateKey(state)
      if (!visited.has(key)) {
        visited.add(key)
        queue.push({ state, path: [...current.path, action] })
      }
    }
  }

  return null
}

function stateKey(state: GameState): string {
  return [
    state.tick,
    state.player.x,
    state.player.y,
    state.lives,
    state.crossings,
    state.status,
  ].join(':')
}
