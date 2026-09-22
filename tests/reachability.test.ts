import { describe, expect, it } from 'vitest'
import { DIFFICULTY_PRESETS } from '../src/config/presets'
import type { GameState, GameStatus, PlayerAction } from '../src/game/state'
import { createInitialState } from '../src/game/state'
import { applyAction } from '../src/game/turn'

const actions: readonly PlayerAction[] = ['up', 'down', 'left', 'right', 'wait']
const config = { lives: 3, crossingsToWin: 1, difficulty: 'easy' as const }
const lanes = DIFFICULTY_PRESETS.easy

describe('real preset reachability', () => {
  it.each(['won', 'lost'] as const)('can reach the %s state through player actions', (target) => {
    const path = findPath(target)
    expect(path).not.toBeNull()
  })
})

function findPath(target: Extract<GameStatus, 'won' | 'lost'>): PlayerAction[] | null {
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
    if (current.path.length >= 80 || current.state.status !== 'active') {
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
