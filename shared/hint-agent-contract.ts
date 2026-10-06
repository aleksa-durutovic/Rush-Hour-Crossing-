import type { Difficulty, PlayerAction } from '../src/game/state'

export const HINT_REQUEST_MAX_BYTES = 2_048
export const HINT_RESPONSE_MAX_BYTES = 65_536
export const HINT_ROUTE_ACTION_LIMIT = 512
export const HINT_EXPLANATION_MAX_CHARACTERS = 160
export const HINT_TICK_MAX = Number.MAX_SAFE_INTEGER - HINT_ROUTE_ACTION_LIMIT

export type HintSnapshot = {
  status: 'active'
  difficulty: Difficulty
  tick: number
  x: number
  y: number
  lives: number
  crossings: number
  crossingsToWin: number
}

export type HintAction = PlayerAction
export type HintOutcome = 'verified' | 'no_safe_path' | 'search_limit'

export type HintRouteStep = {
  action: HintAction
  entered: { x: number; y: number }
  tick: number
  x: number
  y: number
  lives: number
  crossings: number
  status: 'active' | 'won'
}

export type HintSolverResult =
  | { outcome: 'verified'; steps: readonly HintRouteStep[] }
  | { outcome: 'no_safe_path' | 'search_limit'; steps: readonly [] }

export type HintResponse = {
  outcome: HintOutcome
  origin: HintSnapshot
  explanation: string
  steps: readonly HintRouteStep[]
}

export type HintApiErrorCode =
  | 'FORBIDDEN_HOST'
  | 'INVALID_REQUEST'
  | 'REQUEST_TOO_LARGE'
  | 'UNSUPPORTED_MEDIA_TYPE'
  | 'METHOD_NOT_ALLOWED'
  | 'NOT_FOUND'
  | 'HINT_UNAVAILABLE'
  | 'INTERNAL_ERROR'

export type HintApiError = { error: HintApiErrorCode }

const ACTIONS: readonly HintAction[] = ['up', 'down', 'left', 'right', 'wait']
const DIFFICULTIES: readonly Difficulty[] = ['easy', 'normal', 'hard']
const API_ERRORS: readonly HintApiErrorCode[] = [
  'FORBIDDEN_HOST',
  'INVALID_REQUEST',
  'REQUEST_TOO_LARGE',
  'UNSUPPORTED_MEDIA_TYPE',
  'METHOD_NOT_ALLOWED',
  'NOT_FOUND',
  'HINT_UNAVAILABLE',
  'INTERNAL_ERROR',
]

export function isHintSnapshot(value: unknown): value is HintSnapshot {
  if (!isRecordWithExactKeys(value, [
    'status',
    'difficulty',
    'tick',
    'x',
    'y',
    'lives',
    'crossings',
    'crossingsToWin',
  ])) {
    return false
  }

  return (
    value.status === 'active' &&
    isOneOf(value.difficulty, DIFFICULTIES) &&
    isIntegerBetween(value.tick, 0, HINT_TICK_MAX) &&
    isIntegerBetween(value.x, 0, 8) &&
    isIntegerBetween(value.y, 1, 6) &&
    isIntegerBetween(value.lives, 1, 5) &&
    isIntegerBetween(value.crossingsToWin, 1, 10) &&
    isIntegerBetween(value.crossings, 0, value.crossingsToWin - 1)
  )
}

/** The raw provider proposal is validated before any local tool is invoked. */
export function isHintToolProposal(value: unknown): value is { name: 'find_safe_path'; args: Record<string, never> } {
  return (
    isRecordWithExactKeys(value, ['name', 'args']) &&
    value.name === 'find_safe_path' &&
    isRecordWithExactKeys(value.args, [])
  )
}

export function isHintSolverResult(value: unknown): value is HintSolverResult {
  if (!isRecordWithExactKeys(value, ['outcome', 'steps']) || !Array.isArray(value.steps)) return false

  if (value.outcome === 'verified') {
    return value.steps.length >= 1 && value.steps.length <= HINT_ROUTE_ACTION_LIMIT && value.steps.every(isHintRouteStep)
  }
  if (value.outcome === 'no_safe_path' || value.outcome === 'search_limit') {
    return value.steps.length === 0
  }
  return false
}

