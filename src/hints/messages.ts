import type { HintRouteStep } from '../../shared/hint-agent-contract'
import type { HintNotice } from './lifecycle'

export const HINT_LOADING_MESSAGE = 'Loading hint…'

/** Fixed status copy keeps safe solver outcomes distinct and provider detail private. */
export function getHintMessage(notice: HintNotice, currentTick: number): string {
  if (notice.kind === 'unavailable') return 'Hint is currently unavailable.'
  if (notice.kind === 'stale') return 'The game state changed while the hint was loading. This stale result was discarded.'

  const response = notice.response
  if (response.outcome === 'no_safe_path') {
    return 'Exhaustive search found no safe path for this snapshot.'
  }
  if (response.outcome === 'search_limit') {
    return 'Search limit reached. No route was verified; this does not prove that no safe route exists.'
  }

  const cachedLabel = currentTick !== response.origin.tick
    ? ` Cached hint from original tick ${response.origin.tick}.`
    : ''
  return `Verified safe path to the next crossing. ${response.explanation}${cachedLabel}`
}

export function describeHintRouteStep(step: HintRouteStep, zeroBasedIndex: number): string {
  return `Step ${zeroBasedIndex + 1}: ${step.action}; enters cell (${step.entered.x}, ${step.entered.y}) at tick ${step.tick}.`
}
