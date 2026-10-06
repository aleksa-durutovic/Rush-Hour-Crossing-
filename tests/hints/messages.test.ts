import { describe, expect, it } from 'vitest'
import { describeHintRouteStep, getHintMessage, HINT_LOADING_MESSAGE } from '../../src/hints/messages'
import { nearGoalHintResponse, nearGoalSnapshot } from './fixtures'

describe('Hint status copy', () => {
  it('distinguishes verified, exhaustive no-route, search-limit, stale, and unavailable outcomes', () => {
    const verified = getHintMessage({ kind: 'ready', response: nearGoalHintResponse() }, nearGoalSnapshot.tick)
    const noRoute = getHintMessage({ kind: 'ready', response: {
      outcome: 'no_safe_path', origin: nearGoalSnapshot, explanation: '', steps: [],
    } }, nearGoalSnapshot.tick)
    const searchLimit = getHintMessage({ kind: 'ready', response: {
      outcome: 'search_limit', origin: nearGoalSnapshot, explanation: '', steps: [],
    } }, nearGoalSnapshot.tick)

    expect(verified).toContain('Verified safe path to the next crossing.')
    expect(noRoute).toBe('Exhaustive search found no safe path for this snapshot.')
    expect(searchLimit).toContain('this does not prove that no safe route exists')
    expect(searchLimit).not.toContain('Exhaustive search')
    expect(getHintMessage({ kind: 'stale' }, nearGoalSnapshot.tick)).toContain('stale result was discarded')
    expect(getHintMessage({ kind: 'unavailable' }, nearGoalSnapshot.tick)).toBe('Hint is currently unavailable.')
    expect(HINT_LOADING_MESSAGE).toBe('Loading hint…')
    expect(describeHintRouteStep(nearGoalHintResponse().steps[0]!, 0)).toBe('Step 1: up; enters cell (4, 0) at tick 1.')
  })

  it('labels a cached verified result with its original tick after the game advances', () => {
    expect(getHintMessage({ kind: 'ready', response: nearGoalHintResponse() }, nearGoalSnapshot.tick + 4))
      .toContain('Cached hint from original tick 0.')
  })
})
