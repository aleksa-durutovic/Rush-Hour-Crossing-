import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { createRequestHandler } from '../../server/app'
import { allowedHostsFor } from '../../server/config'
import type { GenerationResponse } from '../../shared/level-generator-contract'
import { startW08Server, type W08ServerFixture } from '../server/fixtures/w08-server'
import { normalGeneratorDecision, validAdviceSummary, validGenerationRequest } from './fixtures'
import type { GeneratorDecisionContext } from '../../server/level-generator/model'
import { createAdmissionController } from '../../server/security/admission'

let fixture: W08ServerFixture
let now: number

beforeEach(async () => {
  now = 0
  fixture = await startW08Server({ now: () => now })
})

afterEach(async () => {
  await fixture.close()
})

describe('T14 atomic admission controller policy', () => {
  it('enforces one per operation, two combined, and one rolling five-job allowance', () => {
    const controller = createAdmissionController({ now: () => now })
    const generation = controller.tryAcquire('generation')
    expect(generation.accepted).toBe(true)
    if (!generation.accepted) throw new Error('Expected first generation admission.')
    expect(controller.tryAcquire('generation')).toMatchObject({ accepted: false, reason: 'busy' })

    const advice = controller.tryAcquire('advice')
    expect(advice.accepted).toBe(true)
    if (!advice.accepted) throw new Error('Expected advice capacity alongside generation.')
    expect(controller.tryAcquire('advice')).toMatchObject({ accepted: false, reason: 'busy' })
    expect(controller.tryAcquire('generation')).toMatchObject({ accepted: false, reason: 'busy' })
    generation.lease.markTerminal()
    advice.lease.markTerminal()

    for (let count = 0; count < 2; count += 1) {
      const operation = count % 2 === 0 ? 'generation' : 'advice'
      const accepted = controller.tryAcquire(operation)
      expect(accepted.accepted).toBe(true)
      if (accepted.accepted) accepted.lease.markTerminal()
      now += 1
    }

    const fifth = controller.tryAcquire('generation')
    expect(fifth.accepted).toBe(true)
    if (!fifth.accepted) throw new Error('Expected fifth admission.')
    expect(controller.tryAcquire('advice')).toMatchObject({ accepted: false, reason: 'rate_limited' })
    fifth.lease.markTerminal()

    now = 60_000
    const recovered = controller.tryAcquire('advice')
    expect(recovered.accepted).toBe(true)
    if (recovered.accepted) recovered.lease.markTerminal()
  })

  it('checks capacity before rate without spending another timestamp on a busy request', () => {
    const controller = createAdmissionController({ now: () => now })
    for (let index = 0; index < 4; index += 1) {
      const operation = index % 2 === 0 ? 'generation' : 'advice'
      const accepted = controller.tryAcquire(operation)
      expect(accepted.accepted).toBe(true)
      if (accepted.accepted) accepted.lease.markTerminal()
      now += 1
    }
    const fifth = controller.tryAcquire('generation')
    expect(fifth.accepted).toBe(true)
    expect(controller.tryAcquire('generation')).toMatchObject({ accepted: false, reason: 'busy' })
    if (fifth.accepted) fifth.lease.markTerminal()
    const rateDenied = controller.tryAcquire('generation')
    expect(rateDenied).toMatchObject({ accepted: false, reason: 'rate_limited', retryAfterSeconds: 60 })
  })
})
describe('T16 HTTP lease draining', () => {
  it('keeps a generation slot occupied after its terminal response until provider work settles', async () => {
    let releaseProvider!: () => void
    const providerWork = new Promise<void>((resolve) => { releaseProvider = resolve })
    let starts = 0
    let server: Server | undefined
    const response: GenerationResponse = {
      runId: 'run-draining',
      status: 'failed',
      stopReason: 'provider_failed',
      completed: false,
      counters: { stepCount: 0, providerAttemptCount: 1, retryCount: 0, toolCallCount: 0, modelToolCallCount: 0, revisionCount: 0 },
      elapsedMs: 0,
      kind: 'unavailable',
      message: 'The level service is temporarily unavailable.',
    }
    const generationService = {
      async generate(_request: unknown, _signal: AbortSignal, startWork?: (kind: 'provider' | 'solver', start: () => Promise<unknown>) => Promise<unknown>) {
        starts += 1
        if (!startWork) throw new Error('The HTTP handler must provide a work hook.')
        startWork('provider', () => providerWork)
        return response
      },
    }
    try {
      server = createServer()
      await new Promise<void>((resolve, reject) => {
        server!.once('error', reject)
        server!.listen(0, '127.0.0.1', resolve)
      })
      const port = (server.address() as AddressInfo).port
      server.on('request', createRequestHandler({
        allowedHosts: allowedHostsFor(port),
        generationService,
        admissionController: createAdmissionController({ now: () => now }),
      }))
      const origin = `http://127.0.0.1:${port}`
      const first = await postGeneration(origin)
      const second = await postGeneration(origin)
      expect(first.status).toBe(200)
      expect(second.status).toBe(409)
      expect(await second.json()).toEqual({ error: 'GENERATION_BUSY' })
      expect(starts).toBe(1)

      releaseProvider()
      await providerWork
      await Promise.resolve()
      const recovered = await postGeneration(origin)
      expect(recovered.status).toBe(200)
      expect(starts).toBe(2)
    } finally {
      releaseProvider?.()
      if (server) {
        server.closeAllConnections()
        await new Promise<void>((resolve, reject) => server!.close((error) => error ? reject(error) : resolve()))
      }
    }
  })
})

