import { describe, expect, it } from 'vitest'
import { createInitialState, type GameConfig } from '../../src/game/state'
import { createHintSnapshot } from '../../src/hints/snapshot'

const config: GameConfig = { lives: 3, crossingsToWin: 2, difficulty: 'normal' }

describe('Hint snapshot construction', () => {
  it('includes only the minimal active state fields required by the solver', () => {
    const state = {
      ...createInitialState(config),
      tick: 7,
      player: { x: 3, y: 4 },
      crossings: 1,
      score: 100,
    }

    expect(createHintSnapshot(state, config)).toEqual({
      status: 'active',
      difficulty: 'normal',
      tick: 7,
      x: 3,
      y: 4,
      lives: 3,
      crossings: 1,
      crossingsToWin: 2,
    })
  })

  it.each(['won', 'lost'] as const)('does not construct an eligible snapshot after a %s result', (status) => {
    const state = { ...createInitialState(config), status }
    expect(createHintSnapshot(state, config)).toBeNull()
  })
})
