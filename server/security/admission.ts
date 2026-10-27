import { randomUUID } from 'node:crypto'
import { createActiveWorkTracker, type ActiveWorkKind } from './active-work'

export type AiOperation = 'generation' | 'advice'
export type AdmissionDenialReason = 'busy' | 'rate_limited'

export interface AdmissionLease {
  readonly correlationId: string
  readonly operation: AiOperation
  readonly acquiredAt: number
  readonly released: boolean
  readonly pendingWork: number
  readonly providerAttempts: number
  readonly executedToolCalls: number
  readonly isLogicalTerminal: boolean
  start<T>(kind: ActiveWorkKind, start: () => Promise<T>): Promise<T>
  markTerminal(): void
}

export type AdmissionResult =
  | { accepted: true; lease: AdmissionLease }
  | { accepted: false; reason: AdmissionDenialReason; retryAfterSeconds?: number }

export interface AdmissionController {
  tryAcquire(operation: AiOperation): AdmissionResult
}

export interface AdmissionControllerOptions {
  now?: () => number
  createCorrelationId?: () => string
}

const MAX_GENERATION = 1
const MAX_ADVICE = 1
const MAX_COMBINED = 2
const MAX_ADMISSIONS = 5
const WINDOW_MS = 60_000

export function createAdmissionController(options: AdmissionControllerOptions = {}): AdmissionController {
  const now = options.now ?? (() => performance.now())
  const createCorrelationId = options.createCorrelationId ?? randomUUID
  const active = new Set<AdmissionLease>()
  const acceptedTimes: number[] = []
  let lastTime = Number.NEGATIVE_INFINITY

  return {
    tryAcquire(operation) {
      const sampledTime = now()
      if (!Number.isFinite(sampledTime) || sampledTime < lastTime) {
        throw new Error('Admission clock must be finite and monotonic.')
      }
      lastTime = sampledTime
      while (acceptedTimes.length > 0 && acceptedTimes[0]! <= sampledTime - WINDOW_MS) acceptedTimes.shift()

      const generationCount = countOperation(active, 'generation')
      const adviceCount = countOperation(active, 'advice')
      if (active.size >= MAX_COMBINED ||
        (operation === 'generation' && generationCount >= MAX_GENERATION) ||
        (operation === 'advice' && adviceCount >= MAX_ADVICE)) {
        return { accepted: false, reason: 'busy' }
      }
      if (acceptedTimes.length >= MAX_ADMISSIONS) {
        const earliestExpiry = acceptedTimes[0]! + WINDOW_MS
        return {
          accepted: false,
          reason: 'rate_limited',
          retryAfterSeconds: Math.max(1, Math.ceil((earliestExpiry - sampledTime) / 1_000)),
        }
      }

      let lease: AdmissionLease
      let providerAttempts = 0
      let executedToolCalls = 0
      const work = createActiveWorkTracker(() => active.delete(lease))
      lease = {
        correlationId: createCorrelationId(),
        operation,
        acquiredAt: sampledTime,
        get released() { return work.isReleased },
        get pendingWork() { return work.pendingWork },
        get providerAttempts() { return providerAttempts },
        get executedToolCalls() { return executedToolCalls },
        get isLogicalTerminal() { return work.isLogicalTerminal },
        start<T>(kind: ActiveWorkKind, start: () => Promise<T>): Promise<T> {
          if (work.isLogicalTerminal) throw new Error('Cannot start work after the job is terminal.')
          if (kind === 'provider') providerAttempts += 1
          else executedToolCalls += 1
          return work.track(start())
        },
        markTerminal: () => work.markLogicalTerminal(),
      }
      active.add(lease)
      acceptedTimes.push(sampledTime)
      return { accepted: true, lease }
    },
  }
}

function countOperation(active: ReadonlySet<AdmissionLease>, operation: AiOperation): number {
  let count = 0
  for (const lease of active) if (lease.operation === operation) count += 1
  return count
}