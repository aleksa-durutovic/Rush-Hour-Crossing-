export const AI_FAILOVER_POLICY = {
  primaryTimeoutMs: 8_000,
  backupTimeoutMs: 7_000,
  phaseTimeoutMs: 15_000,
  backupRetryDelayMs: 250,
  maxEvidenceEvents: 32,
} as const

export type ProviderRole = 'primary' | 'backup'
export type FailoverEvidenceEventName = 'attempt_started' | 'attempt_failed' | 'role_switched' | 'phase_completed' |
  'phase_stopped' | 'recovery_selected' | 'operation_unavailable'

export interface FailoverEvidenceEvent {
  operation: 'generation' | 'advice'
  event: FailoverEvidenceEventName
  role: ProviderRole
  attempt: number
  providerAttemptCount: number
  decisionNumber?: number
  status?: 'verified_recovery' | 'unavailable'
  elapsedMs: number
  category?: ProviderFailureCategory
}

export function createFailoverEvidenceRecorder(
  operation: FailoverEvidenceEvent['operation'],
  onEvent: (event: FailoverEvidenceEvent) => void = () => undefined,
  now: () => number = () => performance.now(),
  decisionNumber?: () => number,
): (event: Omit<FailoverEvidenceEvent, 'operation' | 'elapsedMs' | 'providerAttemptCount'>) => void {
  const startedAt = now()
  let recorded = 0
  let providerAttemptCount = 0
  return (event) => {
    if (event.event === 'attempt_started') providerAttemptCount += 1
    if (recorded >= AI_FAILOVER_POLICY.maxEvidenceEvents) return
    recorded += 1
    try {
      onEvent(Object.freeze({
        ...event,
        operation,
        providerAttemptCount,
        ...(decisionNumber ? { decisionNumber: decisionNumber() } : {}),
        elapsedMs: Math.max(0, Math.round(now() - startedAt)),
      }))
    } catch {
      // Diagnostics must never change provider routing or the operation result.
    }
  }
}

export type ProviderFailureCategory =
  | 'rate_limit'
  | 'timeout'
  | 'temporary_unavailable'
  | 'configuration'
  | 'permanent'
  | 'refusal'
  | 'invalid_output'
  | 'output_limit'
  | 'cancelled'

const FAILOVER_ELIGIBLE: ReadonlySet<ProviderFailureCategory> = new Set([
  'rate_limit',
  'timeout',
  'temporary_unavailable',
])

export class ProviderFailure extends Error {
  constructor(readonly category: ProviderFailureCategory) {
    super('Provider operation failed.')
    this.name = 'ProviderFailure'
  }
}

export interface EnabledProviderPhaseOptions<T> {
  signal: AbortSignal
  startingRole?: ProviderRole
  outerDeadline?: number
  now?: () => number
  run: (role: ProviderRole, timeoutMs: number, signal: AbortSignal) => Promise<T> | T
  onAttemptStart: (role: ProviderRole, attemptNumber: number, deadline: number) => void
  onEvidence?: (event: Omit<FailoverEvidenceEvent, 'operation' | 'elapsedMs' | 'providerAttemptCount'>) => void
  wait?: (milliseconds: number, signal: AbortSignal) => Promise<void>
}

/**
 * Runs one enabled, request-local provider phase. The caller owns persistent routing and
 * counters; this function only enforces one phase's sequential attempt/deadline policy.
 */
