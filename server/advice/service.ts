import {
  isAdviceResponse,
  isCompletedRunSummary,
  isProviderTip,
  type AdviceFocus,
  type AdviceResponse,
  type CompletedRunSummary,
} from '../../shared/advice-contract'
import {
  createFailoverEvidenceRecorder,
  ProviderFailure,
  runEnabledProviderPhase,
  type FailoverEvidenceEvent,
  type ProviderRole,
} from '../ai/failover-policy'
import { ProviderConfigurationError } from '../ai/provider-config'

export const ADVICE_ATTEMPT_TIMEOUT_MS = 15_000
const MAX_ATTEMPTS = 2
const RETRY_DELAY_MS = 250

export interface ProviderInput {
  summary: CompletedRunSummary
  focus: AdviceFocus
  evidence: string
}

export interface AdviceProvider {
  generateTip(input: ProviderInput, signal: AbortSignal, options?: { timeoutMs: number }): Promise<unknown>
}

export interface AdviceServiceOptions {
  enabled?: boolean
  backupProvider?: AdviceProvider
  now?: () => number
  wait?: (milliseconds: number, signal: AbortSignal) => Promise<void>
  onEvidence?: (event: FailoverEvidenceEvent) => void
}

export interface AdviceService {
  analyze(summary: unknown, signal: AbortSignal): Promise<AdviceResponse>
}

export class AdviceServiceError extends Error {
  readonly code = 'ADVICE_UNAVAILABLE'

  constructor() {
    super('Advice is unavailable.')
    this.name = 'AdviceServiceError'
  }
}

export class TransientProviderError extends Error {
  constructor(_reason?: unknown) {
    super('Transient provider error.')
    this.name = 'TransientProviderError'
  }
}

class AttemptTimeoutError extends Error {
  constructor() {
    super('Provider attempt timed out.')
  }
}

function deriveFocus(summary: CompletedRunSummary): AdviceFocus {
  if (summary.outcome === 'lost' && summary.crossings === 0) return 'survival'
  if (summary.outcome === 'lost' && summary.crossings > 0) return 'goal_progress'
  return 'general'
}

function deriveEvidence(summary: CompletedRunSummary): string {
  if (summary.outcome === 'lost' && summary.crossings === 0) {
    return 'You lost all ' + summary.startingLives + ' lives before completing a crossing.'
  }
  if (summary.outcome === 'lost') {
    return (
      summary.crossings +
      ' of ' +
      summary.targetCrossings +
      ' crossings were completed before all lives were lost.'
    )
  }
  return 'You completed ' + summary.crossings + ' of ' + summary.targetCrossings + ' crossings.'
}

export function createAdviceService(provider: AdviceProvider, options: AdviceServiceOptions = {}): AdviceService {
  if (options.enabled && !options.backupProvider) throw new ProviderConfigurationError()
  const now = options.now ?? (() => performance.now())
  return {
    async analyze(value, callerSignal) {
      if (!isCompletedRunSummary(value) || callerSignal.aborted) throw new AdviceServiceError()

      const summary = value
      const focus = deriveFocus(summary)
      const evidence = deriveEvidence(summary)
      const input: ProviderInput = { summary, focus, evidence }

      if (options.enabled) {
        const recordEvidence = createFailoverEvidenceRecorder('advice', options.onEvidence, now)
        let providerAttemptCount = 0
        try {
          const output = await runEnabledProviderPhase({
            signal: callerSignal,
            now,
            wait: options.wait,
            onAttemptStart: (_role: ProviderRole) => { providerAttemptCount += 1 },
            onEvidence: recordEvidence,
            run: async (role, timeoutMs, attemptSignal) => {
              const active = role === 'primary' ? provider : options.backupProvider!
              try {
                return await active.generateTip(input, attemptSignal, { timeoutMs })
              } catch (error) {
                throw normalizeAdviceProviderFailure(error)
              }
            },
          })
          if (!isProviderTip(output)) throw new AdviceServiceError()
          const result: AdviceResponse = { focus, evidence, nextTip: output.nextTip }
          if (!isAdviceResponse(result)) throw new AdviceServiceError()
          return result
        } catch {
          recordEvidence({
            event: 'operation_unavailable', role: providerAttemptCount > 1 ? 'backup' : 'primary',
            attempt: providerAttemptCount, status: 'unavailable',
          })
          throw new AdviceServiceError()
        }
      }

      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
        if (callerSignal.aborted) throw new AdviceServiceError()
        try {
          const output = await runAttempt(provider, input, callerSignal, ADVICE_ATTEMPT_TIMEOUT_MS)
          if (!isProviderTip(output)) throw new AdviceServiceError()
          const result: AdviceResponse = { focus, evidence, nextTip: output.nextTip }
          if (!isAdviceResponse(result)) throw new AdviceServiceError()
          return result
        } catch (error) {
          if (callerSignal.aborted) throw new AdviceServiceError()
          const retryable = error instanceof TransientProviderError || error instanceof AttemptTimeoutError ||
            (error instanceof ProviderFailure && isRetryable(error.category))
          if (!retryable || attempt === MAX_ATTEMPTS) throw new AdviceServiceError()
          await delay(RETRY_DELAY_MS, callerSignal)
        }
      }

      throw new AdviceServiceError()
    },
  }
}

async function runAttempt(
  provider: AdviceProvider,
  input: ProviderInput,
  callerSignal: AbortSignal,
  timeoutMs: number,
): Promise<unknown> {
  const controller = new AbortController()
  let timedOut = false
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  let onCallerAbort: (() => void) | undefined

  const timeout = new Promise<never>((_resolve, reject) => {
    timeoutId = setTimeout(() => {
      timedOut = true
      controller.abort()
      reject(new AttemptTimeoutError())
    }, timeoutMs)
  })
  const callerAbort = new Promise<never>((_resolve, reject) => {
    onCallerAbort = (): void => {
      controller.abort()
      reject(new AdviceServiceError())
    }
    if (callerSignal.aborted) onCallerAbort()
    else callerSignal.addEventListener('abort', onCallerAbort, { once: true })
  })

  try {
    return await Promise.race([provider.generateTip(input, controller.signal, { timeoutMs }), timeout, callerAbort])
  } catch (error) {
    if (timedOut) throw new AttemptTimeoutError()
    throw error
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId)
    if (onCallerAbort) callerSignal.removeEventListener('abort', onCallerAbort)
  }
}

function normalizeAdviceProviderFailure(error: unknown): ProviderFailure {
  if (error instanceof ProviderFailure) return error
  if (error instanceof TransientProviderError) return new ProviderFailure('temporary_unavailable')
  return new ProviderFailure('permanent')
}

function isRetryable(category: ProviderFailure['category']): boolean {
  return category === 'rate_limit' || category === 'timeout' || category === 'temporary_unavailable'
}

function delay(milliseconds: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new AdviceServiceError())
      return
    }
    const onAbort = (): void => {
      clearTimeout(timer)
      reject(new AdviceServiceError())
    }
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve()
    }, milliseconds)
    signal.addEventListener('abort', onAbort, { once: true })
  })
}
