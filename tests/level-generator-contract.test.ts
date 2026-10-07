import { describe, expect, it } from 'vitest'
import {
  compactEvaluationSchema,
  generationRequestSchema,
  generationResponseSchema,
  modelDecisionSchema,
} from '../shared/level-generator-contract'

const lanes = [
  { row: 1, direction: 'right', moveEveryTicks: 1, vehicleLength: 1, vehicleStarts: [0] },
  { row: 2, direction: 'left', moveEveryTicks: 2, vehicleLength: 1, vehicleStarts: [1] },
  { row: 3, direction: 'right', moveEveryTicks: 3, vehicleLength: 1, vehicleStarts: [2] },
  { row: 4, direction: 'left', moveEveryTicks: 1, vehicleLength: 1, vehicleStarts: [3] },
  { row: 5, direction: 'right', moveEveryTicks: 2, vehicleLength: 1, vehicleStarts: [4] },
] as const

const metrics = {
  firstCrossingMinMoves: 11,
  minMoves: 31,
  tightestGap: 7,
  averageGap: 8,
  trafficDensity: 1 / 9,
  trafficPeriod: 54,
  exploredStates: 120,
  actionEvaluations: 600,
}

const supportingMetrics = {
  tightestGap: 7,
  averageGap: 8,
  trafficDensity: 1 / 9,
  trafficPeriod: 54,
  exploredStates: 120,
  actionEvaluations: 600,
}

const counters = {
  stepCount: 2,
  providerAttemptCount: 2,
  retryCount: 0,
  toolCallCount: 2,
  modelToolCallCount: 1,
  revisionCount: 0,
}

const preview = {
  runId: 'run-1',
  status: 'completed',
  stopReason: 'goal_completed',
  completed: true,
  counters,
  elapsedMs: 100,
  kind: 'preview',
  source: 'generated',
  settings: { lives: 3, crossingsToWin: 3 },
  lanes,
  requestedDifficulty: 3,
  computedDifficulty: 3,
  verified: true,
  measurements: metrics,
  summary: 'Verified level ready to play.',
}

describe('level generator external contracts', () => {
  it('accepts only the exact integer request and its configured ranges', () => {
    expect(generationRequestSchema.parse({ targetDifficulty: 3, lives: 1, crossingsToWin: 10 })).toEqual({
      targetDifficulty: 3,
      lives: 1,
      crossingsToWin: 10,
    })

    for (const value of [0, 6, 1.5, '3', Number.NaN]) {
      expect(generationRequestSchema.safeParse({ targetDifficulty: value, lives: 3, crossingsToWin: 3 }).success).toBe(false)
    }
    for (const [field, value] of [['lives', 0], ['lives', 6], ['crossingsToWin', 0], ['crossingsToWin', 11]] as const) {
      expect(generationRequestSchema.safeParse({ targetDifficulty: 3, lives: 3, crossingsToWin: 3, [field]: value }).success).toBe(false)
    }
  })

  it('rejects unknown request keys and string coercion', () => {
    expect(generationRequestSchema.safeParse({ targetDifficulty: 3, lives: 3, crossingsToWin: 3, lanes }).success).toBe(false)
    expect(generationRequestSchema.safeParse({ targetDifficulty: '3', lives: 3, crossingsToWin: 3 }).success).toBe(false)
  })

  it('accepts each exact model decision variant and rejects extra fields', () => {
    expect(modelDecisionSchema.safeParse({ kind: 'tool_request', name: 'solveLevel', arguments: { lanes } }).success).toBe(true)
    expect(modelDecisionSchema.safeParse({ kind: 'final', candidateId: 'c1', evaluationId: 'e1', summary: 'Select this level.' }).success).toBe(true)
    expect(modelDecisionSchema.safeParse({ kind: 'refusal', reason: 'insufficient_evidence' }).success).toBe(true)
    expect(modelDecisionSchema.safeParse({ kind: 'final', candidateId: 'c1', evaluationId: 'e1', summary: 'ok', computedDifficulty: 3 }).success).toBe(false)
    expect(modelDecisionSchema.safeParse({ kind: 'refusal', reason: 'secret' }).success).toBe(false)
  })

  it('validates compact evidence cross-fields for solved, impossible and incomplete searches', () => {
    const solved = { candidateId: 'c1', evaluationId: 'e1', outcome: 'solved', ...metrics, computedDifficulty: 3, budgetReason: null }
    expect(compactEvaluationSchema.safeParse(solved).success).toBe(true)
    expect(compactEvaluationSchema.safeParse({ ...solved, minMoves: null }).success).toBe(false)
    expect(compactEvaluationSchema.safeParse({ ...solved, computedDifficulty: 5 }).success).toBe(false)
    expect(compactEvaluationSchema.safeParse({ ...solved, candidateId: 'c1', debugPath: ['up'] }).success).toBe(false)

    expect(compactEvaluationSchema.safeParse({
      candidateId: 'c2', evaluationId: 'e2', outcome: 'unsolvable',
      ...supportingMetrics,
      firstCrossingMinMoves: null, minMoves: null, computedDifficulty: null, budgetReason: null,
    }).success).toBe(true)
    expect(compactEvaluationSchema.safeParse({
      candidateId: 'c3', evaluationId: 'e3', outcome: 'budget_exceeded',
      ...supportingMetrics,
      firstCrossingMinMoves: null, minMoves: null, computedDifficulty: null, budgetReason: 'state_limit',
    }).success).toBe(true)
    expect(compactEvaluationSchema.safeParse({
      candidateId: 'c3', evaluationId: 'e3', outcome: 'budget_exceeded',
      firstCrossingMinMoves: 11, minMoves: 31, computedDifficulty: 3,
      ...supportingMetrics, budgetReason: null,
    }).success).toBe(false)
  })

  it('requires exact preview identity, verification, target match and metric consistency', () => {
    expect(generationResponseSchema.safeParse(preview).success).toBe(true)
    expect(generationResponseSchema.safeParse({ ...preview, computedDifficulty: 4 }).success).toBe(false)
    expect(generationResponseSchema.safeParse({ ...preview, verified: false }).success).toBe(false)
    expect(generationResponseSchema.safeParse({ ...preview, extra: 'unknown' }).success).toBe(false)
    expect(generationResponseSchema.safeParse({
      ...preview,
      status: 'stopped',
      stopReason: 'target_not_met',
      completed: false,
      requestedDifficulty: 4,
    }).success).toBe(true)
  })

  it('keeps unavailable responses non-playable and excludes traffic/proof fields', () => {
    const unavailable = {
      runId: 'run-2',
      status: 'failed',
      stopReason: 'unknown_tool',
      completed: false,
      counters: { ...counters, stepCount: 1, providerAttemptCount: 1, toolCallCount: 0, modelToolCallCount: 0 },
      elapsedMs: 10,
      kind: 'unavailable',
      message: 'No verified level is available.',
    }
    expect(generationResponseSchema.safeParse(unavailable).success).toBe(true)
    expect(generationResponseSchema.safeParse({ ...unavailable, lanes }).success).toBe(false)
    expect(generationResponseSchema.safeParse({ ...unavailable, completed: true }).success).toBe(false)
  })
})
