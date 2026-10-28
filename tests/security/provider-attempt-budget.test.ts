import { describe, expect, it, vi } from 'vitest'
import {
  createProviderAttemptBudget,
  ProviderAttemptBudgetExhaustedError,
} from '../../server/security/provider-attempt-budget'

describe('process provider-attempt budget', () => {
  it('validates a finite positive safe integer limit and does not refill with time', () => {
    for (const limit of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1]) {
      expect(() => createProviderAttemptBudget(limit)).toThrow(RangeError)
    }

    const budget = createProviderAttemptBudget(1)
    expect(Object.isFrozen(budget)).toBe(true)
    expect(budget.remaining).toBe(1)
    vi.setSystemTime(new Date('2030-01-01T00:00:00Z'))
    budget.start(() => Promise.resolve('started'))
    expect(budget.started).toBe(1)
    expect(budget.remaining).toBe(0)
    expect(budget.exhausted).toBe(true)
  })

  it('authorizes only one racing final-token start and never calls a denied thunk', async () => {
    const budget = createProviderAttemptBudget(1)
    const first = vi.fn(() => Promise.resolve('winner'))
    const denied = vi.fn(() => Promise.resolve('loser'))

    const winner = budget.start(first)
    expect(() => budget.start(denied)).toThrow(ProviderAttemptBudgetExhaustedError)
    await expect(winner).resolves.toBe('winner')
    expect(first).toHaveBeenCalledOnce()
    expect(denied).not.toHaveBeenCalled()
    expect(budget.started).toBe(1)
  })

  it('charges a synchronous invocation throw exactly once', async () => {
    const budget = createProviderAttemptBudget(1)
    const start = vi.fn((): Promise<never> => { throw new Error('synthetic sync failure') })
    await expect(budget.start(start)).rejects.toThrow('synthetic sync failure')
    expect(budget.started).toBe(1)
    expect(() => budget.start(vi.fn())).toThrow(ProviderAttemptBudgetExhaustedError)
  })
})
