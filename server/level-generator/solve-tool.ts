import { performance } from 'node:perf_hooks'
import {
  compactEvaluationSchema,
  type CompactEvaluation,
} from '../../shared/level-generator-contract'
import {
  createLevelSearch,
  getTrafficPeriod,
  SOLVE_LEVEL_LIMITS,
  type SearchSettings,
  type SolveLevelResult,
} from '../../src/game/solve-level'
import type { GameConfig, LaneDefinition, PlayerAction } from '../../src/game/state'
import { createInitialState } from '../../src/game/state'
import { applyAction } from '../../src/game/turn'
import { ratingForFirstCrossingMoves, normalizeGeneratedLanes } from '../../src/config/generated-level'
import { measureTraffic } from '../../src/game/level-metrics'

export const SOLVE_LEVEL_TIMEOUT_MS = 2_000
export const MAX_COMPACT_EVALUATION_BYTES = 4_096

export interface SolveLevelToolInput {
  candidateId: string
  evaluationId: string
  lanes: unknown
  settings: SearchSettings
  runDeadline: number
  signal: AbortSignal
}

export interface SolveLevelProof {
  firstCrossingActions: PlayerAction[] | null
  winningActions: PlayerAction[] | null
}

export interface SolveLevelToolOutput {
  evidence: CompactEvaluation
  proof: SolveLevelProof
}

export interface SolveLevelToolOptions {
  now?: () => number
  yieldToEventLoop?: () => Promise<void>
  searchFactory?: typeof createLevelSearch
}

export interface SolveLevelTool {
  execute(input: SolveLevelToolInput): Promise<SolveLevelToolOutput>
  readonly searchFactory: typeof createLevelSearch
}

export class InvalidSolveLevelArgumentsError extends Error {
  constructor() {
    super('solveLevel arguments are invalid.')
    this.name = 'InvalidSolveLevelArgumentsError'
  }
}

export class InvalidSolveLevelResultError extends Error {
  constructor() {
    super('solveLevel returned invalid verification evidence.')
    this.name = 'InvalidSolveLevelResultError'
  }
}

export function createSolveLevelTool(options: SolveLevelToolOptions = {}): SolveLevelTool {
  const now = options.now ?? (() => performance.now())
  const yieldToEventLoop = options.yieldToEventLoop ?? yieldImmediate
  const searchFactory = options.searchFactory ?? createLevelSearch

  return {
    searchFactory,
    async execute(input) {
      const lanes = validateInput(input)
      const startedAt = now()
      const invocationDeadline = Math.min(startedAt + SOLVE_LEVEL_TIMEOUT_MS, input.runDeadline)
      const deadlineReason = (): 'deadline' | 'timeout' | null => {
        const current = now()
        if (current >= input.runDeadline) return 'deadline'
        if (current >= invocationDeadline) return 'timeout'
        return null
      }
      const counts = { exploredStates: 0, actionEvaluations: 0 }
      const metrics = measureTraffic(lanes)
      const period = getTrafficPeriod(lanes)

      const budgetOutput = (budgetReason: 'timeout' | 'deadline' | 'cancelled'): SolveLevelToolOutput =>
        createOutput({
          candidateId: input.candidateId,
          evaluationId: input.evaluationId,
          outcome: 'budget_exceeded',
          firstCrossingMinMoves: null,
          minMoves: null,
          computedDifficulty: null,
          ...metrics,
          trafficPeriod: period,
          ...counts,
          budgetReason,
        }, { firstCrossingActions: null, winningActions: null })

      if (input.signal.aborted) return budgetOutput('cancelled')
      if (deadlineReason() === 'deadline') return budgetOutput('deadline')

      const search = searchFactory(lanes, input.settings)
      while (true) {
        if (input.signal.aborted) return budgetOutput('cancelled')
        const expired = deadlineReason()
        if (expired) return budgetOutput(expired)

        const result = search.advance(SOLVE_LEVEL_LIMITS.maxBatchSize)
        counts.exploredStates = result.exploredStates
        counts.actionEvaluations = result.actionEvaluations
        const expiredAfterBatch = deadlineReason()
        if (input.signal.aborted) return budgetOutput('cancelled')
        if (expiredAfterBatch) return budgetOutput(expiredAfterBatch)
        if (result.status === 'running') {
          await yieldToEventLoop()
          continue
        }

        return outputFromResult(result, input, lanes, metrics, period)
      }
    },
  }
}