export function isHintResponse(value: unknown, expectedOrigin?: HintSnapshot): value is HintResponse {
  if (!isRecordWithExactKeys(value, ['outcome', 'origin', 'explanation', 'steps'])) return false
  if (!isHintSnapshot(value.origin) || !isHintSolverResult({ outcome: value.outcome, steps: value.steps })) return false
  if (expectedOrigin && !areHintSnapshotsEqual(value.origin, expectedOrigin)) return false

  if (value.outcome === 'verified') {
    if (
      typeof value.explanation !== 'string' ||
      value.explanation.length < 1 ||
      value.explanation.length > HINT_EXPLANATION_MAX_CHARACTERS ||
      /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u.test(value.explanation)
    ) {
      return false
    }

    const steps = value.steps as unknown[]
    const finalStep = steps.at(-1)
    if (
      !isHintRouteStep(finalStep) ||
      finalStep.entered.y !== 0 ||
      finalStep.crossings !== value.origin.crossings + 1 ||
      (finalStep.status === 'won') !== (finalStep.crossings >= value.origin.crossingsToWin)
    ) {
      return false
    }
    const finalStatus = finalStep.crossings >= value.origin.crossingsToWin ? 'won' : 'active'
    if (finalStep.status !== finalStatus) return false
    if (steps.slice(0, -1).some((step) => !isHintRouteStep(step) || step.status !== 'active')) return false

    let previousCrossings = value.origin.crossings
    for (const [index, step] of steps.entries()) {
      if (!isHintRouteStep(step)) return false
      if (step.tick !== value.origin.tick + index + 1 || step.lives !== value.origin.lives) return false
      if (step.crossings < previousCrossings || step.crossings > value.origin.crossingsToWin) return false
      if (step.crossings - previousCrossings > 1) return false
      const isFinal = index === steps.length - 1
      if (isFinal && step.entered.y !== 0) return false
      if (!isFinal && (step.crossings !== value.origin.crossings || step.entered.y === 0)) return false
      previousCrossings = step.crossings
    }
    return true
  }

  return value.explanation === '' && (value.steps as unknown[]).length === 0
}

export function isHintApiError(value: unknown): value is HintApiError {
  return (
    isRecordWithExactKeys(value, ['error']) &&
    isOneOf(value.error, API_ERRORS)
  )
}

export function areHintSnapshotsEqual(left: HintSnapshot, right: HintSnapshot): boolean {
  return (
    left.status === right.status &&
    left.difficulty === right.difficulty &&
    left.tick === right.tick &&
    left.x === right.x &&
    left.y === right.y &&
    left.lives === right.lives &&
    left.crossings === right.crossings &&
    left.crossingsToWin === right.crossingsToWin
  )
}

function isHintRouteStep(value: unknown): value is HintRouteStep {
  return (
    isRecordWithExactKeys(value, ['action', 'entered', 'tick', 'x', 'y', 'lives', 'crossings', 'status']) &&
    isOneOf(value.action, ACTIONS) &&
    isPosition(value.entered, 0, 8, 0, 6) &&
    isIntegerBetween(value.tick, 1, Number.MAX_SAFE_INTEGER) &&
    isIntegerBetween(value.x, 0, 8) &&
    isIntegerBetween(value.y, 1, 6) &&
    isIntegerBetween(value.lives, 1, 5) &&
    isIntegerBetween(value.crossings, 0, 10) &&
    (value.status === 'active' || value.status === 'won')
  )
}

function isPosition(value: unknown, minX: number, maxX: number, minY: number, maxY: number): boolean {
  return (
    isRecordWithExactKeys(value, ['x', 'y']) &&
    isIntegerBetween(value.x, minX, maxX) &&
    isIntegerBetween(value.y, minY, maxY)
  )
}

function isRecordWithExactKeys(value: unknown, expectedKeys: readonly string[]): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const keys = Object.keys(value)
  return keys.length === expectedKeys.length && expectedKeys.every((key) => Object.hasOwn(value, key))
}

function isIntegerBetween(value: unknown, minimum: number, maximum: number): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= minimum && value <= maximum
}

function isOneOf<T extends string>(value: unknown, values: readonly T[]): value is T {
  return typeof value === 'string' && values.includes(value as T)
}