export async function runEnabledProviderPhase<T>(options: EnabledProviderPhaseOptions<T>): Promise<T> {
  const now = options.now ?? (() => performance.now())
  const startedAt = now()
  const phaseDeadline = Math.min(
    startedAt + AI_FAILOVER_POLICY.phaseTimeoutMs,
    options.outerDeadline ?? Number.POSITIVE_INFINITY,
  )
  const initialRole = options.startingRole ?? 'primary'
  let attempts = 0

  while (attempts < 2) {
    if (options.signal.aborted) {
      options.onEvidence?.({ event: 'phase_stopped', role: initialRole, attempt: attempts, category: 'cancelled' })
      throw new ProviderFailure('cancelled')
    }
    const role: ProviderRole = initialRole === 'primary' && attempts === 0 ? 'primary' : 'backup'
    const attemptStartedAt = now()
    const allowance = role === 'primary'
      ? AI_FAILOVER_POLICY.primaryTimeoutMs
      : AI_FAILOVER_POLICY.backupTimeoutMs
    const deadline = Math.min(attemptStartedAt + allowance, phaseDeadline, options.outerDeadline ?? Infinity)
    const timeoutMs = deadline - attemptStartedAt
    if (timeoutMs <= 0) {
      options.onEvidence?.({ event: 'phase_stopped', role, attempt: attempts, category: 'timeout' })
      throw new ProviderFailure('timeout')
    }

    attempts += 1
    options.onAttemptStart(role, attempts, deadline)
    options.onEvidence?.({ event: 'attempt_started', role, attempt: attempts })
    if (initialRole === 'primary' && role === 'backup') {
      options.onEvidence?.({ event: 'role_switched', role, attempt: attempts })
    }
    try {
      const result = await runOneAttempt(options, role, deadline, timeoutMs, now)
      if (options.signal.aborted) throw new ProviderFailure('cancelled')
      if (now() >= deadline) throw new ProviderFailure('timeout')
      options.onEvidence?.({ event: 'phase_completed', role, attempt: attempts })
      return result
    } catch (caught) {
      const failure = options.signal.aborted
        ? new ProviderFailure('cancelled')
        : normalizeFailure(caught)
      options.onEvidence?.({ event: 'attempt_failed', role, attempt: attempts, category: failure.category })
      if (!FAILOVER_ELIGIBLE.has(failure.category) || attempts >= 2 || now() >= phaseDeadline) {
        options.onEvidence?.({ event: 'phase_stopped', role, attempt: attempts, category: failure.category })
        throw failure
      }

      // A primary failure switches immediately. A later backup-only decision may retry
      // backup once, with the existing interruptible delay inside the shared phase.
      if (initialRole === 'backup' && attempts === 1) {
        const delayMs = AI_FAILOVER_POLICY.backupRetryDelayMs
        const remainingMs = phaseDeadline - now()
        if (remainingMs <= delayMs) {
          if (remainingMs > 0) await (options.wait ?? abortableDelay)(remainingMs, options.signal)
          const category = options.signal.aborted ? 'cancelled' : 'timeout'
          options.onEvidence?.({ event: 'phase_stopped', role, attempt: attempts, category })
          throw new ProviderFailure(category)
        }
        await (options.wait ?? abortableDelay)(delayMs, options.signal)
        if (options.signal.aborted) throw new ProviderFailure('cancelled')
        if (now() >= phaseDeadline) {
          options.onEvidence?.({ event: 'phase_stopped', role, attempt: attempts, category: 'timeout' })
          throw new ProviderFailure('timeout')
        }
      }
    }
  }

  throw new ProviderFailure('timeout')
}

async function runOneAttempt<T>(
  options: EnabledProviderPhaseOptions<T>,
  role: ProviderRole,
  deadline: number,
  timeoutMs: number,
  now: () => number,
): Promise<T> {
  const attemptController = new AbortController()
  const signal = AbortSignal.any([options.signal, attemptController.signal])
  let timer: ReturnType<typeof setTimeout> | undefined
  let timedOut = false
  let rejectCallerAbort: ((failure: ProviderFailure) => void) | undefined
  const onCallerAbort = (): void => {
    attemptController.abort()
    rejectCallerAbort?.(new ProviderFailure('cancelled'))
  }

  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      timedOut = true
      attemptController.abort()
      reject(new ProviderFailure('timeout'))
    }, timeoutMs)
  })
  const callerAbort = new Promise<never>((_resolve, reject) => {
    rejectCallerAbort = reject
    if (options.signal.aborted) onCallerAbort()
    else options.signal.addEventListener('abort', onCallerAbort, { once: true })
  })

  try {
    const result = await Promise.race([
      Promise.resolve().then(() => options.run(role, timeoutMs, signal)),
      timeout,
      callerAbort,
    ])
    if (options.signal.aborted) throw new ProviderFailure('cancelled')
    if (now() >= deadline) throw new ProviderFailure('timeout')
    return result
  } catch (error) {
    if (options.signal.aborted) throw new ProviderFailure('cancelled')
    if (timedOut || now() >= deadline) throw new ProviderFailure('timeout')
    throw normalizeFailure(error)
  } finally {
    if (timer !== undefined) clearTimeout(timer)
    options.signal.removeEventListener('abort', onCallerAbort)
    attemptController.abort()
  }
}

function normalizeFailure(error: unknown): ProviderFailure {
  return error instanceof ProviderFailure ? error : new ProviderFailure('permanent')
}

function abortableDelay(milliseconds: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new ProviderFailure('cancelled'))
      return
    }
    const onAbort = (): void => {
      clearTimeout(timer)
      reject(new ProviderFailure('cancelled'))
    }
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve()
    }, milliseconds)
    signal.addEventListener('abort', onAbort, { once: true })
  })
}