async function postGeneration(origin: string): Promise<Response> {
  return fetch(`${origin}/api/levels/generate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(validGenerationRequest),
  })
}
describe('T13 shared rolling-admission probe', () => {
  it('enforces per-operation and combined HTTP capacity before starting excess provider work', async () => {
    await fixture.close()
    let releaseGeneration!: () => void
    let releaseAdvice!: () => void
    const generationGate = new Promise<void>((resolve) => { releaseGeneration = resolve })
    const adviceGate = new Promise<void>((resolve) => { releaseAdvice = resolve })
    let generationCalls = 0
    fixture = await startW08Server({
      generateContent: async (call) => {
        if (call.operation === 'advice') {
          await adviceGate
          return { text: JSON.stringify({ nextTip: 'Wait for a clear gap.' }) }
        }
        const decisionIndex = generationCalls++
        if (decisionIndex === 0) await generationGate
        const decision = normalGeneratorDecision(call.context as GeneratorDecisionContext, decisionIndex)
        return { text: JSON.stringify({ decision }) }
      },
    })

    const generation = postOperation(fixture, 'generation')
    const advice = postOperation(fixture, 'advice')
    try {
      await vi.waitFor(() => expect(fixture.sdkCalls).toHaveLength(2))
      const [extraGeneration, extraAdvice] = await Promise.all([
        postOperation(fixture, 'generation'),
        postOperation(fixture, 'advice'),
      ])
      expect(extraGeneration.status).toBe(409)
      expect(await extraGeneration.json()).toEqual({ error: 'GENERATION_BUSY' })
      expect(extraAdvice.status).toBe(409)
      expect(await extraAdvice.json()).toEqual({ error: 'ADVICE_BUSY' })
      expect(fixture.sdkCalls).toHaveLength(2)
      expect(fixture.solverStarts).toHaveLength(0)

      releaseGeneration()
      releaseAdvice()
      const [generationResponse, adviceResponse] = await Promise.all([generation, advice])
      expect(generationResponse.status).toBe(200)
      expect(await generationResponse.json()).toMatchObject({ kind: 'preview', verified: true })
      expect(adviceResponse.status).toBe(200)
      expect(await adviceResponse.json()).toMatchObject({ nextTip: 'Wait for a clear gap.' })
      expect(fixture.sdkCalls.filter((call) => call.operation === 'generation')).toHaveLength(2)
      expect(fixture.sdkCalls.filter((call) => call.operation === 'advice')).toHaveLength(1)
      expect(fixture.solverStarts).toHaveLength(2)
    } finally {
      releaseGeneration()
      releaseAdvice()
    }
  })

  it('admits five combined jobs, denies the sixth without work, then recovers at the window edge', async () => {
    const acceptedStatuses: number[] = []
    const operations = ['generation', 'advice', 'generation', 'advice', 'generation'] as const
    for (const operation of operations) {
      acceptedStatuses.push((await postOperation(fixture, operation)).status)
    }

    const beforeDenied = {
      providerAttempts: fixture.sdkCalls.length,
      solverExecutions: fixture.solverStarts.length,
    }
    const sixth = await postOperation(fixture, 'advice')
    const afterDenied = {
      providerAttempts: fixture.sdkCalls.length,
      solverExecutions: fixture.solverStarts.length,
    }

    now = 60_000
    const afterWindow = await postOperation(fixture, 'advice')
    const measured = {
      acceptedStatuses,
      sixthStatus: sixth.status,
      sixthError: await parseError(sixth),
      retryAfter: sixth.headers.get('retry-after'),
      beforeDenied,
      afterDenied,
      afterWindowStatus: afterWindow.status,
    }

    expect(measured).toEqual({
      acceptedStatuses: [200, 200, 200, 200, 200],
      sixthStatus: 429,
      sixthError: 'AI_RATE_LIMITED',
      retryAfter: '60',
      beforeDenied,
      afterDenied: beforeDenied,
      afterWindowStatus: 200,
    })
  })
})

async function postOperation(target: W08ServerFixture, operation: 'generation' | 'advice'): Promise<Response> {
  return fetch(`${target.origin}/api/${operation === 'generation' ? 'levels/generate' : 'advice'}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(operation === 'generation' ? validGenerationRequest : validAdviceSummary),
  })
}

async function parseError(response: Response): Promise<string | undefined> {
  if (response.status === 200) return undefined
  const value: unknown = await response.json()
  return typeof value === 'object' && value !== null && 'error' in value && typeof value.error === 'string'
    ? value.error
    : undefined
}
