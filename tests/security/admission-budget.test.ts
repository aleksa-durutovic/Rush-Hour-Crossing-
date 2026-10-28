import { describe, expect, it } from 'vitest'
import { createProviderAttemptBudget } from '../../server/security/provider-attempt-budget'
import { createAdmissionController } from '../../server/security/admission'

describe('provider-attempt admission gate', () => {
  it('denies an empty budget after busy/rate checks and creates no lease or accepted timestamp', async () => {
    let now = 0
    const controller = createAdmissionController({ now: () => now, providerAttemptBudget: createProviderAttemptBudget(1) })
    const admitted = controller.tryAcquire('generation')
    expect(admitted.accepted).toBe(true)
    if (!admitted.accepted) return
    await admitted.lease.start('provider', async () => 'first')
    admitted.lease.markTerminal()

    const denied = controller.tryAcquire('advice')
    expect(denied).toEqual({ accepted: false, reason: 'budget_exhausted' })
    now = 60_000
    const stillDenied = controller.tryAcquire('advice')
    expect(stillDenied).toEqual({ accepted: false, reason: 'budget_exhausted' })
  })

  it('does not count or track a denied provider thunk, but still permits solver work', async () => {
    const controller = createAdmissionController({ providerAttemptBudget: createProviderAttemptBudget(1) })
    const admitted = controller.tryAcquire('generation')
    expect(admitted.accepted).toBe(true)
    if (!admitted.accepted) return
    await admitted.lease.start('provider', async () => undefined)
    const calls: string[] = []
    expect(() => admitted.lease.start('provider', async () => { calls.push('denied') })).toThrow()
    expect(admitted.lease.providerAttempts).toBe(1)
    expect(admitted.lease.pendingWork).toBe(0)
    await admitted.lease.start('solver', async () => { calls.push('solver') })
    admitted.lease.markTerminal()
    expect(calls).toEqual(['solver'])
    expect(admitted.lease.released).toBe(true)
  })

  it('charges a synchronous provider throw and drains/releases its lease exactly once', async () => {
    const budget = createProviderAttemptBudget(1)
    const controller = createAdmissionController({ providerAttemptBudget: budget })
    const admitted = controller.tryAcquire('advice')
    expect(admitted.accepted).toBe(true)
    if (!admitted.accepted) return
    const failed = admitted.lease.start('provider', () => { throw new Error('synthetic sync throw') })
    await expect(failed).rejects.toThrow('synthetic sync throw')
    admitted.lease.markTerminal()
    expect(admitted.lease.providerAttempts).toBe(1)
    expect(admitted.lease.pendingWork).toBe(0)
    expect(admitted.lease.released).toBe(true)
    expect(budget.started).toBe(1)
    expect(() => admitted.lease.start('provider', async () => undefined)).toThrow()
    expect(admitted.lease.providerAttempts).toBe(1)
  })

  it('keeps existing busy and rolling-rate denials ahead of empty-budget denial', async () => {
    let now = 0
    const budget = createProviderAttemptBudget(5)
    const controller = createAdmissionController({ now: () => now, providerAttemptBudget: budget })
    const operations = ['advice', 'generation', 'advice', 'generation', 'generation'] as const
    let finalLease: import('../../server/security/admission').AdmissionLease | undefined
    for (let index = 0; index < operations.length; index += 1) {
      now = index
      const result = controller.tryAcquire(operations[index]!)
      expect(result.accepted).toBe(true)
      if (!result.accepted) return
      await result.lease.start('provider', async () => undefined)
      if (index === operations.length - 1) finalLease = result.lease
      else result.lease.markTerminal()
    }
    expect(controller.tryAcquire('generation')).toMatchObject({ accepted: false, reason: 'busy' })
    finalLease?.markTerminal()
    now = operations.length
    expect(controller.tryAcquire('advice')).toMatchObject({ accepted: false, reason: 'rate_limited' })
    now = 60_000
    expect(controller.tryAcquire('advice')).toMatchObject({ accepted: false, reason: 'budget_exhausted' })
  })
})
