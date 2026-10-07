export type AdviceFocus = 'survival' | 'goal_progress' | 'general'
export type RunOutcome = 'won' | 'lost'
export type AdviceDifficulty = 'easy' | 'normal' | 'hard' | 'generated'

export interface CompletedRunSummary {
  outcome: RunOutcome
  difficulty: AdviceDifficulty
  ticks: number
  crossings: number
  targetCrossings: number
  startingLives: number
  remainingLives: number
  score: number
}

export interface ProviderTip {
  nextTip: string
}

export interface AdviceResponse {
  focus: AdviceFocus
  evidence: string
  nextTip: string
}

const SUMMARY_KEYS = [
  'outcome',
  'difficulty',
  'ticks',
  'crossings',
  'targetCrossings',
  'startingLives',
  'remainingLives',
  'score',
] as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value)
  return actual.length === keys.length && keys.every((key) => Object.hasOwn(value, key))
}

function isSafeIntegerInRange(value: unknown, minimum: number, maximum = Number.MAX_SAFE_INTEGER): value is number {
  return Number.isSafeInteger(value) && typeof value === 'number' && value >= minimum && value <= maximum
}

export function isCompletedRunSummary(value: unknown): value is CompletedRunSummary {
  if (!isRecord(value) || !hasExactKeys(value, SUMMARY_KEYS)) {
    return false
  }

  if (value.outcome !== 'won' && value.outcome !== 'lost') return false
  if (
    value.difficulty !== 'easy' && value.difficulty !== 'normal' &&
    value.difficulty !== 'hard' && value.difficulty !== 'generated'
  ) return false
  if (!isSafeIntegerInRange(value.ticks, 1)) return false
  if (!isSafeIntegerInRange(value.targetCrossings, 1, 10)) return false
  if (!isSafeIntegerInRange(value.crossings, 0, value.targetCrossings)) return false
  if (!isSafeIntegerInRange(value.startingLives, 1, 5)) return false
  if (!isSafeIntegerInRange(value.remainingLives, 0, value.startingLives)) return false
  if (!isSafeIntegerInRange(value.score, 0) || value.score !== value.crossings * 100) return false

  if (value.outcome === 'won') {
    return value.crossings === value.targetCrossings && value.remainingLives > 0
  }
  return value.remainingLives === 0 && value.crossings < value.targetCrossings
}

export function isProviderTip(value: unknown): value is ProviderTip {
  if (!isRecord(value) || !hasExactKeys(value, ['nextTip'])) return false
  return typeof value.nextTip === 'string' && value.nextTip.trim().length > 0 && value.nextTip.length <= 160
}

export function isAdviceResponse(value: unknown): value is AdviceResponse {
  if (!isRecord(value) || !hasExactKeys(value, ['focus', 'evidence', 'nextTip'])) return false
  const validFocus =
    value.focus === 'survival' || value.focus === 'goal_progress' || value.focus === 'general'
  return (
    validFocus &&
    typeof value.evidence === 'string' &&
    value.evidence.trim().length > 0 &&
    value.evidence.length <= 120 &&
    typeof value.nextTip === 'string' &&
    value.nextTip.trim().length > 0 &&
    value.nextTip.length <= 160
  )
}

export function isAdviceError(value: unknown): value is { error: string } {
  if (!isRecord(value) || !hasExactKeys(value, ['error'])) return false
  return (
    value.error === 'INVALID_REQUEST' ||
    value.error === 'METHOD_NOT_ALLOWED' ||
    value.error === 'REQUEST_TOO_LARGE' ||
    value.error === 'UNSUPPORTED_MEDIA_TYPE' ||
    value.error === 'ADVICE_UNAVAILABLE' ||
    value.error === 'INTERNAL_ERROR'
  )
}