function outputFromResult(
  result: SolveLevelResult,
  input: SolveLevelToolInput,
  lanes: readonly LaneDefinition[],
  metrics: ReturnType<typeof measureTraffic>,
  period: number,
): SolveLevelToolOutput {
  if (result.metrics.tightestGap !== metrics.tightestGap ||
      result.metrics.averageGap !== metrics.averageGap ||
      result.metrics.trafficDensity !== metrics.trafficDensity) {
    throw new InvalidSolveLevelResultError()
  }

  if (result.status === 'solved') {
    if (
      result.firstCrossingMinMoves !== result.firstCrossingActions.length ||
      result.minMoves !== result.winningActions.length ||
      !replayProof(lanes, input.settings, result.firstCrossingActions, 1) ||
      !replayProof(lanes, input.settings, result.winningActions, input.settings.crossingsToWin)
    ) {
      throw new InvalidSolveLevelResultError()
    }
    const computedDifficulty = ratingForFirstCrossingMoves(result.firstCrossingMinMoves)
    if (computedDifficulty === null) throw new InvalidSolveLevelResultError()
    return createOutput({
      candidateId: input.candidateId,
      evaluationId: input.evaluationId,
      outcome: 'solved',
      firstCrossingMinMoves: result.firstCrossingMinMoves,
      minMoves: result.minMoves,
      computedDifficulty,
      ...metrics,
      trafficPeriod: period,
      exploredStates: result.exploredStates,
      actionEvaluations: result.actionEvaluations,
      budgetReason: null,
    }, {
      firstCrossingActions: [...result.firstCrossingActions],
      winningActions: [...result.winningActions],
    })
  }

  if (result.status === 'unsolvable') {
    const firstActions = result.firstCrossingActions
    if (firstActions && (
      firstActions.length !== result.firstCrossingMinMoves ||
      !replayProof(lanes, input.settings, firstActions, 1)
    )) throw new InvalidSolveLevelResultError()
    if (!result.explorationComplete || (firstActions === null) !== (result.firstCrossingMinMoves === null)) {
      throw new InvalidSolveLevelResultError()
    }
    return createOutput({
      candidateId: input.candidateId,
      evaluationId: input.evaluationId,
      outcome: 'unsolvable',
      firstCrossingMinMoves: result.firstCrossingMinMoves,
      minMoves: null,
      computedDifficulty: null,
      ...metrics,
      trafficPeriod: period,
      exploredStates: result.exploredStates,
      actionEvaluations: result.actionEvaluations,
      budgetReason: null,
    }, { firstCrossingActions: firstActions ? [...firstActions] : null, winningActions: null })
  }

  return createOutput({
    candidateId: input.candidateId,
    evaluationId: input.evaluationId,
    outcome: 'budget_exceeded',
    firstCrossingMinMoves: null,
    minMoves: null,
    computedDifficulty: null,
    ...metrics,
    trafficPeriod: period,
    exploredStates: result.exploredStates,
    actionEvaluations: result.actionEvaluations,
    budgetReason: result.budgetReason,
  }, { firstCrossingActions: null, winningActions: null })
}

function createOutput(value: unknown, proof: SolveLevelProof): SolveLevelToolOutput {
  const parsed = compactEvaluationSchema.safeParse(value)
  if (!parsed.success || Buffer.byteLength(JSON.stringify(parsed.data), 'utf8') > MAX_COMPACT_EVALUATION_BYTES) {
    throw new InvalidSolveLevelResultError()
  }
  return { evidence: parsed.data, proof }
}

export function replayProof(
  lanes: readonly LaneDefinition[],
  settings: SearchSettings,
  actions: readonly PlayerAction[],
  target: number,
): boolean {
  if (actions.length === 0 || actions.length > SOLVE_LEVEL_LIMITS.maxWitnessActions) return false
  const config: GameConfig = { lives: settings.lives, crossingsToWin: target, difficulty: 'normal' }
  const initial = createInitialState(config)
  let state = initial

  for (const action of actions) {
    if (state.status !== 'active') return false
    if (!['up', 'down', 'left', 'right', 'wait'].includes(action)) return false
    state = applyAction(state, action, lanes)
    if (state.lives !== initial.lives) return false
  }

  return state.status === 'won' &&
    state.crossings === target &&
    state.score === target * 100 &&
    state.lives === initial.lives &&
    state.tick === actions.length
}

function validateInput(input: SolveLevelToolInput): LaneDefinition[] {
  const lanes = normalizeGeneratedLanes(input.lanes)
  const settings = input.settings as unknown
  if (
    !lanes ||
    typeof input.candidateId !== 'string' || input.candidateId.length < 1 || input.candidateId.length > 64 ||
    typeof input.evaluationId !== 'string' || input.evaluationId.length < 1 || input.evaluationId.length > 64 ||
    !isExactSettings(settings) ||
    !Number.isFinite(input.runDeadline) ||
    !(input.signal instanceof AbortSignal)
  ) throw new InvalidSolveLevelArgumentsError()
  return lanes
}

function isExactSettings(value: unknown): value is SearchSettings {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const record = value as Record<string, unknown>
  return Object.keys(record).length === 2 &&
    Object.hasOwn(record, 'lives') && Object.hasOwn(record, 'crossingsToWin') &&
    Number.isSafeInteger(record.lives) && typeof record.lives === 'number' && record.lives >= 1 && record.lives <= 5 &&
    Number.isSafeInteger(record.crossingsToWin) && typeof record.crossingsToWin === 'number' &&
    record.crossingsToWin >= 1 && record.crossingsToWin <= 10
}

function yieldImmediate(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve))
}
