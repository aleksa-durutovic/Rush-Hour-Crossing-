import { performance } from 'node:perf_hooks'
import {
  compactEvaluationSchema,
  generationRequestSchema,
  generationResponseSchema,
  modelDecisionSchema,
  solveLevelArgumentsSchema,
  type CompactEvaluation,
  type GenerationRequest,
  type GenerationResponse,
  type RunCounters,
} from '../../shared/level-generator-contract'
import {
  canonicalCandidateKey,
  getGeneratedLevelTemplate,
  normalizeGeneratedLanes,
  type GeneratedDifficulty,
  type GeneratedLevelSettings,
} from '../../src/config/generated-level'
import { LEVEL_GENERATOR_RULES_VERSION } from './policy'
import {
  buildGeneratorDecisionContext,
  LEVEL_GENERATOR_POLICY,
} from './policy'
import { GeneratorModelError, toGeneratorProviderFailure, type LevelGeneratorModel } from './model'
import {
  createFailoverEvidenceRecorder,
  ProviderFailure,
  runEnabledProviderPhase,
  type FailoverEvidenceEvent,
  type ProviderRole,
} from '../ai/failover-policy'
import { ProviderConfigurationError } from '../ai/provider-config'
import { createSolveLevelTool, replayProof, type SolveLevelTool, type SolveLevelProof } from './solve-tool'

export class InvalidGenerationRequestError extends Error {
  readonly code = 'INVALID_GENERATION_REQUEST'

  constructor() {
    super('Generation request is invalid.')
    this.name = 'InvalidGenerationRequestError'
  }
}

export interface LevelGeneratorService {
  generate(value: unknown, signal: AbortSignal): Promise<GenerationResponse>
}

export interface LevelGeneratorServiceOptions {
  model: LevelGeneratorModel
  backupModel?: LevelGeneratorModel
  failoverEnabled?: boolean
  solver?: SolveLevelTool
  now?: () => number
  waitBeforeRetry?: (milliseconds: number, signal: AbortSignal) => Promise<void>
  onEvidence?: (event: FailoverEvidenceEvent) => void
}

interface CandidateRecord {
  candidateId: string
  evaluationId: string
  key: string
  lanes: NonNullable<ReturnType<typeof normalizeGeneratedLanes>>
  settings: GeneratedLevelSettings
  evidence: CompactEvaluation
  proof: SolveLevelProof
}

type RunStatus = 'created' | 'running' | 'completed' | 'stopped' | 'failed'

interface RunState {
  runId: string
  status: RunStatus
  request: GenerationRequest
  startTime: number
  deadline: number
  decisionCutoff: number
  counters: RunCounters
  solverExecutions: number
  candidates: Map<string, CandidateRecord>
  seenKeys: Set<string>
  providerRole: ProviderRole
}

const FAILURE_MESSAGES = {
  invalid_model_proposal: 'The level request could not be verified.',
  unknown_tool: 'The level request used an unavailable evaluation.',
  invalid_tool_arguments: 'The proposed traffic did not meet the level rules.',
  invalid_tool_result: 'The traffic verification result could not be trusted.',
  invalid_final_selection: 'The selected evidence is not available for this run.',
  final_verification_failed: 'Final level verification did not complete.',
  cancelled: 'Level generation was cancelled.',
  deadline: 'Level generation reached its time limit.',
  provider_failed: 'The level service is temporarily unavailable.',
  provider_refusal: 'No level could be prepared for this request.',
  tool_failed: 'Traffic verification is temporarily unavailable.',
  tool_timeout: 'Traffic verification reached its time limit.',
  step_limit: 'The level service reached its decision limit.',
  provider_attempt_limit: 'The level service reached its request limit.',
  tool_call_limit: 'The level service reached its verification limit.',
  revision_limit: 'The level service reached its revision limit.',
  repeated_action: 'The same traffic proposal was already evaluated.',
} as const

type OperationalStopReason = 'provider_failed' | 'tool_failed' | 'tool_timeout' | 'provider_refusal' |
  'step_limit' | 'provider_attempt_limit' | 'tool_call_limit' | 'revision_limit' | 'repeated_action' | 'deadline'

let serviceSequence = 0

