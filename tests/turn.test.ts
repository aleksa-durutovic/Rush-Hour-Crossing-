import { describe, expect, it } from 'vitest'
import { DIFFICULTY_PRESETS } from '../src/config/presets'
import type { GameConfig, GameState, LaneDefinition, PlayerAction } from '../src/game/state'
import { createInitialState, restartGame } from '../src/game/state'
import { applyAction } from '../src/game/turn'

const config: GameConfig = {
  lives: 3,
  crossingsToWin: 3,
  difficulty: 'normal',
}

const emptyLanes: LaneDefinition[] = [1, 2, 3, 4, 5].map((row) => ({
  row,
  direction: 'right',
  moveEveryTicks: 1,
  vehicleLength: 1,
  vehicleStarts: [],
})) as LaneDefinition[]

describe('turn transition', () => {
  it('moves exactly one cell and advances one tick', () => {
    const next = applyAction(createInitialState(config), 'up', emptyLanes)

    expect(next.player).toEqual({ x: 4, y: 5 })
    expect(next.tick).toBe(1)
  })

  it('treats an out-of-grid move as wait while advancing traffic', () => {
    const next = applyAction(createInitialState(config), 'down', emptyLanes)

    expect(next.player).toEqual({ x: 4, y: 6 })
    expect(next.tick).toBe(1)
    expect(next.lives).toBe(3)
  })

  it('waits in place and advances one tick', () => {
    const next = applyAction(createInitialState(config), 'wait', emptyLanes)

    expect(next.player).toEqual({ x: 4, y: 6 })
    expect(next.tick).toBe(1)
  })

  it('detects collision A before traffic moves', () => {
    const lanes = withLane({
      row: 5,
      direction: 'right',
      moveEveryTicks: 2,
      vehicleLength: 1,
      vehicleStarts: [4],
    })

    const next = applyAction(createInitialState(config), 'up', lanes)

    expect(next.tick).toBe(1)
    expect(next.lives).toBe(2)
    expect(next.player).toEqual({ x: 4, y: 6 })
  })

  it('detects collision B after traffic moves', () => {
    const lanes = withLane({
      row: 5,
      direction: 'right',
      moveEveryTicks: 1,
      vehicleLength: 1,
      vehicleStarts: [3],
    })

    const next = applyAction(createInitialState(config), 'up', lanes)

    expect(next.lives).toBe(2)
    expect(next.player).toEqual({ x: 4, y: 6 })
  })

  it('removes at most one life when both collision checks match', () => {
    const lanes = withLane({
      row: 5,
      direction: 'right',
      moveEveryTicks: 100,
      vehicleLength: 1,
      vehicleStarts: [4],
    })

    expect(applyAction(createInitialState(config), 'up', lanes).lives).toBe(2)
  })

  it('is deterministic for the same config and action sequence', () => {
    const actions: PlayerAction[] = ['up', 'wait', 'left', 'up', 'right', 'wait']
    const run = (): GameState =>
      actions.reduce(
        (state, action) => applyAction(state, action, DIFFICULTY_PRESETS.normal),
        createInitialState(config),
      )
    const expected = run()

    for (let index = 0; index < 100; index += 1) {
      expect(run()).toEqual(expected)
    }
  })

  it('awards a crossing and wins at the configured target', () => {
    const state: GameState = {
      ...createInitialState({ ...config, crossingsToWin: 1 }),
      player: { x: 4, y: 1 },
    }
    const next = applyAction(state, 'up', emptyLanes)

    expect(next.crossings).toBe(1)
    expect(next.score).toBe(100)
    expect(next.status).toBe('won')
    expect(next.player).toEqual({ x: 4, y: 6 })
  })

  it('loses without allowing lives below zero', () => {
    const lanes = withLane({
      row: 5,
      direction: 'right',
      moveEveryTicks: 1,
      vehicleLength: 1,
      vehicleStarts: [4],
    })
    const state = { ...createInitialState({ ...config, lives: 1 }), lives: 1 }
    const lost = applyAction(state, 'up', lanes)

    expect(lost.lives).toBe(0)
    expect(lost.status).toBe('lost')
    expect(applyAction(lost, 'up', lanes)).toEqual(lost)
  })

  it('restarts every state field from config', () => {
    const changed: GameState = {
      ...createInitialState(config),
      tick: 12,
      player: { x: 2, y: 1 },
      lives: 1,
      crossings: 2,
      score: 200,
      status: 'lost',
    }

    expect(restartGame(changed.config)).toEqual(createInitialState(config))
  })
})

function withLane(lane: LaneDefinition): LaneDefinition[] {
  return emptyLanes.map((candidate) => (candidate.row === lane.row ? lane : candidate))
}
