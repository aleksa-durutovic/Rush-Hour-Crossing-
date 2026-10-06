import { describe, expect, it } from 'vitest'
import { DIFFICULTY_PRESETS } from '../../src/config/presets'
import { createInitialState, type GameConfig, type GameState, type LaneDefinition } from '../../src/game/state'
import { applyAction, getActionDestination } from '../../src/game/turn'
import type { HintSnapshot } from '../../shared/hint-agent-contract'
import { findSafePath, HINT_EXPANDED_STATE_LIMIT } from '../../server/agent/tools/find-safe-path'
import { SHORTEST_SAFE_WIN } from '../fixtures/golden-paths'

const difficulties = ['easy', 'normal', 'hard'] as const

describe('deterministic safe-path solver', () => {
  it.each(difficulties)('finds a shortest life-preserving crossing for %s', (difficulty) => {
    const snapshot = createSnapshot({ difficulty, crossingsToWin: 1 })
    const result = findSafePath(snapshot)

    expect(result.outcome).toBe('verified')
    expect(result.steps).toHaveLength(SHORTEST_SAFE_WIN[difficulty])
    expect(result.steps.at(-1)?.status).toBe('won')
    expect(result.steps.at(-1)?.crossings).toBe(1)
    expect(result.steps.every((step) => step.lives === snapshot.lives)).toBe(true)
  })

  it('starts from the submitted non-start position and returns only the next crossing', () => {
    const prefix = applyAction(initialState('easy', 3), 'up', DIFFICULTY_PRESETS.easy)
    const snapshot = createSnapshot({
      difficulty: 'easy',
      tick: prefix.tick,
      x: prefix.player.x,
      y: prefix.player.y,
      lives: prefix.lives,
      crossings: 1,
      crossingsToWin: 3,
    })
    const result = findSafePath(snapshot)

    expect(result.outcome).toBe('verified')
    expect(result.steps).toHaveLength(5)
    expect(result.steps.at(-1)).toMatchObject({
      crossings: snapshot.crossings + 1,
      entered: { y: 0 },
      status: 'active',
    })
    expect(result.steps.every((step) => step.lives === snapshot.lives)).toBe(true)
  })

  it('uses the nearest safe goal-row cell, regardless of its column', () => {
    const snapshot = createSnapshot({ x: 0, y: 1, crossingsToWin: 3 })
    const result = findSafePath(snapshot, { lanes: [] })

    expect(result.outcome).toBe('verified')
    expect(result.steps).toHaveLength(1)
    expect(result.steps.at(-1)).toMatchObject({
      action: 'up',
      entered: { x: 0, y: 0 },
      crossings: 1,
      status: 'active',
    })
  })

  it('replays every route action and attempted cell through the existing transition', () => {
    const snapshot = createSnapshot({ difficulty: 'hard', crossingsToWin: 1 })
    const result = findSafePath(snapshot)
    let state = stateFromSnapshot(snapshot)

    expect(result.outcome).toBe('verified')
    for (const step of result.steps) {
      expect(step.entered).toEqual(getActionDestination(state.player, step.action))
      state = applyAction(state, step.action, DIFFICULTY_PRESETS[snapshot.difficulty])
      expect(step).toEqual({
        action: step.action,
        entered: step.entered,
        tick: state.tick,
        x: state.player.x,
        y: state.player.y,
        lives: state.lives,
        crossings: state.crossings,
        status: state.status,
      })
    }
  })

  it('returns an identical route for identical snapshots', () => {
    const snapshot = createSnapshot({ difficulty: 'normal', crossingsToWin: 2 })

    expect(findSafePath(snapshot)).toEqual(findSafePath(snapshot))
  })

  it('returns search_limit when the expansion cap prevents proof', () => {
    const result = findSafePath(createSnapshot({ difficulty: 'easy', crossingsToWin: 1 }), {
      maxExpandedStates: 1,
    })

    expect(result.outcome).toBe('search_limit')
    expect(result.steps).toEqual([])
  })

  it('returns search_limit when the route depth cap is reached', () => {
    const result = findSafePath(createSnapshot({ difficulty: 'easy', crossingsToWin: 1 }), {
      maxActions: 1,
    })

    expect(result.outcome).toBe('search_limit')
    expect(result.steps).toEqual([])
  })

  it('reports no_safe_path only after exhausting the finite safe graph', () => {
    const fullBlockedRow: LaneDefinition = {
      row: 5,
      direction: 'right',
      moveEveryTicks: 1,
      vehicleLength: 1,
      vehicleStarts: Array.from({ length: 9 }, (_value, column) => column),
    }
    const result = findSafePath(createSnapshot({ difficulty: 'easy', crossingsToWin: 1 }), {
      lanes: [fullBlockedRow],
    })

    expect(result.outcome).toBe('no_safe_path')
    expect(result.steps).toEqual([])
  })

  it('uses the documented current-preset state and route caps', () => {
    expect(HINT_EXPANDED_STATE_LIMIT).toBe(30_000)
    const result = findSafePath(createSnapshot({ difficulty: 'hard', crossingsToWin: 2 }))

    expect(result.steps.length).toBeLessThanOrEqual(512)
    expect(result.outcome === 'verified' || result.outcome === 'search_limit').toBe(true)
  })
})

function createSnapshot(overrides: Partial<HintSnapshot>): HintSnapshot {
  return {
    status: 'active',
    difficulty: 'easy',
    tick: 0,
    x: 4,
    y: 6,
    lives: 3,
    crossings: 0,
    crossingsToWin: 1,
    ...overrides,
  }
}

function stateFromSnapshot(snapshot: HintSnapshot): GameState {
  const config: GameConfig = {
    lives: snapshot.lives,
    crossingsToWin: snapshot.crossingsToWin,
    difficulty: snapshot.difficulty,
  }
  return {
    ...createInitialState(config),
    tick: snapshot.tick,
    player: { x: snapshot.x, y: snapshot.y },
    lives: snapshot.lives,
    crossings: snapshot.crossings,
    score: snapshot.crossings * 100,
  }
}

function initialState(difficulty: HintSnapshot['difficulty'], crossingsToWin: number): GameState {
  return createInitialState({ lives: 3, crossingsToWin, difficulty })
}