export function createLevelGeneratorService(options: LevelGeneratorServiceOptions): LevelGeneratorService {
  if (options.failoverEnabled && !options.backupModel) throw new ProviderConfigurationError()
  const now = options.now ?? (() => performance.now())
  const solver = options.solver ?? createSolveLevelTool({ now })
  const waitBeforeRetry = options.waitBeforeRetry ?? abortableDelay

  return {
    async generate(value, callerSignal) {
      const parsedRequest = generationRequestSchema.safeParse(value)
      if (!parsedRequest.success) throw new InvalidGenerationRequestError()

      const startTime = now()
      const run: RunState = {
        runId: `run-${++serviceSequence}`,
        status: 'created',
        request: parsedRequest.data,
        startTime,
        deadline: startTime + LEVEL_GENERATOR_POLICY.runDeadlineMs,
        decisionCutoff: startTime + LEVEL_GENERATOR_POLICY.decisionCutoffMs,
        counters: {
          stepCount: 0,
          providerAttemptCount: 0,
          retryCount: 0,
          toolCallCount: 0,
          modelToolCallCount: 0,
          revisionCount: 0,
        },
        solverExecutions: 0,
        candidates: new Map(),
        seenKeys: new Set(),
        providerRole: 'primary',
      }
      const recordEvidence = createFailoverEvidenceRecorder(
        'generation', options.onEvidence, now, () => run.counters.stepCount,
      )
      run.status = 'running'
      const stopOperationally = async (reason: OperationalStopReason, status: 'stopped' | 'failed' = 'stopped') => {
        const fallback = await makeOperationalFallback(run, solver, callerSignal, now, reason)
        if (callerSignal.aborted) {
          recordEvidence({
            event: 'operation_unavailable', role: run.providerRole,
            attempt: run.counters.providerAttemptCount, category: 'cancelled', status: 'unavailable',
          })
          return unavailable(run, 'cancelled', 'stopped', now)
        }
        if (fallback) {
          recordEvidence({
            event: 'recovery_selected', role: run.providerRole,
            attempt: run.counters.providerAttemptCount, status: 'verified_recovery',
          })
          return fallback
        }
        recordEvidence({
          event: 'operation_unavailable', role: run.providerRole,
          attempt: run.counters.providerAttemptCount, status: 'unavailable',
        })
        return unavailable(run, reason, status, now)
      }

      while (run.status === 'running') {
        if (callerSignal.aborted) return unavailable(run, 'cancelled', 'stopped', now)
        if (now() >= run.deadline) return unavailable(run, 'deadline', 'stopped', now)
        if (now() >= run.decisionCutoff) return stopOperationally('deadline')
        if (run.counters.stepCount >= LEVEL_GENERATOR_POLICY.maxDecisions) {
          return stopOperationally('step_limit')
        }
        if (run.counters.providerAttemptCount >= LEVEL_GENERATOR_POLICY.maxProviderAttempts) {
          return stopOperationally('provider_attempt_limit')
        }

        run.counters.stepCount += 1
        let rawDecision: unknown
        let decisionReady = false
        if (options.failoverEnabled) {
          try {
            rawDecision = await runEnabledProviderPhase({
              startingRole: run.providerRole,
              signal: callerSignal,
              outerDeadline: run.decisionCutoff,
              now,
              onAttemptStart: (role, attemptNumber) => {
                if (run.counters.providerAttemptCount >= LEVEL_GENERATOR_POLICY.maxProviderAttempts) {
                  throw new ProviderFailure('timeout')
                }
                run.counters.providerAttemptCount += 1
                if (attemptNumber > 1) run.counters.retryCount += 1
                if (role === 'backup') run.providerRole = 'backup'
              },
              onEvidence: recordEvidence,
              run: async (role, timeoutMs, attemptSignal) => {
                const context = buildGeneratorDecisionContext(
                  run.runId,
                  run.request,
                  run.counters,
                  [...run.candidates.values()].map(record => record.evidence),
                  { counters: run.counters, elapsedMs: now() - run.startTime, solverExecutions: run.solverExecutions },
                  [...run.candidates.values()].map(record => ({
                    candidateId: record.candidateId,
                    evaluationId: record.evaluationId,
                    lanes: record.lanes,
                  })),
                )
                const model = role === 'primary' ? options.model : options.backupModel!
                try {
                  return await model.decide(context, attemptSignal, { timeoutMs })
                } catch (error) {
                  throw toGeneratorProviderFailure(error)
                }
              },
              wait: options.waitBeforeRetry,
            })
            decisionReady = true
          } catch (error) {
            if (callerSignal.aborted || (error instanceof ProviderFailure && error.category === 'cancelled')) {
              return unavailable(run, 'cancelled', 'stopped', now)
            }
            if (run.counters.providerAttemptCount >= LEVEL_GENERATOR_POLICY.maxProviderAttempts) {
              return stopOperationally('provider_attempt_limit')
            }
            if (now() >= run.deadline) return unavailable(run, 'deadline', 'stopped', now)
            if (now() >= run.decisionCutoff) {
              return stopOperationally('deadline')
            }
            const reason = error instanceof ProviderFailure && error.category === 'refusal'
              ? 'provider_refusal'
              : 'provider_failed'
            return stopOperationally(reason, reason === 'provider_refusal' ? 'stopped' : 'failed')
          }
        } else for (let attempt = 1; attempt <= LEVEL_GENERATOR_POLICY.maxAttemptsPerDecision; attempt += 1) {
          if (callerSignal.aborted) return unavailable(run, 'cancelled', 'stopped', now)
          if (now() >= run.deadline || now() >= run.decisionCutoff) return stopOperationally('deadline')
          if (run.counters.providerAttemptCount >= LEVEL_GENERATOR_POLICY.maxProviderAttempts) {
            return stopOperationally('provider_attempt_limit')
          }
          run.counters.providerAttemptCount += 1
          try {
            const context = buildGeneratorDecisionContext(
              run.runId,
              run.request,
              run.counters,
              [...run.candidates.values()].map((record) => record.evidence),
              { counters: run.counters, elapsedMs: now() - run.startTime, solverExecutions: run.solverExecutions },
              [...run.candidates.values()].map(record => ({ candidateId: record.candidateId, evaluationId: record.evaluationId, lanes: record.lanes })),
            )
            rawDecision = await callModelWithTimeout(options.model, context, callerSignal, run, now)
            decisionReady = true
            break
          } catch (error) {
            if (callerSignal.aborted) return unavailable(run, 'cancelled', 'stopped', now)
            if (now() >= run.deadline || now() >= run.decisionCutoff) return stopOperationally('deadline')
            const transient = error instanceof GeneratorModelError &&
              ['transient', 'rate_limit', 'timeout', 'temporary_unavailable'].includes(error.kind)
            const canRetry = transient && attempt < LEVEL_GENERATOR_POLICY.maxAttemptsPerDecision &&
              run.counters.providerAttemptCount < LEVEL_GENERATOR_POLICY.maxProviderAttempts
            if (!canRetry) {
              const reason = error instanceof GeneratorModelError && error.kind === 'refusal'
                ? 'provider_refusal'
                : 'provider_failed'
              return stopOperationally(reason, reason === 'provider_refusal' ? 'stopped' : 'failed')
            }
            run.counters.retryCount += 1
            try {
              await waitBeforeRetry(LEVEL_GENERATOR_POLICY.retryDelayMs, callerSignal)
            } catch {
              return unavailable(run, callerSignal.aborted ? 'cancelled' : 'deadline', 'stopped', now)
            }
          }
        }
        if (!decisionReady) return stopOperationally('provider_attempt_limit')
        if (callerSignal.aborted || run.status !== 'running') return unavailable(run, 'cancelled', 'stopped', now)
        if (now() >= run.deadline || now() >= run.decisionCutoff) return stopOperationally('deadline')

        const decision = modelDecisionSchema.safeParse(rawDecision)
        if (!decision.success) return unavailable(run, 'invalid_model_proposal', 'failed', now)
        if (decision.data.kind === 'refusal') return stopOperationally('provider_refusal')

        if (decision.data.kind === 'tool_request') {
          if (decision.data.name !== 'solveLevel') return unavailable(run, 'unknown_tool', 'failed', now)
          const argumentsResult = solveLevelArgumentsSchema.safeParse(decision.data.arguments)
          if (!argumentsResult.success) return unavailable(run, 'invalid_tool_arguments', 'failed', now)
          const lanes = normalizeGeneratedLanes(argumentsResult.data.lanes)
          if (!lanes) return unavailable(run, 'invalid_tool_arguments', 'failed', now)
          const settings: GeneratedLevelSettings = {
            lives: run.request.lives,
            crossingsToWin: run.request.crossingsToWin,
          }
          const key = canonicalCandidateKey(lanes, settings, LEVEL_GENERATOR_RULES_VERSION)
          if (run.seenKeys.has(key)) return stopOperationally('repeated_action')
          if (run.candidates.size >= LEVEL_GENERATOR_POLICY.maxCandidates) {
            return stopOperationally('revision_limit')
          }
          if (run.candidates.size > 0 && run.counters.revisionCount >= LEVEL_GENERATOR_POLICY.maxRevisions) {
            return stopOperationally('revision_limit')
          }
          if (run.solverExecutions >= LEVEL_GENERATOR_POLICY.maxSolverExecutions - 1) {
            return stopOperationally('tool_call_limit')
          }
          if (run.counters.toolCallCount >= LEVEL_GENERATOR_POLICY.maxSolverExecutions) {
            return stopOperationally('tool_call_limit')
          }

          const candidateId = `c${run.candidates.size + 1}`
          const evaluationId = `e${run.solverExecutions + 1}`
          run.seenKeys.add(key)
          if (run.candidates.size > 0) run.counters.revisionCount += 1
          run.counters.modelToolCallCount += 1
          run.counters.toolCallCount += 1
          run.solverExecutions += 1
          let toolOutput
          try {
            toolOutput = await solver.execute({
              candidateId,
              evaluationId,
              lanes,
              settings,
              runDeadline: run.deadline,
              signal: callerSignal,
            })
          } catch {
            if (callerSignal.aborted) return unavailable(run, 'cancelled', 'stopped', now)
            if (now() >= run.deadline || now() >= run.decisionCutoff) return stopOperationally('deadline')
            const fallback = await makeOperationalFallback(run, solver, callerSignal, now, 'tool_failed')
            if (fallback) return fallback
            if (callerSignal.aborted) return unavailable(run, 'cancelled', 'stopped', now)
            return unavailable(run, 'tool_failed', 'failed', now)
          }
          if (callerSignal.aborted || run.status !== 'running') return unavailable(run, 'cancelled', 'stopped', now)
          if (now() >= run.deadline || now() >= run.decisionCutoff) return stopOperationally('deadline')
          const evidence = compactEvaluationSchema.safeParse(toolOutput?.evidence)
          if (!evidence.success || evidence.data.candidateId !== candidateId || evidence.data.evaluationId !== evaluationId) {
            return unavailable(run, 'invalid_tool_result', 'failed', now)
          }
          run.candidates.set(candidateId, {
            candidateId,
            evaluationId,
            key,
            lanes: lanes.map((lane) => ({ ...lane, vehicleStarts: [...lane.vehicleStarts] })),
            settings: { ...settings },
            evidence: evidence.data,
            proof: {
              firstCrossingActions: toolOutput.proof?.firstCrossingActions ? [...toolOutput.proof.firstCrossingActions] : null,
              winningActions: toolOutput.proof?.winningActions ? [...toolOutput.proof.winningActions] : null,
            },
          })
          continue
        }

        const selected = run.candidates.get(decision.data.candidateId)
        if (
          run.counters.stepCount < 2 ||
          run.counters.modelToolCallCount < 1 ||
          !selected ||
          selected.evaluationId !== decision.data.evaluationId ||
          selected.evidence.outcome !== 'solved'
        ) return unavailable(run, 'invalid_final_selection', 'failed', now)

        const verified = await verifyFinalSelection(run, selected, solver, callerSignal, now)
        if ('kind' in verified) return verified
        const matches = verified.evidence.computedDifficulty === run.request.targetDifficulty
        const status = matches ? 'completed' : 'stopped'
        const stopReason = matches ? 'goal_completed' : 'target_not_met'
        run.status = status
        const response = {
          runId: run.runId,
          status,
          stopReason,
          completed: matches,
          counters: { ...run.counters },
          elapsedMs: elapsed(run, now),
          kind: 'preview',
          source: matches ? 'generated' : 'last_verified',
          settings: { lives: run.request.lives, crossingsToWin: run.request.crossingsToWin },
          lanes: selected.lanes,
          requestedDifficulty: run.request.targetDifficulty,
          computedDifficulty: verified.evidence.computedDifficulty,
          verified: true,
          measurements: measurementsFrom(verified.evidence),
          summary: matches
            ? 'Verified level meets the requested rating and full crossing target.'
            : `Verified level measures rating ${verified.evidence.computedDifficulty}; requested rating ${run.request.targetDifficulty}.`,
        }
        return generationResponseSchema.parse(response)
      }

      return unavailable(run, 'provider_failed', 'failed', now)
    },
  }
}

