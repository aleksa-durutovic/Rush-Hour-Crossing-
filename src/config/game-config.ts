import type { Difficulty, GameConfig } from '../game/state'

export const DEFAULT_CONFIG: Readonly<GameConfig> = {
  lives: 3,
  crossingsToWin: 3,
  difficulty: 'normal',
}

export interface ConfigResolution {
  config: GameConfig
  invalidFields: (keyof GameConfig)[]
  usedFallback: boolean
}

const DIFFICULTIES: readonly Difficulty[] = ['easy', 'normal', 'hard']

export function resolveGameConfig(params: URLSearchParams): ConfigResolution {
  const invalidFields: (keyof GameConfig)[] = []
  const lives = readInteger(params, 'lives', 1, 5, invalidFields)
  const crossingsToWin = readInteger(params, 'crossingsToWin', 1, 10, invalidFields)
  const difficulty = readDifficulty(params, invalidFields)

  if (invalidFields.length > 0) {
    return {
      config: { ...DEFAULT_CONFIG },
      invalidFields,
      usedFallback: true,
    }
  }

  return {
    config: {
      lives: lives ?? DEFAULT_CONFIG.lives,
      crossingsToWin: crossingsToWin ?? DEFAULT_CONFIG.crossingsToWin,
      difficulty: difficulty ?? DEFAULT_CONFIG.difficulty,
    },
    invalidFields,
    usedFallback: false,
  }
}

function readInteger(
  params: URLSearchParams,
  field: 'lives' | 'crossingsToWin',
  minimum: number,
  maximum: number,
  invalidFields: (keyof GameConfig)[],
): number | undefined {
  if (!params.has(field)) {
    return undefined
  }

  const value = Number(params.get(field))
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    invalidFields.push(field)
    return undefined
  }

  return value
}

function readDifficulty(
  params: URLSearchParams,
  invalidFields: (keyof GameConfig)[],
): Difficulty | undefined {
  if (!params.has('difficulty')) {
    return undefined
  }

  const value = params.get('difficulty')
  if (!DIFFICULTIES.includes(value as Difficulty)) {
    invalidFields.push('difficulty')
    return undefined
  }

  return value as Difficulty
}
