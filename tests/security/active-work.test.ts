import { describe, expect, it, vi } from 'vitest'
import { runEnabledProviderPhase } from '../../server/ai/failover-policy'
import { createActiveWorkTracker } from '../../server/security/active-work'
import { createAdviceService } from '../../server/advice/service'
import { createLevelGeneratorService } from '../../server/level-generator/service'
import { normalGeneratorDecision, validGenerationRequest } from './fixtures'
import { validAdviceSummary } from './fixtures'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

describe('T16 active and draining work lifetime', () => {
  it('keeps an unresolved provider promise draining after logical completion and releases exactly once when it settles', async () => {
    const onReleased = vi.fn()
    const work = createActiveWorkTracker(onReleased)
    const late = deferred<string>()
    const tracked = work.track(late.promise)
    work.markLogicalTerminal()

    expect(work.pendingWork).toBe(1)
    expect(work.isLogicalTerminal).toBe(true)
    expect(work.isReleased).toBe(false)
    expect(onReleased).not.toHaveBeenCalled()

    late.resolve('arrived after the response')
    await expect(tracked).resolves.toBe('arrived after the response')
    await Promise.resolve()
    expect(work.pendingWork).toBe(0)
    expect(work.isReleased).toBe(true)
    expect(onReleased).toHaveBeenCalledTimes(1)
    work.markLogicalTerminal()
    expect(onReleased).toHaveBeenCalledTimes(1)
  })

  it('releases immediately and once when provider invocation throws synchronously before a promise exists', () => {
    const onReleased = vi.fn()
    const work = createActiveWorkTracker(onReleased)
    const provider = () => { throw new Error('synthetic sync failure') }
    expect(() => provider()).toThrow('synthetic sync failure')
    work.markLogicalTerminal()
    expect(work.pendingWork).toBe(0)
    expect(work.isReleased).toBe(true)
    expect(onReleased).toHaveBeenCalledTimes(1)
  })

  it('tracks each actual generator model and solver promise before the service returns', async () => {
    const work = createActiveWorkTracker()
    const kinds: string[] = []
    let decision = 0
    const service = createLevelGeneratorService({
      model: { decide: async (context) => normalGeneratorDecision(context, decision++) },
    })
    const result = await service.generate(validGenerationRequest, new AbortController().signal, (kind, start) => {
      kinds.push(kind)
      return work.track(start())
    })

    expect(result).toMatchObject({ kind: 'preview', verified: true, counters: { providerAttemptCount: 2, toolCallCount: 2 } })
    expect(kinds).toEqual(['provider', 'solver', 'provider', 'solver'])
    expect(work.pendingWork).toBe(0)
    work.markLogicalTerminal()
    expect(work.isReleased).toBe(true)
  })
  it('tracks the real advice service primary promise before timeout and backup', async () => {
    vi.useFakeTimers()
    try {
      const onReleased = vi.fn()
      const work = createActiveWorkTracker(onReleased)
      const primary = deferred<unknown>()
      const primaryProvider = { generateTip: () => primary.promise }
      const backupProvider = { generateTip: async () => ({ nextTip: 'Wait for a clear gap.' }) }
      const service = createAdviceService(primaryProvider, {
        enabled: true,
        backupProvider,
        now: () => performance.now(),
        wait: async () => {},
      })
      const analyze = service.analyze as unknown as (
        summary: unknown,
        signal: AbortSignal,
        trackWork: <T>(kind: 'provider' | 'solver', start: () => Promise<T>) => Promise<T>,
      ) => Promise<unknown>
      const response = analyze(validAdviceSummary, new AbortController().signal, (kind, start) => { void kind; return work.track(start()) })
      const completed = expect(response).resolves.toMatchObject({ nextTip: 'Wait for a clear gap.' })
      await vi.advanceTimersByTimeAsync(8_000)
      await completed
      work.markLogicalTerminal()

      expect(work.pendingWork).toBe(1)
      expect(work.isReleased).toBe(false)
      primary.resolve({ nextTip: 'late primary' })
      await primary.promise
      await Promise.resolve()
      expect(work.pendingWork).toBe(0)
      expect(onReleased).toHaveBeenCalledTimes(1)
    } finally {
      vi.useRealTimers()
    }
  })
  it('routes to a timely backup without awaiting an abort-ignoring primary settlement', async () => {
    vi.useFakeTimers()
    try {
      const onReleased = vi.fn()
      const work = createActiveWorkTracker(onReleased)
      const primary = deferred<string>()
      const roles: string[] = []
      const phase = runEnabledProviderPhase({
        signal: new AbortController().signal,
        now: () => Date.now(),
        wait: async () => {},
        onAttemptStart: (role) => roles.push(role),
        run: (role) => {
          const pending = role === 'primary' ? primary.promise : Promise.resolve('backup result')
          return work.track(pending)
        },
      })

      const settled = expect(phase).resolves.toBe('backup result')
      await vi.advanceTimersByTimeAsync(8_000)
      await settled
      work.markLogicalTerminal()
      expect(roles).toEqual(['primary', 'backup'])
      expect(work.pendingWork).toBe(1)
      expect(work.isReleased).toBe(false)
      expect(onReleased).not.toHaveBeenCalled()

      primary.resolve('late primary result')
      await primary.promise
      await Promise.resolve()
      expect(work.pendingWork).toBe(0)
      expect(work.isReleased).toBe(true)
      expect(onReleased).toHaveBeenCalledTimes(1)
    } finally {
      vi.useRealTimers()
    }
  })
})