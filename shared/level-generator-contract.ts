import { z } from 'zod'

const integer = (minimum: number, maximum: number) => z.number().int().min(minimum).max(maximum)
const identifier = z.string().min(1).max(64)

export const generationRequestSchema = z
  .object({
    targetDifficulty: integer(1, 5),
    lives: integer(1, 5),
    crossingsToWin: integer(1, 10),
  })
  .strict()

export const laneDefinitionSchema = z
  .object({
    row: integer(1, 5),
    direction: z.enum(['left', 'right']),
    moveEveryTicks: integer(1, 3),
    vehicleLength: integer(1, 2),
    vehicleStarts: z.array(integer(0, 8)).min(1).max(4),
  })
  .strict()
  .superRefine((lane, context) => {
    if (new Set(lane.vehicleStarts).size !== lane.vehicleStarts.length) {
      context.addIssue({ code: 'custom', path: ['vehicleStarts'], message: 'Vehicle starts must be unique.' })
    }

    const occupied = new Set<number>()
    for (const start of lane.vehicleStarts) {
      for (let offset = 0; offset < lane.vehicleLength; offset += 1) {
        const column = (start + offset) % 9
        if (occupied.has(column)) {
          context.addIssue({ code: 'custom', path: ['vehicleStarts'], message: 'Vehicles may not overlap.' })
          return
        }
        occupied.add(column)
      }
    }
  })

export const laneSetSchema = z
  .array(laneDefinitionSchema)
  .length(5)
  .superRefine((lanes, context) => {
    const rows = new Set(lanes.map((lane) => lane.row))
    if (rows.size !== 5 || [1, 2, 3, 4, 5].some((row) => !rows.has(row))) {
      context.addIssue({ code: 'custom', message: 'Exactly one lane for rows 1 through 5 is required.' })
    }
  })

export const solveLevelArgumentsSchema = z.object({ lanes: laneSetSchema }).strict()

const toolRequestSchema = z
  .object({
    kind: z.literal('tool_request'),
    name: z.string().min(1).max(40),
    arguments: z.unknown(),
  })
  .strict()
  .refine((value) => Object.hasOwn(value, 'arguments'), { message: 'Tool arguments are required.' })

const finalDecisionSchema = z
  .object({
    kind: z.literal('final'),
    candidateId: identifier,
    evaluationId: identifier,
    summary: z.string().min(1).max(160),
  })
  .strict()

const refusalDecisionSchema = z
  .object({
    kind: z.literal('refusal'),
    reason: z.enum(['cannot_satisfy_goal', 'insufficient_evidence']),
  })
  .strict()

export const modelDecisionSchema = z.discriminatedUnion('kind', [
  toolRequestSchema,
  finalDecisionSchema,
  refusalDecisionSchema,
])

export const budgetReasonSchema = z.enum(['state_limit', 'action_limit', 'timeout', 'deadline', 'cancelled'])

const solvedMetricsSchema = z
  .object({
    firstCrossingMinMoves: integer(6, 32_768),
    minMoves: integer(1, 32_768),
    tightestGap: integer(0, 8),
    averageGap: z.number().finite().min(0).max(8),
    trafficDensity: z.number().finite().gt(0).lt(1),
    trafficPeriod: integer(1, 54),
    exploredStates: integer(0, 35_000),
    actionEvaluations: integer(0, 175_000),
  })
  .strict()
  .superRefine((metrics, context) => {
    if (metrics.minMoves < metrics.firstCrossingMinMoves) {
      context.addIssue({ code: 'custom', path: ['minMoves'], message: 'Whole-target minimum cannot precede a first crossing.' })
    }
  })

export const compactEvaluationSchema = z.discriminatedUnion('outcome', [
  z
    .object({
      candidateId: identifier,
      evaluationId: identifier,
      outcome: z.literal('solved'),
      ...solvedMetricsSchema.shape,
      computedDifficulty: integer(1, 5),
      budgetReason: z.null(),
    })
    .strict()
    .superRefine((result, context) => {
      if (ratingFor(result.firstCrossingMinMoves) !== result.computedDifficulty) {
        context.addIssue({ code: 'custom', path: ['computedDifficulty'], message: 'Rating mismatch.' })
      }
      if (result.minMoves < result.firstCrossingMinMoves) {
        context.addIssue({ code: 'custom', path: ['minMoves'], message: 'Invalid whole-target minimum.' })
      }
    }),
  z
    .object({
      candidateId: identifier,
      evaluationId: identifier,
      outcome: z.literal('unsolvable'),
      firstCrossingMinMoves: integer(6, 32_768).nullable(),
      minMoves: z.null(),
      computedDifficulty: z.null(),
      tightestGap: integer(0, 8),
      averageGap: z.number().finite().min(0).max(8),
      trafficDensity: z.number().finite().gt(0).lt(1),
      trafficPeriod: integer(1, 54),
      exploredStates: integer(0, 35_000),
      actionEvaluations: integer(0, 175_000),
      budgetReason: z.null(),
    })
    .strict(),
  z
    .object({
      candidateId: identifier,
      evaluationId: identifier,
      outcome: z.literal('budget_exceeded'),
      firstCrossingMinMoves: integer(6, 32_768).nullable(),
      minMoves: z.null(),
      computedDifficulty: z.null(),
      tightestGap: integer(0, 8),
      averageGap: z.number().finite().min(0).max(8),
      trafficDensity: z.number().finite().gt(0).lt(1),
      trafficPeriod: integer(1, 54),
      exploredStates: integer(0, 35_000),
      actionEvaluations: integer(0, 175_000),
      budgetReason: budgetReasonSchema,
    })
    .strict(),
])