async function verifyFinalSelection(
  run: RunState,
  selected: CandidateRecord,
  solver: SolveLevelTool,
  signal: AbortSignal,
  now: () => number,
): Promise<{ evidence: Extract<CompactEvaluation, { outcome: 'solved' }> } | GenerationResponse> {
  if (signal.aborted) return unavailable(run, 'cancelled', 'stopped', now)
  if (now() >= run.deadline) return unavailable(run, 'deadline', 'stopped', now)
  if (run.counters.toolCallCount >= LEVEL_GENERATOR_POLICY.maxSolverExecutions) {
    return unavailable(run, 'tool_call_limit', 'stopped', now)
  }

  run.counters.toolCallCount += 1
  run.solverExecutions += 1
  const evaluationId = `e${run.solverExecutions}`
  let output
  try {
    output = await solver.execute({
      candidateId: selected.candidateId,
      evaluationId,
      lanes: selected.lanes,
      settings: selected.settings,
      runDeadline: run.deadline,
      signal,
    })
  } catch {
    run.status = 'failed'
    return unavailable(run, 'final_verification_failed', 'failed', now)
  }
  if (signal.aborted || run.status !== 'running') return unavailable(run, 'cancelled', 'stopped', now)
  if (now() >= run.deadline) return unavailable(run, 'deadline', 'stopped', now)
  const checked = compactEvaluationSchema.safeParse(output?.evidence)
  if (!checked.success || checked.data.candidateId !== selected.candidateId ||
      checked.data.evaluationId !== evaluationId || checked.data.outcome !== 'solved' ||
      checked.data.computedDifficulty !== selected.evidence.computedDifficulty ||
      checked.data.minMoves !== selected.evidence.minMoves ||
      !output.proof?.winningActions ||
      output.proof.winningActions.length !== checked.data.minMoves) {
    run.status = 'failed'
    return unavailable(run, 'final_verification_failed', 'failed', now)
  }
  return { evidence: checked.data }
}

