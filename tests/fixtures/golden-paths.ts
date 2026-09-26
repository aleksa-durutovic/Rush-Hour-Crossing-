import type { Difficulty, PlayerAction } from '../../src/game/state'

/**
 * Recorded action sequences for the URL `?crossingsToWin=1&difficulty=<preset>`
 * (lives defaults to 3). Unit tests replay them against the pure turn logic.
 */
export interface GoldenPath {
  actions: readonly PlayerAction[]
  finalTick: number
  finalLives: number
}

/** Presets that currently have recorded golden paths. */
export type CoveredDifficulty = Extract<Difficulty, 'easy' | 'normal'>

export const WINNING_PATHS: Readonly<Record<CoveredDifficulty, GoldenPath>> = {
  easy: {
    actions: ['up', 'up', 'up', 'up', 'up', 'up'],
    finalTick: 6,
    finalLives: 3,
  },
  normal: {
    actions: ['up', 'right', 'up', 'right', 'left', 'up', 'up', 'wait', 'wait', 'up', 'up'],
    finalTick: 11,
    finalLives: 3,
  },
}

export const LOSING_PATHS: Readonly<Record<CoveredDifficulty, GoldenPath>> = {
  easy: {
    actions: ['up', 'up', 'right', 'up', 'up', 'up'],
    finalTick: 6,
    finalLives: 0,
  },
  normal: {
    actions: ['up', 'up', 'up', 'up', 'up', 'up'],
    finalTick: 6,
    finalLives: 0,
  },
}

/** Fewest actions needed to win once without losing a life (breadth-first search). */
export const SHORTEST_SAFE_WIN: Readonly<Record<CoveredDifficulty, number>> = {
  easy: 6,
  normal: 11,
}
