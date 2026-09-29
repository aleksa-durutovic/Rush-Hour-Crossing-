import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ADVICE_ATTEMPT_TIMEOUT_MS,
  AdviceServiceError,
  createAdviceService,
  TransientProviderError,
  type AdviceProvider,
} from '../../server/advice/service'
import type { CompletedRunSummary } from '../../shared/advice-contract'

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
})