async function callModelWithTimeout(
  model: LevelGeneratorModel,
  context: ReturnType<typeof buildGeneratorDecisionContext>,
  callerSignal: AbortSignal,
  run: RunState,
  now: () => number,
): Promise<unknown> {
  const remainingMs = Math.max(0, Math.min(
    LEVEL_GENERATOR_POLICY.providerAttemptTimeoutMs,
    run.deadline - now(),
    run.decisionCutoff - now(),
  ))
  if (remainingMs === 0) throw new GeneratorModelError('transient')
  const attemptController = new AbortController()
  const signal = AbortSignal.any([callerSignal, attemptController.signal])
  let timer: ReturnType<typeof setTimeout> | undefined
  let rejectAbort: ((reason: GeneratorModelError) => void) | undefined
  const onCallerAbort = () => rejectAbort?.(new GeneratorModelError('permanent'))
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      attemptController.abort()
      reject(new GeneratorModelError('transient'))
    }, remainingMs)
  })
  const aborted = new Promise<never>((_, reject) => {
    rejectAbort = reject
    if (callerSignal.aborted) reject(new GeneratorModelError('permanent'))
    else callerSignal.addEventListener('abort', onCallerAbort, { once: true })
  })
  try {
    return await Promise.race([model.decide(context, signal, { timeoutMs: remainingMs }), timeout, aborted])
  } finally {
    if (timer !== undefined) clearTimeout(timer)
    callerSignal.removeEventListener('abort', onCallerAbort)
    attemptController.abort()
  }
}

