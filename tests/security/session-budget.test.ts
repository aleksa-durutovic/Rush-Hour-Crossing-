import { afterEach, describe, expect, it } from 'vitest'
import { startW08Server, type W08ServerFixture } from '../server/fixtures/w08-server'
import { validAdviceSummary, validGenerationRequest } from './fixtures'

describe('B00 cumulative provider-start baseline', () => {
  let fixture: W08ServerFixture | undefined

  afterEach(async () => {
    await fixture?.close()
    fixture = undefined
  })

  it('caps actual generation and advice starts at 60 across rolling-minute boundaries', async () => {
    let now = 0
    fixture = await startW08Server({ now: () => now })
    const statuses: number[] = []

    for (let cycle = 0; cycle < 21; cycle += 1) {
      now += 60_001
      const generation = await post(fixture, 'generation')
      statuses.push(generation.status)
      await generation.arrayBuffer()

      now += 60_001
      const advice = await post(fixture, 'advice')
      statuses.push(advice.status)
      await advice.arrayBuffer()
    }

    const starts = fixture.sdkCalls.length
    expect(starts).toBe(60)
    expect(statuses.slice(0, 40).every((status) => status === 200)).toBe(true)
    expect(statuses.slice(40).every((status) => status === 503)).toBe(true)
    expect(fixture.solverStarts).toHaveLength(40)
  })

  it('uses a safe initial 503 when empty while keeping mid-run verified recovery', async () => {
    fixture = await startW08Server({ providerAttemptLimit: 1 })
    const generation = await post(fixture, 'generation')
    const generated = await generation.json() as Record<string, unknown>
    expect(generation.status).toBe(200)
    expect(generated).toMatchObject({ kind: 'preview', source: 'last_verified', completed: false, stopReason: 'provider_attempt_limit' })
    expect((generated.counters as { providerAttemptCount: number }).providerAttemptCount).toBe(1)
    expect(fixture.sdkCalls).toHaveLength(1)
    expect(fixture.solverStarts).toHaveLength(1)

    const advice = await post(fixture, 'advice')
    expect(advice.status).toBe(503)
    expect(await advice.json()).toEqual({ error: 'ADVICE_UNAVAILABLE' })
    expect(advice.headers.has('retry-after')).toBe(false)
    expect(fixture.sdkCalls).toHaveLength(1)
    expect(fixture.solverStarts).toHaveLength(1)
    expect(fixture.securityEvents.at(-1)).toMatchObject({ event: 'request_denied', reasonCode: 'PROVIDER_UNAVAILABLE', providerAttempts: 0, executedToolCalls: 0 })
  })

  it('shares a small allowance across one completed generation and delayed advice', async () => {
    fixture = await startW08Server({ providerAttemptLimit: 3 })
    const generation = await post(fixture, 'generation')
    expect(generation.status).toBe(200)
    expect(await generation.json()).toMatchObject({ kind: 'preview', completed: true, counters: { providerAttemptCount: 2 } })
    expect(fixture.solverStarts).toHaveLength(2)

    const advice = await post(fixture, 'advice')
    expect(advice.status).toBe(200)
    expect(await advice.json()).toMatchObject({ nextTip: 'Wait for a clear gap.' })
    expect(fixture.sdkCalls).toHaveLength(3)

    const denied = await post(fixture, 'generation')
    expect(denied.status).toBe(503)
    expect(await denied.json()).toEqual({ error: 'GENERATION_UNAVAILABLE' })
    expect(fixture.sdkCalls).toHaveLength(3)
    expect(fixture.solverStarts).toHaveLength(2)
  })
})

async function post(fixture: W08ServerFixture, operation: 'generation' | 'advice'): Promise<Response> {
  return fetch(`${fixture.origin}/api/${operation === 'generation' ? 'levels/generate' : 'advice'}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(operation === 'generation' ? validGenerationRequest : validAdviceSummary),
  })
}
