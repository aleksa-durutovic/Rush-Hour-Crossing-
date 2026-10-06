import { DIFFICULTY_PRESETS } from '../../src/config/presets'
import { createInitialState, type GameConfig, type GameState } from '../../src/game/state'
import { applyAction, getActionDestination } from '../../src/game/turn'
import {
  HINT_EXPLANATION_MAX_CHARACTERS,
  HINT_RESPONSE_MAX_BYTES,
  isHintResponse,
  isHintSnapshot,
  isHintSolverResult,
  isHintToolProposal,
  type HintResponse,
  type HintRouteStep,
  type HintSnapshot,
  type HintSolverResult,
} from '../../shared/hint-agent-contract'
import { findSafePath } from './tools/find-safe-path'

export const HINT_PROVIDER_ATTEMPT_TIMEOUT_MS = 15_000
export const HINT_TOTAL_DEADLINE_MS = 45_000
export const HINT_MAX_PROVIDER_ATTEMPTS = 4
export const HINT_MAX_ATTEMPTS_PER_STEP = 2

export interface HintProviderProposal {
  calls: readonly unknown[]
  continuation: unknown
}

export interface HintToolEvidence {
  outcome: 'verified'
  actionCount: number
  finalCrossings: number
  unchangedLives: number
}

export interface HintProvider {
  proposePath(snapshot: HintSnapshot, signal: AbortSignal): Promise<HintProviderProposal>
  explainVerifiedPath(
    continuation: unknown,
    evidence: HintToolEvidence,
    signal: AbortSignal,
  ): Promise<unknown>
}

export interface HintService {
  analyze(snapshot: unknown, signal: AbortSignal): Promise<HintResponse>
}

export type HintSolver = (snapshot: HintSnapshot) => HintSolverResult

export interface HintServiceOptions {
  solver?: HintSolver
}

export class HintServiceError extends Error {
  readonly code = 'HINT_UNAVAILABLE'

  constructor() {
    super('Hint is unavailable.')
    this.name = 'HintServiceError'
  }
}

export class TransientHintProviderError extends Error {
  constructor() {
    super('Transient provider error.')
    this.name = 'TransientHintProviderError'
  }
}

class HintAttemptTimeoutError extends Error {}

export function createHintService(provider: HintProvider, options: HintServiceOptions = {}): HintService {
  const solver = options.solver ?? findSafePath

  return {
    async analyze(value, callerSignal) {
      if (!isHintSnapshot(value) || callerSignal.aborted) throw new HintServiceError()
      const snapshot = value
      const controller = new AbortController()
      let totalTimedOut = false
      let totalTimer: ReturnType<typeof setTimeout> | undefined
      let onCallerAbort: (() => void) | undefined

      const deadline = new Promise<never>((_resolve, reject) => {
        totalTimer = setTimeout(() => {
          totalTimedOut = true
          controller.abort()
          reject(new HintServiceError())
        }, HINT_TOTAL_DEADLINE_MS)
      })
      const callerAbort = new Promise<never>((_resolve, reject) => {
        onCallerAbort = () => {
          controller.abort()
          reject(new HintServiceError())
        }
        if (callerSignal.aborted) onCallerAbort()
        else callerSignal.addEventListener('abort', onCallerAbort, { once: true })
      })

      try {
        return await Promise.race([
          runWorkflow(snapshot, provider, solver, controller.signal),
          deadline,
          callerAbort,
        ])
      } catch {
        if (totalTimedOut || callerSignal.aborted) throw new HintServiceError()
        throw new HintServiceError()
      } finally {
        if (totalTimer !== undefined) clearTimeout(totalTimer)
        if (onCallerAbort) callerSignal.removeEventListener('abort', onCallerAbort)
      }
    },
  }
}

async function runWorkflow(
  snapshot: HintSnapshot,
  provider: HintProvider,
  solver: HintSolver,
  signal: AbortSignal,
): Promise<HintResponse> {
  let providerAttempts = 0
  const runStep = async <T>(operation: (attemptSignal: AbortSignal) => Promise<T>): Promise<T> => {
    for (let stepAttempt = 1; stepAttempt <= HINT_MAX_ATTEMPTS_PER_STEP; stepAttempt += 1) {
      if (signal.aborted || providerAttempts >= HINT_MAX_PROVIDER_ATTEMPTS) throw new HintServiceError()
      providerAttempts += 1
      try {
        return await runProviderAttempt(operation, signal)
      } catch (error) {
        if (signal.aborted) throw new HintServiceError()
        const retryable = error instanceof TransientHintProviderError || error instanceof HintAttemptTimeoutError
        if (!retryable || stepAttempt === HINT_MAX_ATTEMPTS_PER_STEP) throw new HintServiceError()
      }
    }
    throw new HintServiceError()
  }

  const proposal = await runStep((attemptSignal) => provider.proposePath(snapshot, attemptSignal))
  if (
    !isRecord(proposal) ||
    !Array.isArray(proposal.calls) ||
    proposal.calls.length !== 1 ||
    !Object.hasOwn(proposal, 'continuation') ||
    !isHintToolProposal(proposal.calls[0])
  ) {
    throw new HintServiceError()
  }
  if (signal.aborted) throw new HintServiceError()

  // The exact allowlisted call has no parameters; the validated snapshot is the only solver input.
  const solverResult = solver(snapshot)
  if (!isHintSolverResult(solverResult)) throw new HintServiceError()
  const checkedResult = validateSolverResult(snapshot, solverResult)
  if (!checkedResult) throw new HintServiceError()
  if (signal.aborted) throw new HintServiceError()

  if (checkedResult.outcome !== 'verified') {
    const response: HintResponse = {
      outcome: checkedResult.outcome,
      origin: { ...snapshot },
      explanation: '',
      steps: [],
    }
    if (!isHintResponse(response, snapshot) || Buffer.byteLength(JSON.stringify(response), 'utf8') > HINT_RESPONSE_MAX_BYTES) {
      throw new HintServiceError()
    }
    return response
  }

  const lastStep = checkedResult.steps.at(-1)
  if (!lastStep || lastStep.entered.y !== 0 || lastStep.crossings !== snapshot.crossings + 1) {
    throw new HintServiceError()
  }
  const evidence: HintToolEvidence = {
    outcome: 'verified',
    actionCount: checkedResult.steps.length,
    finalCrossings: lastStep.crossings,
    unchangedLives: snapshot.lives,
  }
  const explanation = await runStep((attemptSignal) =>
    provider.explainVerifiedPath(proposal.continuation, evidence, attemptSignal),
  )
  if (!isHintExplanation(explanation)) throw new HintServiceError()

  const response: HintResponse = {
    outcome: 'verified',
    origin: { ...snapshot },
    explanation: explanation.explanation,
    steps: checkedResult.steps,
  }
  if (!isHintResponse(response, snapshot) || Buffer.byteLength(JSON.stringify(response), 'utf8') > HINT_RESPONSE_MAX_BYTES) {
    throw new HintServiceError()
  }
  return response
}