export const runCountersSchema = z
  .object({
    stepCount: integer(0, 5),
    providerAttemptCount: integer(0, 6),
    retryCount: integer(0, 5),
    toolCallCount: integer(0, 8),
    modelToolCallCount: integer(0, 7),
    revisionCount: integer(0, 2),
  })
  .strict()

export const generationStopReasonSchema = z.enum([
  'goal_completed',
  'target_not_met',
  'step_limit',
  'provider_attempt_limit',
  'tool_call_limit',
  'revision_limit',
  'repeated_action',
  'deadline',
  'provider_refusal',
  'provider_failed',
  'tool_failed',
  'tool_timeout',
  'invalid_model_proposal',
  'unknown_tool',
  'invalid_tool_arguments',
  'invalid_tool_result',
  'invalid_final_selection',
  'final_verification_failed',
  'cancelled',
])

const responseBase = {
  runId: identifier,
  stopReason: generationStopReasonSchema.nullable(),
  counters: runCountersSchema,
  elapsedMs: integer(0, 45_000),
} as const

const previewResponseSchema = z
  .object({
    ...responseBase,
    status: z.enum(['completed', 'stopped']),
    completed: z.boolean(),
    kind: z.literal('preview'),
    source: z.enum(['generated', 'last_verified', 'template']),
    settings: z.object({ lives: integer(1, 5), crossingsToWin: integer(1, 10) }).strict(),
    lanes: laneSetSchema,
    requestedDifficulty: integer(1, 5),
    computedDifficulty: integer(1, 5),
    verified: z.literal(true),
    measurements: solvedMetricsSchema,
    summary: z.string().min(1).max(160),
  })
  .strict()
  .superRefine((preview, context) => {
    const successful =
      preview.status === 'completed' &&
      preview.stopReason === 'goal_completed' &&
      preview.source === 'generated' &&
      preview.requestedDifficulty === preview.computedDifficulty &&
      ratingFor(preview.measurements.firstCrossingMinMoves) === preview.computedDifficulty
    if (preview.completed !== successful) {
      context.addIssue({ code: 'custom', path: ['completed'], message: 'Completion must match exact verified goal success.' })
    }
    if (preview.status === 'stopped' && (preview.stopReason === null || preview.stopReason === 'goal_completed')) {
      context.addIssue({ code: 'custom', path: ['stopReason'], message: 'Stopped previews require an operational stop reason.' })
    }
    if (ratingFor(preview.measurements.firstCrossingMinMoves) !== preview.computedDifficulty) {
      context.addIssue({ code: 'custom', path: ['computedDifficulty'], message: 'Preview rating must match verified measurements.' })
    }
  })

const unavailableResponseSchema = z
  .object({
    ...responseBase,
    status: z.enum(['stopped', 'failed']),
    completed: z.literal(false),
    kind: z.literal('unavailable'),
    message: z.string().min(1).max(200),
  })
  .strict()
  .superRefine((response, context) => {
    if (response.stopReason === null || response.stopReason === 'goal_completed' || response.stopReason === 'target_not_met') {
      context.addIssue({ code: 'custom', path: ['stopReason'], message: 'Unavailable response needs a non-success stop reason.' })
    }
  })

export const generationResponseSchema = z.discriminatedUnion('kind', [previewResponseSchema, unavailableResponseSchema])

export type GenerationRequest = z.infer<typeof generationRequestSchema>
export type LaneDefinition = z.infer<typeof laneDefinitionSchema>
export type SolveLevelArguments = z.infer<typeof solveLevelArgumentsSchema>
export type ModelDecision = z.infer<typeof modelDecisionSchema>
export type CompactEvaluation = z.infer<typeof compactEvaluationSchema>
export type RunCounters = z.infer<typeof runCountersSchema>
export type GenerationResponse = z.infer<typeof generationResponseSchema>

function ratingFor(firstCrossingMinMoves: number): number {
  if (firstCrossingMinMoves <= 8) return 1
  if (firstCrossingMinMoves <= 10) return 2
  if (firstCrossingMinMoves <= 12) return 3
  if (firstCrossingMinMoves <= 14) return 4
  return 5
}