async function makeOperationalFallback(
  run: RunState,
  solver: SolveLevelTool,
  signal: AbortSignal,
  now: () => number,
  stopReason: OperationalStopReason,
): Promise<GenerationResponse | null> {
  if (signal.aborted || now() >= run.deadline) return null

  const prior = [...run.candidates.values()].reverse().find((candidate) =>
    candidate.evidence.outcome === 'solved',
  )
  if (prior) {
    const evidence = compactEvaluationSchema.safeParse(prior.evidence)
    if (!evidence.success || evidence.data.outcome !== 'solved' ||
        evidence.data.candidateId !== prior.candidateId || evidence.data.evaluationId !== prior.evaluationId ||
        prior.settings.lives !== run.request.lives || prior.settings.crossingsToWin !== run.request.crossingsToWin ||
        canonicalCandidateKey(prior.lanes, prior.settings, LEVEL_GENERATOR_RULES_VERSION) !== prior.key ||
        prior.proof.firstCrossingActions?.length !== evidence.data.firstCrossingMinMoves ||
        prior.proof.winningActions?.length !== evidence.data.minMoves ||
        !replayProof(prior.lanes, prior.settings, prior.proof.firstCrossingActions!, 1) ||
        !replayProof(prior.lanes, prior.settings, prior.proof.winningActions!, prior.settings.crossingsToWin) ||
        signal.aborted || now() >= run.deadline) return null

    run.status = 'stopped'
    return generationResponseSchema.parse({
      runId: run.runId, status: 'stopped', stopReason, completed: false,
      counters: { ...run.counters }, elapsedMs: elapsed(run, now),
      kind: 'preview', source: 'last_verified', settings: { ...prior.settings }, lanes: prior.lanes,
      requestedDifficulty: run.request.targetDifficulty, computedDifficulty: evidence.data.computedDifficulty,
      verified: true, measurements: measurementsFrom(evidence.data),
      summary: `Generation stopped; the last verified level measures rating ${evidence.data.computedDifficulty}; requested rating ${run.request.targetDifficulty}.`,
    })
  }
  if (now() + LEVEL_GENERATOR_POLICY.solverTimeoutMs >= run.deadline ||
      run.counters.toolCallCount >= LEVEL_GENERATOR_POLICY.maxSolverExecutions) return null

  const lanes = getGeneratedLevelTemplate(run.request.targetDifficulty as GeneratedDifficulty)
  const settings = { lives: run.request.lives, crossingsToWin: run.request.crossingsToWin }
  const candidateId = 'fallback-template'
  const evaluationId = `e${run.solverExecutions + 1}`
  run.counters.toolCallCount += 1
  run.solverExecutions += 1

  let output
  try {
    output = await solver.execute({ candidateId, evaluationId, lanes, settings, runDeadline: run.deadline, signal })
  } catch {
    return null
  }
  if (signal.aborted || now() >= run.deadline) return null
  const checked = compactEvaluationSchema.safeParse(output?.evidence)
  if (!checked.success || checked.data.candidateId !== candidateId || checked.data.evaluationId !== evaluationId ||
      checked.data.outcome !== 'solved' || checked.data.computedDifficulty !== run.request.targetDifficulty ||
      !output.proof?.winningActions || output.proof.winningActions.length !== checked.data.minMoves) return null

  run.status = 'stopped'
  return generationResponseSchema.parse({
    runId: run.runId,
    status: 'stopped',
    stopReason,
    completed: false,
    counters: { ...run.counters },
    elapsedMs: elapsed(run, now),
    kind: 'preview',
    source: 'template',
    settings,
    lanes,
    requestedDifficulty: run.request.targetDifficulty,
    computedDifficulty: checked.data.computedDifficulty,
    verified: true,
    measurements: measurementsFrom(checked.data),
    summary: 'A verified application level matches the requested rating and crossing target.',
  })
}

