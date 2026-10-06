import { describe, expect, it } from 'vitest'
import {
  HINT_REQUEST_MAX_BYTES,
  HINT_RESPONSE_MAX_BYTES,
  HINT_ROUTE_ACTION_LIMIT,
  isHintApiError,
  isHintResponse,
  isHintSnapshot,
  isHintToolProposal,
  type HintSnapshot,
} from '../../shared/hint-agent-contract'
import { nearGoalHintResponse, nearGoalSnapshot } from './fixtures'

describe('hint contract', () => {
  it('accepts the exact active snapshot shape', () => {
    expect(isHintSnapshot(nearGoalSnapshot)).toBe(true)
  })

  it.each([
    ['unknown key', { ...nearGoalSnapshot, score: 100 }],
    ['non-active status', { ...nearGoalSnapshot, status: 'won' }],
    ['unknown difficulty', { ...nearGoalSnapshot, difficulty: 'impossible' }],
    ['negative tick', { ...nearGoalSnapshot, tick: -1 }],
    ['unsafe tick headroom', { ...nearGoalSnapshot, tick: Number.MAX_SAFE_INTEGER }],
    ['fractional x', { ...nearGoalSnapshot, x: 4.5 }],
    ['column outside grid', { ...nearGoalSnapshot, x: 9 }],
    ['goal row cannot persist', { ...nearGoalSnapshot, y: 0 }],
    ['row outside grid', { ...nearGoalSnapshot, y: 7 }],
    ['zero lives', { ...nearGoalSnapshot, lives: 0 }],
    ['too many lives', { ...nearGoalSnapshot, lives: 6 }],
    ['crossings already reached target', { ...nearGoalSnapshot, crossings: 1 }],
    ['target below range', { ...nearGoalSnapshot, crossingsToWin: 0 }],
    ['target above range', { ...nearGoalSnapshot, crossingsToWin: 11 }],
  ])('rejects %s', (_label, value) => {
    expect(isHintSnapshot(value)).toBe(false)
  })

  it('accepts only the single allowlisted tool with exact empty arguments', () => {
    expect(isHintToolProposal({ name: 'find_safe_path', args: {} })).toBe(true)
    expect(isHintToolProposal({ name: 'find_safe_path', args: {}, id: 'provider-id' })).toBe(false)
    expect(isHintToolProposal({ name: 'other_tool', args: {} })).toBe(false)
    expect(isHintToolProposal({ name: 'find_safe_path', args: { maxNodes: 100 } })).toBe(false)
    expect(isHintToolProposal({ name: 'find_safe_path', args: null })).toBe(false)
  })

  it('accepts a bounded solver-backed response anchored to the submitted snapshot', () => {
    const response = nearGoalHintResponse()

    expect(isHintResponse(response, nearGoalSnapshot)).toBe(true)
    expect(isHintResponse({ ...response, origin: { ...response.origin, tick: 1 } }, nearGoalSnapshot)).toBe(false)
    expect(isHintResponse({ ...response, providerPayload: 'hidden' }, nearGoalSnapshot)).toBe(false)
    expect(isHintResponse({ ...response, explanation: 'x'.repeat(161) }, nearGoalSnapshot)).toBe(false)
    expect(isHintResponse({ ...response, steps: [...response.steps, ...response.steps] }, nearGoalSnapshot)).toBe(false)
    const terminalStep = response.steps.at(-1)!
    expect(isHintResponse({
      ...response,
      steps: [...response.steps.slice(0, -1), { ...terminalStep, entered: { ...terminalStep.entered, y: 1 } }],
    }, nearGoalSnapshot)).toBe(false)
  })

  it('accepts a verified route that exits through any column on the goal row', () => {
    const origin = { ...nearGoalSnapshot, x: 0 }
    const response = nearGoalHintResponse(origin)
    const steps = response.steps.map((step) => ({ ...step, entered: { x: 0, y: 0 } }))

    expect(isHintResponse({ ...response, steps }, origin)).toBe(true)
  })

  it('accepts a next-crossing route when the game remains active', () => {
    const origin = { ...nearGoalSnapshot, crossingsToWin: 3 }
    const response = nearGoalHintResponse(origin)
    const steps = response.steps.map((step) => ({
      ...step,
      crossings: origin.crossings + 1,
      status: 'active' as const,
    }))

    expect(isHintResponse({ ...response, steps }, origin)).toBe(true)
  })

  it('accepts empty fixed outcomes and rejects route data for them', () => {
    const noRoute = {
      outcome: 'no_safe_path',
      origin: nearGoalSnapshot,
      explanation: '',
      steps: [],
    }

    expect(isHintResponse(noRoute, nearGoalSnapshot)).toBe(true)
    expect(isHintResponse({ ...noRoute, steps: nearGoalHintResponse().steps }, nearGoalSnapshot)).toBe(false)
    expect(isHintResponse({ ...noRoute, outcome: 'unknown' }, nearGoalSnapshot)).toBe(false)
  })

  it('validates a safe fixed API error DTO', () => {
    expect(isHintApiError({ error: 'HINT_UNAVAILABLE' })).toBe(true)
    expect(isHintApiError({ error: 'HINT_UNAVAILABLE', details: 'raw provider response' })).toBe(false)
  })

  it('exposes the agreed byte and route caps', () => {
    const snapshot: HintSnapshot = nearGoalSnapshot
    expect(snapshot.status).toBe('active')
    expect(HINT_REQUEST_MAX_BYTES).toBe(2048)
    expect(HINT_RESPONSE_MAX_BYTES).toBe(65536)
    expect(HINT_ROUTE_ACTION_LIMIT).toBe(512)
  })
})
