import { START_POSITION } from './constants'

export type Difficulty = 'easy' | 'normal' | 'hard'
export type LaneDirection = 'left' | 'right'
export type PlayerAction = 'up' | 'down' | 'left' | 'right' | 'wait'
export type GameStatus = 'active' | 'won' | 'lost'

export interface Position {
  x: number
  y: number
}

export interface GameConfig {
  lives: number
  crossingsToWin: number
  difficulty: Difficulty
}

export interface LaneDefinition {
  row: number
  direction: LaneDirection
  moveEveryTicks: number
  vehicleLength: number
  vehicleStarts: readonly number[]
}

export interface GameState {
  tick: number
  player: Position
  lives: number
  crossings: number
  score: number
  status: GameStatus
  config: GameConfig
}

export function createInitialState(config: GameConfig): GameState {
  return {
    tick: 0,
    player: { ...START_POSITION },
    lives: config.lives,
    crossings: 0,
    score: 0,
    status: 'active',
    config: { ...config },
  }
}

export function restartGame(config: GameConfig): GameState {
  return createInitialState(config)
}
