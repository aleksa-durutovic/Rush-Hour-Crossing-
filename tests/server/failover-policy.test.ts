import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  AI_FAILOVER_POLICY,
  createFailoverEvidenceRecorder,
  ProviderFailure,
  runEnabledProviderPhase,
  type FailoverEvidenceEvent,
  type ProviderRole,
} from '../../server/ai/failover-policy'

afterEach(() => vi.useRealTimers())

describe('enabled provider phase policy', () => {
  it('fixes the documented caps and shared phase', () => {
    expect(AI_FAILOVER_POLICY).toMatchObject({
      primaryTimeoutMs: 8_000,
      backupTimeoutMs: 7_000,
      phaseTimeoutMs: 15_000,
      backupRetryDelayMs: 250,
      maxEvidenceEvents: 32,
    })
  })

  it('emits bounded safe evidence without carrying model or caller content', async () => {
    const events: FailoverEvidenceEvent[] = []
    const recorder = createFailoverEvidenceRecorder('generation', event => events.push(event), () => 0)
    for (let attempt = 1; attempt <= 40; attempt += 1) {
      recorder({ event: 'attempt_started', role: 'primary', attempt })
    }
    expect(events).toHaveLength(32)
    expect(events[0]).toEqual({ operation: 'generation', event: 'attempt_started', role: 'primary', attempt: 1, providerAttemptCount: 1, elapsedMs: 0 })
    expect(JSON.stringify(events)).not.toMatch(/credential|prompt|summary|output|exception|secret/i)
  })

  it('switches immediately on quota exhaustion and counts only started attempts', async () => {
    const calls: { role: ProviderRole; timeoutMs: number }[] = []
    const started: ProviderRole[] = []
    const waits: number[] = []

    await expect(runEnabledProviderPhase({
      signal: new AbortController().signal,
      now: () => 0,
      run: async (role, timeoutMs) => {
        calls.push({ role, timeoutMs })
        if (role === 'primary') throw new ProviderFailure('rate_limit')
        return 'verified'
      },
      onAttemptStart: role => started.push(role),
      wait: async ms => { waits.push(ms) },
    })).resolves.toEqual('verified')

    expect(calls).toEqual([
      { role: 'primary', timeoutMs: 8_000 },
      { role: 'backup', timeoutMs: 7_000 },
    ])
    expect(started).toEqual(['primary', 'backup'])
    expect(waits).toEqual([])
  })

  it('aborts a timed-out primary, starts backup, and ignores a late primary settlement', async () => {
    vi.useFakeTimers()
    const latePrimary = vi.fn()
    const seen: { role: ProviderRole; timeoutMs: number; signal: AbortSignal }[] = []
    let primarySignal: AbortSignal | undefined
    const result = runEnabledProviderPhase({
      signal: new AbortController().signal,
      now: () => Date.now(),
      run: (role, timeoutMs, signal) => {
        seen.push({ role, timeoutMs, signal })
        if (role === 'primary') {
          primarySignal = signal
          return new Promise<string>(resolve => setTimeout(() => { latePrimary(); resolve('late') }, 20_000))
        }
        return Promise.resolve('backup-result')
      },
      onAttemptStart: () => undefined,
    })

    await vi.advanceTimersByTimeAsync(8_000)
    await expect(result).resolves.toBe('backup-result')
    expect(primarySignal?.aborted).toBe(true)
    await vi.advanceTimersByTimeAsync(12_000)
    expect(latePrimary).toHaveBeenCalledTimes(1)
    expect(seen.map(call => call.role)).toEqual(['primary', 'backup'])
  })

  it('ends after a hung primary and backup consume their 8s and 7s caps', async () => {
    vi.useFakeTimers()
    const attempts: { role: ProviderRole; timeoutMs: number; signal: AbortSignal }[] = []
    const result = runEnabledProviderPhase({
      signal: new AbortController().signal,
      now: () => Date.now(),
      run: (role, timeoutMs, signal) => {
        attempts.push({ role, timeoutMs, signal })
        return new Promise<never>(() => undefined)
      },
      onAttemptStart: () => undefined,
    })
    const rejected = expect(result).rejects.toMatchObject({ category: 'timeout' })
    await vi.advanceTimersByTimeAsync(15_000)
    await rejected
    expect(attempts.map(({ role, timeoutMs }) => [role, timeoutMs])).toEqual([
      ['primary', 8_000], ['backup', 7_000],
    ])
    expect(attempts.map(attempt => attempt.signal.aborted)).toEqual([true, true])
  })

  it('keeps backup-only retries inside the same phase and applies only the documented retry delay', async () => {
    const roles: ProviderRole[] = []
    const timeouts: number[] = []
    const waits: number[] = []
    let now = 1_000

    await expect(runEnabledProviderPhase({
      startingRole: 'backup',
      signal: new AbortController().signal,
      now: () => now,
      run: async (_role, timeoutMs) => {
        roles.push('backup')
        timeouts.push(timeoutMs)
        if (roles.length === 1) throw new ProviderFailure('temporary_unavailable')
        return 'ok'
      },
      onAttemptStart: () => undefined,
      wait: async ms => { waits.push(ms); now += ms },
    })).resolves.toBe('ok')

    expect(roles).toEqual(['backup', 'backup'])
    expect(timeouts).toEqual([7_000, 7_000])
    expect(waits).toEqual([250])
  })

  it('does not start backup after cancellation between primary failure and handoff', async () => {
    const controller = new AbortController()
    const roles: ProviderRole[] = []

    await expect(runEnabledProviderPhase({
      signal: controller.signal,
      now: () => 0,
      run: async role => {
        roles.push(role)
        controller.abort()
        throw new ProviderFailure('rate_limit')
      },
      onAttemptStart: () => undefined,
    })).rejects.toMatchObject({ category: 'cancelled' })
    expect(roles).toEqual(['primary'])
  })

  it('aborts active backup work and ignores its late settlement when cancelled', async () => {
    const controller = new AbortController()
    const roles: ProviderRole[] = []
    let backupSignal: AbortSignal | undefined
    let settleBackup: ((value: string) => void) | undefined
    let markBackupStarted: (() => void) | undefined
    const backupStarted = new Promise<void>(resolve => { markBackupStarted = resolve })
    const pending = runEnabledProviderPhase({
      signal: controller.signal,
      now: () => 0,
      run: (role, _timeoutMs, signal) => {
        roles.push(role)
        if (role === 'primary') throw new ProviderFailure('rate_limit')
        backupSignal = signal
        markBackupStarted?.()
        return new Promise<string>(resolve => { settleBackup = resolve })
      },
      onAttemptStart: () => undefined,
    })
    const rejected = expect(pending).rejects.toMatchObject({ category: 'cancelled' })
    await backupStarted
    controller.abort()
    await rejected
    expect(roles).toEqual(['primary', 'backup'])
    expect(backupSignal?.aborted).toBe(true)
    settleBackup?.('late')
  })

  it('does not make a second backup-only retry after cancellation during its delay', async () => {
    const controller = new AbortController()
    const roles: ProviderRole[] = []
    await expect(runEnabledProviderPhase({
      startingRole: 'backup',
      signal: controller.signal,
      now: () => 0,
      run: async role => {
        roles.push(role)
        throw new ProviderFailure('temporary_unavailable')
      },
      onAttemptStart: () => undefined,
      wait: async () => { controller.abort() },
    })).rejects.toMatchObject({ category: 'cancelled' })
    expect(roles).toEqual(['backup'])
  })

  it('never routes validation, refusal, configuration, permanent or output-limit failures to backup', async () => {
    for (const category of ['invalid_output', 'refusal', 'configuration', 'permanent', 'output_limit'] as const) {
      const roles: ProviderRole[] = []
      await expect(runEnabledProviderPhase({
        signal: new AbortController().signal,
        now: () => 0,
        run: async role => {
          roles.push(role)
          throw new ProviderFailure(category)
        },
        onAttemptStart: () => undefined,
      })).rejects.toMatchObject({ category })
      expect(roles).toEqual(['primary'])
    }
  })

  it('treats an outcome at the clipped deadline as late', async () => {
    vi.useFakeTimers()
    const roles: ProviderRole[] = []
    const result = runEnabledProviderPhase({
      signal: new AbortController().signal,
      now: () => Date.now(),
      run: async role => {
        roles.push(role)
        if (role === 'primary') {
          await new Promise(resolve => setTimeout(resolve, 8_000))
          return 'at-deadline'
        }
        return 'backup'
      },
      onAttemptStart: () => undefined,
    })
    await vi.advanceTimersByTimeAsync(8_000)
    await expect(result).resolves.toBe('backup')
    expect(roles).toEqual(['primary', 'backup'])
  })

  it('clips attempts to the remaining outer deadline and starts none at the cutoff', async () => {
    const calls: { role: ProviderRole; timeoutMs: number }[] = []
    await expect(runEnabledProviderPhase({
      signal: new AbortController().signal,
      now: () => 0,
      outerDeadline: 1_500,
      run: async (role, timeoutMs) => {
        calls.push({ role, timeoutMs })
        if (role === 'primary') throw new ProviderFailure('rate_limit')
        return 'ok'
      },
      onAttemptStart: () => undefined,
    })).resolves.toBe('ok')
    expect(calls).toEqual([
      { role: 'primary', timeoutMs: 1_500 },
      { role: 'backup', timeoutMs: 1_500 },
    ])

    await expect(runEnabledProviderPhase({
      signal: new AbortController().signal,
      now: () => 1_500,
      outerDeadline: 1_500,
      run: vi.fn(),
      onAttemptStart: () => undefined,
    })).rejects.toMatchObject({ category: 'timeout' })
  })
})
