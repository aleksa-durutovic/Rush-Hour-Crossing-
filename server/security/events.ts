import { randomUUID } from 'node:crypto'
import type { AiOperation } from './admission'

export const SECURITY_EVENT_NAMES = ['request_allowed', 'request_denied', 'tool_denied', 'run_finished'] as const
export type SecurityEventName = (typeof SECURITY_EVENT_NAMES)[number]
export type SecurityOutcome = 'allowed' | 'denied' | 'completed' | 'failed' | 'cancelled'
export const SECURITY_REASON_CODES = [
  'ALLOWED', 'INVALID_REQUEST', 'REQUEST_TOO_LARGE', 'FORBIDDEN_HOST', 'FORBIDDEN_ORIGIN',
  'METHOD_NOT_ALLOWED', 'UNSUPPORTED_MEDIA_TYPE', 'SERVICE_UNAVAILABLE', 'BUSY', 'RATE_LIMITED',
  'TOOL_NOT_ALLOWED', 'INVALID_TOOL_ARGUMENTS', 'INVALID_TOOL_RESULT', 'INVALID_FINAL_SELECTION',
  'PROVIDER_UNAVAILABLE', 'DEADLINE', 'CANCELLED', 'COMPLETED', 'INTERNAL_ERROR',
] as const
export type SecurityReasonCode = (typeof SECURITY_REASON_CODES)[number]

export interface SecurityEvent {
  event: SecurityEventName
  timestamp: string
  correlationId: string
  operation: AiOperation
  outcome: SecurityOutcome
  reasonCode: SecurityReasonCode
  providerAttempts: number
  executedToolCalls: number
}

export interface SecurityEventJob {
  readonly correlationId: string
  readonly operation: AiOperation
  record(
    event: SecurityEventName,
    outcome: SecurityOutcome,
    reasonCode: SecurityReasonCode,
    providerAttempts: number,
    executedToolCalls: number,
  ): SecurityEvent | null
}

export interface SecurityEventStore {
  createCorrelationId(): string
  createJob(operation: AiOperation, correlationId?: string): SecurityEventJob
  snapshot(): readonly SecurityEvent[]
}

export interface SecurityEventStoreOptions {
  now?: () => Date
  createCorrelationId?: () => string
  onEvent?: (event: SecurityEvent) => void
}

export const MAX_SECURITY_EVENTS = 128
export const MAX_SECURITY_EVENTS_PER_JOB = 32

export function createSecurityEventStore(options: SecurityEventStoreOptions = {}): SecurityEventStore {
  const now = options.now ?? (() => new Date())
  const createId = options.createCorrelationId ?? randomUUID
  const events: SecurityEvent[] = []

  return {
    createCorrelationId() {
      return safeCorrelationId(createId()) ?? randomUUID()
    },
    createJob(operation, suppliedCorrelationId) {
      const correlationId = safeCorrelationId(suppliedCorrelationId) ?? safeCorrelationId(createId()) ?? randomUUID()
      let recorded = 0
      return {
        correlationId,
        operation,
        record(event, outcome, reasonCode, providerAttempts, executedToolCalls) {
          if (recorded >= MAX_SECURITY_EVENTS_PER_JOB ||
            !SECURITY_EVENT_NAMES.includes(event) || !isOutcome(outcome) ||
            !SECURITY_REASON_CODES.includes(reasonCode) ||
            !isBoundedCounter(providerAttempts, 6) || !isBoundedCounter(executedToolCalls, 8)) return null
          const date = now()
          if (!(date instanceof Date) || !Number.isFinite(date.getTime())) return null
          const safeEvent: SecurityEvent = Object.freeze({
            event,
            timestamp: date.toISOString(),
            correlationId,
            operation,
            outcome,
            reasonCode,
            providerAttempts,
            executedToolCalls,
          })
          recorded += 1
          events.push(safeEvent)
          if (events.length > MAX_SECURITY_EVENTS) events.shift()
          try {
            options.onEvent?.(safeEvent)
          } catch {
            // Diagnostic sinks cannot change admission or gameplay behavior.
          }
          return safeEvent
        },
      }
    },
    snapshot() {
      return events.slice()
    },
  }
}

function safeCorrelationId(value: unknown): string | null {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(value) ? value : null
}

function isOutcome(value: unknown): value is SecurityOutcome {
  return value === 'allowed' || value === 'denied' || value === 'completed' || value === 'failed' || value === 'cancelled'
}

function isBoundedCounter(value: unknown, maximum: number): value is number {
  return Number.isInteger(value) && typeof value === 'number' && value >= 0 && value <= maximum
}