function abortableDelay(milliseconds: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.reject(new Error('Aborted'))
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve()
    }, milliseconds)
    const onAbort = () => {
      clearTimeout(timer)
      reject(new Error('Aborted'))
    }
    signal.addEventListener('abort', onAbort, { once: true })
  })
}

function measurementsFrom(evidence: Extract<CompactEvaluation, { outcome: 'solved' }>) {
  return {
    firstCrossingMinMoves: evidence.firstCrossingMinMoves,
    minMoves: evidence.minMoves,
    tightestGap: evidence.tightestGap,
    averageGap: evidence.averageGap,
    trafficDensity: evidence.trafficDensity,
    trafficPeriod: evidence.trafficPeriod,
    exploredStates: evidence.exploredStates,
    actionEvaluations: evidence.actionEvaluations,
  }
}

function unavailable(
  run: RunState,
  reason: keyof typeof FAILURE_MESSAGES,
  status: 'stopped' | 'failed',
  now: () => number,
): GenerationResponse {
  if (run.status === 'running') run.status = status
  return generationResponseSchema.parse({
    runId: run.runId,
    status,
    stopReason: reason,
    completed: false,
    counters: { ...run.counters },
    elapsedMs: elapsed(run, now),
    kind: 'unavailable',
    message: FAILURE_MESSAGES[reason],
  })
}

function elapsed(run: RunState, now: () => number): number {
  return Math.max(0, Math.min(LEVEL_GENERATOR_POLICY.runDeadlineMs, Math.floor(now() - run.startTime)))
}
