import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { startW08Server, type W08ServerFixture } from '../server/fixtures/w08-server'
import { maliciousForeignFinalDecision, normalGeneratorDecision, validGenerationRequest } from './fixtures'

let fixture: W08ServerFixture

beforeEach(async () => {
  fixture = await startW08Server()
})

afterEach(async () => {
  await fixture.close()
})

describe('T00 actual generated flow', () => {
  it('uses two model decisions, the real solver, independent final verification, and returns only a verified preview', async () => {
    const response = await postGeneration(fixture, validGenerationRequest)
    const result: unknown = await response.json()

    expect(response.status).toBe(200)
    expect(result).toMatchObject({
      status: 'completed',
      stopReason: 'goal_completed',
      completed: true,
      kind: 'preview',
      verified: true,
      settings: { lives: 3, crossingsToWin: 1 },
      counters: { stepCount: 2, providerAttemptCount: 2, modelToolCallCount: 1, toolCallCount: 2 },
    })
    expect(fixture.sdkCalls.filter((call) => call.operation === 'generation')).toHaveLength(2)
    expect(fixture.solverStarts).toHaveLength(2)
    expect(fixture.securityEvents.map((event) => event.event)).toEqual(['request_allowed', 'run_finished'])
    expect(fixture.securityEvents[0]).toMatchObject({ providerAttempts: 0, executedToolCalls: 0 })
    expect(fixture.securityEvents[1]).toMatchObject({
      outcome: 'completed', reasonCode: 'COMPLETED', providerAttempts: 2, executedToolCalls: 2,
    })

    const modelContexts = fixture.modelContexts.filter(isGeneratorContext)
    expect(modelContexts).toHaveLength(2)
    expect(modelContexts[0]?.evaluations).toEqual([])
    expect(modelContexts[1]?.evaluations).toHaveLength(1)
    expect(modelContexts[1]?.evaluations[0]).toMatchObject({ outcome: 'solved', candidateId: 'c1', evaluationId: 'e1' })
    expect(modelContexts[1]?.evaluations[0]).not.toHaveProperty('winningActions')
    expect(modelContexts[1]?.candidates).toHaveLength(1)
  })
})

describe('T17 foreign final after real evidence', () => {
  it('does not verify, return or make playable a foreign final selection with injected summary text', async () => {
    await fixture.close()
    fixture = await startW08Server({ decide: maliciousForeignFinalDecision })
    const response = await postGeneration(fixture, validGenerationRequest)
    const body = await response.text()
    const result = JSON.parse(body) as Record<string, unknown>

    expect(response.status).toBe(200)
    expect(result).toMatchObject({ status: 'failed', kind: 'unavailable', stopReason: 'invalid_final_selection' })
    expect(result).not.toHaveProperty('lanes')
    expect(result).not.toHaveProperty('settings')
    expect(body).not.toContain('<img')
    expect(body).not.toContain('onerror')
    expect(fixture.sdkCalls.filter((call) => call.operation === 'generation')).toHaveLength(2)
    expect(fixture.solverStarts).toHaveLength(1)
  })
})
describe('T03 local resource and evidence scope', () => {
  it('returns an unknown API resource without provider or tool work', async () => {
    const response = await fetch(`${fixture.origin}/api/private-resources/another-run`, { method: 'GET' })
    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ error: 'NOT_FOUND' })
    expect(fixture.sdkCalls).toHaveLength(0)
    expect(fixture.solverStarts).toHaveLength(0)
  })

  it('rejects valid-shaped foreign-run final references before independent verification', async () => {
    await fixture.close()
    fixture = await startW08Server({ decide: (context, index) => {
      if (context.counters.stepCount === 1 && index === 0) return normalGeneratorDecision(context, index)
      return {
        kind: 'final',
        candidateId: 'c-foreign-run-2',
        evaluationId: 'e-foreign-run-2',
        summary: 'A foreign evidence reference.',
      }
    } })
    const response = await postGeneration(fixture, validGenerationRequest)
    const result = await response.json() as Record<string, unknown>

    expect(response.status).toBe(200)
    expect(result).toMatchObject({ status: 'failed', kind: 'unavailable', stopReason: 'invalid_final_selection' })
    expect(result).not.toHaveProperty('lanes')
    expect(result).not.toHaveProperty('settings')
    expect((result.counters as { toolCallCount: number }).toolCallCount).toBe(1)
    expect(fixture.sdkCalls.filter((call) => call.operation === 'generation')).toHaveLength(2)
    expect(fixture.solverStarts).toHaveLength(1)
  })
})

describe('incomplete generation recovery events', () => {
  it.each(['template', 'last_verified'] as const)(
    'preserves provider failure when returning a verified %s preview', async (source) => {
      await fixture.close()
      fixture = await startW08Server({ decide: (context, index) => {
        if (source === 'last_verified' && context.counters.stepCount === 1) {
          return normalGeneratorDecision(context, index)
        }
        throw new Error('synthetic provider failure')
      } })

      const response = await postGeneration(fixture, validGenerationRequest)
      expect(response.status).toBe(200)
      expect(await response.json()).toMatchObject({
        kind: 'preview', source, verified: true,
        status: 'stopped', completed: false, stopReason: 'provider_failed',
      })
      const events = fixture.securityEvents.filter((event) => event.event === 'run_finished')
      expect(events).toHaveLength(1)
      expect(events[0]).toMatchObject({
        outcome: 'failed',
        reasonCode: 'PROVIDER_UNAVAILABLE',
        providerAttempts: source === 'template' ? 1 : 2,
        executedToolCalls: 1,
      })
    },
  )

  it('preserves the deadline reason when verified fallback traffic is available', async () => {
    let now = 0
    await fixture.close()
    fixture = await startW08Server({
      now: () => now,
      decide: () => {
        now = 40_000
        return { kind: 'refusal', reason: 'cannot_satisfy_goal' }
      },
    })

    const response = await postGeneration(fixture, validGenerationRequest)
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      kind: 'preview', source: 'template', verified: true,
      status: 'stopped', completed: false, stopReason: 'deadline',
    })
    const events = fixture.securityEvents.filter((event) => event.event === 'run_finished')
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({
      outcome: 'failed', reasonCode: 'DEADLINE', providerAttempts: 1, executedToolCalls: 1,
    })
  })
})

async function postGeneration(
  target: W08ServerFixture,
  body: unknown,
): Promise<Response> {
  return fetch(`${target.origin}/api/levels/generate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function isGeneratorContext(value: unknown): value is {
  evaluations: Array<Record<string, unknown>>
  candidates: unknown[]
} {
  return typeof value === 'object' && value !== null && 'runId' in value
}
