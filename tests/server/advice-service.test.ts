import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ADVICE_ATTEMPT_TIMEOUT_MS,
  AdviceServiceError,
  createAdviceService,
  TransientProviderError,
  type AdviceProvider,
} from '../../server/advice/service'
import type { CompletedRunSummary } from '../../shared/advice-contract'
import { ProviderFailure, type FailoverEvidenceEvent } from '../../server/ai/failover-policy'

const summary: CompletedRunSummary = {
  outcome: 'lost',
  difficulty: 'easy',
  ticks: 18,
  crossings: 0,
  targetCrossings: 3,
  startingLives: 3,
  remainingLives: 0,
  score: 0,
}

const validTip = { nextTip: 'Wait at a safe row until a vehicle passes.' }

function provider() {
  return { generateTip: vi.fn<AdviceProvider['generateTip']>() }
}

afterEach(() => vi.useRealTimers())

describe('bounded advice service', () => {
  it('derives focus and evidence and accepts only the validated tip field', async () => {
    const fake = provider()
    fake.generateTip.mockResolvedValue(validTip)

    const result = await createAdviceService(fake).analyze(summary, new AbortController().signal)

    expect(result).toEqual({
      focus: 'survival',
      evidence: expect.stringContaining('3 lives'),
      nextTip: validTip.nextTip,
    })
    expect(fake.generateTip).toHaveBeenCalledTimes(1)
    expect(fake.generateTip).toHaveBeenCalledWith(
      expect.objectContaining({ summary, focus: 'survival', evidence: expect.any(String) }),
      expect.any(AbortSignal),
      { timeoutMs: ADVICE_ATTEMPT_TIMEOUT_MS },
    )
    expect(Object.keys(fake.generateTip.mock.calls[0][0]).sort()).toEqual(['evidence', 'focus', 'summary'])
    expect(Object.keys(fake.generateTip.mock.calls[0][0].summary).sort()).toEqual([
      'crossings',
      'difficulty',
      'outcome',
      'remainingLives',
      'score',
      'startingLives',
      'targetCrossings',
      'ticks',
    ])
  })

  it('passes generated as one of the same eight summary fields to delayed coaching', async () => {
    const generated = { ...summary, difficulty: 'generated' } as CompletedRunSummary
    const fake = provider()
    fake.generateTip.mockResolvedValue(validTip)

    await expect(createAdviceService(fake).analyze(generated, new AbortController().signal)).resolves.toMatchObject({
      focus: 'survival',
      nextTip: validTip.nextTip,
    })
    const receivedSummary = fake.generateTip.mock.calls[0]?.[0].summary
    expect(receivedSummary).toEqual(generated)
    expect(Object.keys(receivedSummary ?? {}).sort()).toEqual([
      'crossings', 'difficulty', 'outcome', 'remainingLives', 'score', 'startingLives', 'targetCrossings', 'ticks',
    ])
  })

  it.each([
    [
      { ...summary, crossings: 1, score: 100 },
      'goal_progress',
    ],
    [
      { ...summary, outcome: 'won' as const, crossings: 1, targetCrossings: 1, remainingLives: 2, score: 100 },
      'general',
    ],
  ] as const)('uses the selected category for a partial loss or win', async (run, focus) => {
    const fake = provider()
    fake.generateTip.mockResolvedValue(validTip)

    await expect(createAdviceService(fake).analyze(run, new AbortController().signal)).resolves.toMatchObject({ focus })
  })

  it('retries a transient provider error once and then returns a valid response', async () => {
    const fake = provider()
    fake.generateTip.mockRejectedValueOnce(new TransientProviderError('temporary'))
    fake.generateTip.mockResolvedValueOnce(validTip)

    await expect(createAdviceService(fake).analyze(summary, new AbortController().signal)).resolves.toMatchObject({
      focus: 'survival',
      nextTip: validTip.nextTip,
    })
    expect(fake.generateTip).toHaveBeenCalledTimes(2)
  })

  it('stops after two transient failures and returns a safe service error', async () => {
    vi.useFakeTimers()
    const fake = provider()
    fake.generateTip.mockRejectedValue(new TransientProviderError('temporary'))

    const pending = createAdviceService(fake).analyze(summary, new AbortController().signal)
    const rejected = expect(pending).rejects.toMatchObject({ code: 'ADVICE_UNAVAILABLE' })
    await vi.advanceTimersByTimeAsync(250)

    await rejected
    expect(fake.generateTip).toHaveBeenCalledTimes(2)
  })

  it.each([
    {},
    { nextTip: '' },
    { nextTip: 'x'.repeat(161) },
    { nextTip: validTip.nextTip, debug: 'not allowed' },
  ])('does not retry malformed structured output', async (output) => {
    const fake = provider()
    fake.generateTip.mockResolvedValue(output)

    await expect(createAdviceService(fake).analyze(summary, new AbortController().signal)).rejects.toMatchObject({
      code: 'ADVICE_UNAVAILABLE',
    })
    expect(fake.generateTip).toHaveBeenCalledTimes(1)
  })

  it('does not retry a permanent provider failure or expose its detail', async () => {
    const fake = provider()
    fake.generateTip.mockRejectedValue(new Error('private provider response'))

    const error = await createAdviceService(fake)
      .analyze(summary, new AbortController().signal)
      .catch((reason: unknown) => reason as AdviceServiceError)

    expect(error).toMatchObject({ code: 'ADVICE_UNAVAILABLE' })
    expect(String(error)).not.toContain('private provider response')
    expect(fake.generateTip).toHaveBeenCalledTimes(1)
  })

  it('aborts each attempt at 15 seconds and never exceeds two attempts', async () => {
    vi.useFakeTimers()
    const fake = provider()
    const signals: AbortSignal[] = []
    fake.generateTip.mockImplementation((_input, signal: AbortSignal) => {
      signals.push(signal)
      return new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true })
      })
    })

    const pending = createAdviceService(fake).analyze(summary, new AbortController().signal)
    const rejected = expect(pending).rejects.toMatchObject({ code: 'ADVICE_UNAVAILABLE' })
    await vi.advanceTimersByTimeAsync(ADVICE_ATTEMPT_TIMEOUT_MS * 2 + 250)

    await rejected
    expect(ADVICE_ATTEMPT_TIMEOUT_MS).toBe(15_000)
    expect(fake.generateTip).toHaveBeenCalledTimes(2)
    expect(signals.every((signal) => signal.aborted)).toBe(true)
  })

  it('does not make a retry after the caller aborts a superseded job', async () => {
    const fake = provider()
    const controller = new AbortController()
    fake.generateTip.mockImplementation((_input, signal: AbortSignal) => new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true })
    }))

    const pending = createAdviceService(fake).analyze(summary, controller.signal)
    await Promise.resolve()
    controller.abort()

    await expect(pending).rejects.toMatchObject({ code: 'ADVICE_UNAVAILABLE' })
    expect(fake.generateTip).toHaveBeenCalledTimes(1)
  })

  it('switches once to the backup within the shared phase and preserves the exact validated input', async () => {
    const primary = provider()
    const backup = provider()
    primary.generateTip.mockRejectedValue(new ProviderFailure('rate_limit'))
    backup.generateTip.mockResolvedValue(validTip)

    const result = await createAdviceService(primary, {
      enabled: true,
      backupProvider: backup,
    }).analyze(summary, new AbortController().signal)

    expect(result).toEqual({
      focus: 'survival',
      evidence: 'You lost all 3 lives before completing a crossing.',
      nextTip: validTip.nextTip,
    })
    expect(primary.generateTip).toHaveBeenCalledOnce()
    expect(backup.generateTip).toHaveBeenCalledOnce()
    expect(backup.generateTip).toHaveBeenCalledWith(
      expect.objectContaining({ summary, focus: 'survival', evidence: expect.any(String) }),
      expect.any(AbortSignal),
      expect.objectContaining({ timeoutMs: 7_000 }),
    )
    expect(Object.keys(result).sort()).toEqual(['evidence', 'focus', 'nextTip'])
  })

  it('does not use backup for invalid provider output or cancellation between roles', async () => {
    const primary = provider()
    const backup = provider()
    primary.generateTip.mockResolvedValue({ nextTip: '', extra: 'invalid' })
    await expect(createAdviceService(primary, { enabled: true, backupProvider: backup })
      .analyze(summary, new AbortController().signal)).rejects.toMatchObject({ code: 'ADVICE_UNAVAILABLE' })
    expect(backup.generateTip).not.toHaveBeenCalled()

    const controller = new AbortController()
    primary.generateTip.mockImplementationOnce(async () => {
      controller.abort()
      throw new ProviderFailure('rate_limit')
    })
    await expect(createAdviceService(primary, { enabled: true, backupProvider: backup })
      .analyze(summary, controller.signal)).rejects.toMatchObject({ code: 'ADVICE_UNAVAILABLE' })
    expect(backup.generateTip).not.toHaveBeenCalled()
  })

  it('caps a hanging primary and backup together at the shared 15-second advice phase', async () => {
    vi.useFakeTimers()
    const primary = provider()
    const backup = provider()
    primary.generateTip.mockImplementation(() => new Promise<never>(() => undefined))
    backup.generateTip.mockImplementation(() => new Promise<never>(() => undefined))
    const controller = new AbortController()
    const pending = createAdviceService(primary, { enabled: true, backupProvider: backup, now: () => Date.now() })
      .analyze(summary, controller.signal)
    const rejected = expect(pending).rejects.toMatchObject({ code: 'ADVICE_UNAVAILABLE' })
    await vi.advanceTimersByTimeAsync(15_000)
    await rejected
    expect(primary.generateTip).toHaveBeenCalledOnce()
    expect(backup.generateTip).toHaveBeenCalledOnce()
    expect(primary.generateTip.mock.calls[0]?.[2]).toEqual({ timeoutMs: 8_000 })
    expect(backup.generateTip.mock.calls[0]?.[2]).toEqual({ timeoutMs: 7_000 })
  })

  it('records a safe terminal unavailable event after both advice providers fail', async () => {
    const primary = provider()
    const backup = provider()
    primary.generateTip.mockRejectedValue(new ProviderFailure('rate_limit'))
    backup.generateTip.mockRejectedValue(new ProviderFailure('temporary_unavailable'))
    const events: FailoverEvidenceEvent[] = []
    await expect(createAdviceService(primary, {
      enabled: true,
      backupProvider: backup,
      onEvidence: event => events.push(event),
    }).analyze(summary, new AbortController().signal)).rejects.toMatchObject({ code: 'ADVICE_UNAVAILABLE' })
    expect(events).toContainEqual(expect.objectContaining({
      operation: 'advice', event: 'operation_unavailable', status: 'unavailable', providerAttemptCount: 2,
    }))
    expect(JSON.stringify(events)).not.toMatch(/private|prompt|summary|tip|secret|exception/i)
  })
})
