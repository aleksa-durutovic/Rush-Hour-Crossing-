import { describe, expect, it } from 'vitest'
import { buildCompletedRunSummary } from '../../src/advice/summary'
import type { GameState } from '../../src/game/state'

function gameState(overrides: Partial<GameState> = {}): GameState {
  return {
    tick: 18,
    player: { x: 4, y: 6 },
    lives: 0,
    crossings: 0,
    score: 0,
    status: 'lost',
    config: { lives: 3, crossingsToWin: 3, difficulty: 'easy' },
    ...overrides,
  }
}

describe('completed-run Option C summary', () => {
  it('does not summarize an active or missing game state', () => {
    expect(buildCompletedRunSummary(null)).toBeNull()
    expect(buildCompletedRunSummary(gameState({ status: 'active', lives: 3 }))).toBeNull()
  })

  it('returns exactly the eight selected fields for a loss', () => {
    const summary = buildCompletedRunSummary(gameState())

    expect(summary).toEqual({
      outcome: 'lost',
      difficulty: 'easy',
      ticks: 18,
      crossings: 0,
      targetCrossings: 3,
      startingLives: 3,
      remainingLives: 0,
      score: 0,
    })
    expect(Object.keys(summary ?? {}).sort()).toEqual([
      'crossings',
      'difficulty',
      'outcome',
      'remainingLives',
      'score',
      'startingLives',
      'targetCrossings',
      'ticks',
    ])
  })

  it('preserves completed-win metrics without player, lane, or action data', () => {
    const summary = buildCompletedRunSummary(
      gameState({
        tick: 11,
        lives: 2,
        crossings: 1,
        score: 100,
        status: 'won',
        config: { lives: 2, crossingsToWin: 1, difficulty: 'normal' },
      }),
    )

    expect(summary).toEqual({
      outcome: 'won',
      difficulty: 'normal',
      ticks: 11,
      crossings: 1,
      targetCrossings: 1,
      startingLives: 2,
      remainingLives: 2,
      score: 100,
    })
  })

  it('labels generated traffic explicitly while retaining exactly eight summary fields', () => {
    const summary = buildCompletedRunSummary(gameState(), 'generated')

    expect(summary).toMatchObject({ outcome: 'lost', difficulty: 'generated' })
    expect(Object.keys(summary ?? {}).sort()).toEqual([
      'crossings', 'difficulty', 'outcome', 'remainingLives', 'score', 'startingLives', 'targetCrossings', 'ticks',
    ])
    expect(buildCompletedRunSummary(gameState())?.difficulty).toBe('easy')
  })
})
