import type { Difficulty, PlayerAction } from '../../src/game/state'

/**
 * Recorded action sequences for the URL `?crossingsToWin=1&difficulty=<preset>`
 * (lives defaults to 3). Unit tests replay them against the pure turn logic and the
 * browser smoke test replays them as key presses.
 */
export interface GoldenPath {
  actions: readonly PlayerAction[]
  finalTick: number
  finalLives: number
}

export const WINNING_PATHS: Readonly<Record<Difficulty, GoldenPath>> = {
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
  hard: {
    actions: [
      'up', 'down', 'wait', 'wait', 'wait', 'left', 'up', 'up',
      'up', 'up', 'left', 'left', 'left', 'up', 'up',
    ],
    finalTick: 15,
    finalLives: 3,
  },
}

export const LOSING_PATHS: Readonly<Record<Difficulty, GoldenPath>> = {
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
  hard: {
    actions: ['up', 'up', 'up', 'up'],
    finalTick: 4,
    finalLives: 0,
  },
}

/** Fewest actions needed to win once without losing a life (breadth-first search). */
export const SHORTEST_SAFE_WIN: Readonly<Record<Difficulty, number>> = {
  easy: 6,
  normal: 11,
  hard: 15,
}