async function runProviderAttempt<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  overallSignal: AbortSignal,
): Promise<T> {
  const controller = new AbortController()
  let timedOut = false
  let timeoutTimer: ReturnType<typeof setTimeout> | undefined
  let onOverallAbort: (() => void) | undefined

  const timeout = new Promise<never>((_resolve, reject) => {
    timeoutTimer = setTimeout(() => {
      timedOut = true
      controller.abort()
      reject(new HintAttemptTimeoutError())
    }, HINT_PROVIDER_ATTEMPT_TIMEOUT_MS)
  })
  const abort = new Promise<never>((_resolve, reject) => {
    onOverallAbort = () => {
      controller.abort()
      reject(new HintServiceError())
    }
    if (overallSignal.aborted) onOverallAbort()
    else overallSignal.addEventListener('abort', onOverallAbort, { once: true })
  })

  try {
    const result = await Promise.race([Promise.resolve().then(() => operation(controller.signal)), timeout, abort])
    if (overallSignal.aborted) throw new HintServiceError()
    return result
  } catch (error) {
    if (timedOut) throw new HintAttemptTimeoutError()
    throw error
  } finally {
    if (timeoutTimer !== undefined) clearTimeout(timeoutTimer)
    if (onOverallAbort) overallSignal.removeEventListener('abort', onOverallAbort)
  }
}

function validateSolverResult(snapshot: HintSnapshot, result: HintSolverResult): HintSolverResult | null {
  if (result.outcome !== 'verified') return result
  if (result.steps.length < 1 || result.steps.length > 512) return null

  let state = stateFromSnapshot(snapshot)
  for (const [index, step] of result.steps.entries()) {
    if (!isHintRouteStep(step)) return null
    const entered = getActionDestination(state.player, step.action)
    if (entered.x !== step.entered.x || entered.y !== step.entered.y) return null
    const nextState = applyAction(state, step.action, DIFFICULTY_PRESETS[snapshot.difficulty])
    if (nextState.lives !== snapshot.lives) return null
    if (!matchesStep(nextState, step)) return null
    const isLast = index === result.steps.length - 1
    const crossed = nextState.crossings === state.crossings + 1
    if (isLast) {
      if (!crossed || step.entered.y !== 0 || (nextState.status !== 'active' && nextState.status !== 'won')) return null
    } else if (nextState.status !== 'active' || nextState.crossings !== state.crossings || step.entered.y === 0) {
      return null
    }
    state = nextState
  }
  return result
}

function stateFromSnapshot(snapshot: HintSnapshot): GameState {
  const config: GameConfig = {
    lives: snapshot.lives,
    crossingsToWin: snapshot.crossingsToWin,
    difficulty: snapshot.difficulty,
  }
  return {
    ...createInitialState(config),
    tick: snapshot.tick,
    player: { x: snapshot.x, y: snapshot.y },
    lives: snapshot.lives,
    crossings: snapshot.crossings,
    score: snapshot.crossings * 100,
  }
}

function matchesStep(state: GameState, step: HintRouteStep): boolean {
  return (
    state.tick === step.tick &&
    state.player.x === step.x &&
    state.player.y === step.y &&
    state.lives === step.lives &&
    state.crossings === step.crossings &&
    state.status === step.status
  )
}

function isHintRouteStep(value: unknown): value is HintRouteStep {
  if (!isRecord(value)) return false
  const allowedKeys = ['action', 'entered', 'tick', 'x', 'y', 'lives', 'crossings', 'status']
  return Object.keys(value).length === allowedKeys.length && allowedKeys.every((key) => Object.hasOwn(value, key))
}

function isHintExplanation(value: unknown): value is { explanation: string } {
  if (!isRecord(value) || Object.keys(value).length !== 1 || !Object.hasOwn(value, 'explanation')) return false
  return (
    typeof value.explanation === 'string' &&
    value.explanation.trim().length > 0 &&
    value.explanation.length <= HINT_EXPLANATION_MAX_CHARACTERS &&
    !/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u.test(value.explanation)
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
