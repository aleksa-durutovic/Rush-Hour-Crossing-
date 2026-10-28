import { describe, expect, it } from 'vitest'
import { DIFFICULTY_PRESETS } from '../src/config/presets'
import { START_POSITION } from '../src/game/constants'
import { createInitialState, type GameConfig, type LaneDefinition, type PlayerAction } from '../src/game/state'
import { applyAction } from '../src/game/turn'
import { createLevelSearch, getTrafficPeriod, levelSearchStateKey } from '../src/game/solve-level'
import { WINNING_PATHS } from './fixtures/golden-paths'

const settings = { lives: 3, crossingsToWin: 1 }

function finishSearch(
  lanes: readonly LaneDefinition[],
  crossingsToWin: number,
  budget?: { maxStates?: number; maxActions?: number },
) {
  const search = createLevelSearch(lanes, { lives: 3, crossingsToWin }, budget)
  let result = search.advance(256)
  while (result.status === 'running') result = search.advance(256)
  return result
}

function replay(lanes: readonly LaneDefinition[], actions: readonly PlayerAction[], crossingsToWin: number) {
  const config: GameConfig = { ...settings, crossingsToWin, difficulty: 'normal' }
  let state = createInitialState(config)
  for (const action of actions) state = applyAction(state, action, lanes)
  return state
}

describe('pure incremental safe level search', () => {
  it.each(Object.entries(DIFFICULTY_PRESETS))('%s finds the unchanged shortest first crossing', (difficulty, lanes) => {
    const result = finishSearch(lanes, 1)

    expect(result.status).toBe('solved')
    if (result.status !== 'solved') return
    expect(result.firstCrossingMinMoves).toBe({ easy: 6, normal: 11, hard: 15 }[difficulty as 'easy' | 'normal' | 'hard'])
    expect(result.minMoves).toBe(WINNING_PATHS[difficulty as keyof typeof WINNING_PATHS].actions.length)
    const state = replay(lanes, result.winningActions, 1)
    expect(state.status).toBe('won')
    expect(state.crossings).toBe(1)
    expect(state.lives).toBe(3)
    expect(state.score).toBe(100)
  })

  it.each([
    ['easy', 3, 24], ['easy', 10, 84],
    ['normal', 3, 31], ['normal', 10, 95],
    ['hard', 3, 42], ['hard', 10, 137],
  ] as const)('%s proves the complete %i-crossing minimum', (difficulty, target, expectedMoves) => {
    const lanes = DIFFICULTY_PRESETS[difficulty]
    const result = finishSearch(lanes, target)

    expect(result.status).toBe('solved')
    if (result.status !== 'solved') return
    expect(result.minMoves).toBe(expectedMoves)
    expect(result.firstCrossingMinMoves).toBe({ easy: 6, normal: 11, hard: 15 }[difficulty])
    const state = replay(lanes, result.winningActions, target)
    expect(state.status).toBe('won')
    expect(state.crossings).toBe(target)
    expect(state.score).toBe(target * 100)
    expect(state.lives).toBe(3)
    expect(result.winningActions).toHaveLength(expectedMoves)
  })

  it('shares the first-crossing and full-win proof when the target is one', () => {
    const result = finishSearch(DIFFICULTY_PRESETS.easy, 1)
    expect(result.status).toBe('solved')
    if (result.status !== 'solved') return
    expect(result.firstCrossingActions).toEqual(result.winningActions)
  })

  it('uses the repeating traffic phase and crossing count in state identity', () => {
    const period = getTrafficPeriod(DIFFICULTY_PRESETS.normal)
    const state = createInitialState({ lives: 3, crossingsToWin: 3, difficulty: 'normal' })
    const nextPhase = { ...state, tick: 1 }
    const laterCycle = { ...state, tick: period }
    const laterCrossing = { ...state, crossings: 1 }

    expect(levelSearchStateKey(state, period)).not.toBe(levelSearchStateKey(nextPhase, period))
    expect(levelSearchStateKey(state, period)).toBe(levelSearchStateKey(laterCycle, period))
    expect(levelSearchStateKey(state, period)).not.toBe(levelSearchStateKey(laterCrossing, period))
  })

  it('rejects collision-A and collision-B edges using the engine transition', () => {
    const safeLanes = DIFFICULTY_PRESETS.easy
    const collisionA = safeLanes.map((lane) => lane.row === 5
      ? { ...lane, direction: 'right' as const, moveEveryTicks: 1, vehicleLength: 1, vehicleStarts: [4] }
      : lane)
    const collisionB = safeLanes.map((lane) => lane.row === 5
      ? { ...lane, direction: 'left' as const, moveEveryTicks: 1, vehicleLength: 1, vehicleStarts: [5] }
      : lane)
    const initial = createInitialState({ lives: 3, crossingsToWin: 3, difficulty: 'easy' })

    expect(applyAction(initial, 'up', collisionA).lives).toBe(2)
    expect(applyAction(initial, 'up', collisionB).lives).toBe(2)
    for (const lanes of [collisionA, collisionB]) {
      const result = finishSearch(lanes, 1)
      expect(result.status).toBe('solved')
      if (result.status !== 'solved') continue
      const state = replay(lanes, result.winningActions, 1)
      expect(state.status).toBe('won')
      expect(state.lives).toBe(3)
      expect(state.player).toEqual(START_POSITION)
    }
  })

  it('distinguishes exhaustive impossibility from a resource cutoff', () => {
    const impossible = [
      { row: 1, direction: 'right' as const, moveEveryTicks: 1, vehicleLength: 2, vehicleStarts: [0, 2, 4, 6] },
      ...DIFFICULTY_PRESETS.easy.slice(1),
    ]
    const exhausted = finishSearch(impossible, 1)
    expect(exhausted.status).toBe('unsolvable')
    if (exhausted.status === 'unsolvable') expect(exhausted.explorationComplete).toBe(true)

    const limited = finishSearch(DIFFICULTY_PRESETS.easy, 3, { maxStates: 2 })
    expect(limited.status).toBe('budget_exceeded')
    if (limited.status === 'budget_exceeded') expect(limited.budgetReason).toBe('state_limit')
    const actionLimited = finishSearch(DIFFICULTY_PRESETS.normal, 1, { maxActions: 1 })
    expect(actionLimited.status).toBe('budget_exceeded')
    if (actionLimited.status === 'budget_exceeded') expect(actionLimited.budgetReason).toBe('action_limit')
  })

  it('limits each incremental advance to its requested expansion batch', () => {
    const search = createLevelSearch(DIFFICULTY_PRESETS.hard, { lives: 3, crossingsToWin: 3 })
    const progress = search.advance(1)

    expect(progress.status).toBe('running')
    if (progress.status !== 'running') return
    expect(progress.expandedThisStep).toBeLessThanOrEqual(1)
  })
})
