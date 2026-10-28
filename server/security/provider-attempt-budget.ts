export const DEFAULT_PROVIDER_ATTEMPT_LIMIT = 60

export class ProviderAttemptBudgetExhaustedError extends Error {
  constructor() {
    super('Provider attempt allowance is exhausted.')
    this.name = 'ProviderAttemptBudgetExhaustedError'
  }
}

export interface ProviderAttemptBudget {
  readonly limit: number
  readonly started: number
  readonly remaining: number
  readonly exhausted: boolean
  start<T>(invoke: () => Promise<T>): Promise<T>
}

export function createProviderAttemptBudget(limit = DEFAULT_PROVIDER_ATTEMPT_LIMIT): ProviderAttemptBudget {
  if (!Number.isSafeInteger(limit) || limit <= 0) throw new RangeError('Provider attempt allowance must be a positive safe integer.')
  let started = 0

  return Object.freeze({
    limit,
    get started() { return started },
    get remaining() { return limit - started },
    get exhausted() { return started >= limit },
    start<T>(invoke: () => Promise<T>): Promise<T> {
      if (started >= limit) throw new ProviderAttemptBudgetExhaustedError()
      started += 1
      try {
        return Promise.resolve(invoke())
      } catch (error) {
        return Promise.reject(error)
      }
    },
  })
}
