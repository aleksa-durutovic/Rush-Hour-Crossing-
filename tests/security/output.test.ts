import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { requestAdvice } from '../../src/advice/client'
import { createRequestHandler } from '../../server/app'
import { allowedHostsFor } from '../../server/config'
import type { AdviceResponse } from '../../shared/advice-contract'
import { startW08Server, type W08ServerFixture } from '../server/fixtures/w08-server'
import { W08_SYNTHETIC_SECRET, validAdviceSummary, validGenerationRequest } from './fixtures'

let fixture: W08ServerFixture

beforeEach(async () => {
  fixture = await startW08Server()
})

afterEach(async () => {
  vi.unstubAllGlobals()
  await fixture.close()
})

describe('T06/T10 bounded model and evidence output', () => {
  it('rejects raw advice provider text above 2,048 UTF-8 bytes before returning a tip', async () => {
    const valid = JSON.stringify({ nextTip: 'Wait for a safe gap.' })
    await replaceFixture({
      generateContent: () => ({ text: valid + ' '.repeat(2_049 - Buffer.byteLength(valid, 'utf8')) }),
    })

    const response = await postAdvice(fixture)
    const body = await response.text()
    expect(Buffer.byteLength(body, 'utf8')).toBeLessThan(4_096)
    expect(response.status).toBe(503)
    expect(JSON.parse(body)).toEqual({ error: 'ADVICE_UNAVAILABLE' })
    expect(fixture.sdkCalls.filter((call) => call.operation === 'advice')).toHaveLength(1)
    expect(fixture.solverStarts).toHaveLength(0)
  })

  it('rejects invalid raw advice provider JSON under the byte limit', async () => {
    await replaceFixture({ generateContent: () => ({ text: 'not valid JSON' }) })

    const response = await postAdvice(fixture)
    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ error: 'ADVICE_UNAVAILABLE' })
    expect(fixture.sdkCalls.filter((call) => call.operation === 'advice')).toHaveLength(1)
    expect(fixture.solverStarts).toHaveLength(0)
  })
  it('keeps generator raw model output within 8,192 bytes before parsing', async () => {
    const validEnvelope = JSON.stringify({
      decision: { kind: 'tool_request', name: 'solveLevel', arguments: { lanes: [] } },
    })
    await replaceFixture({
      generateContent: () => ({ text: validEnvelope + ' '.repeat(8_193 - Buffer.byteLength(validEnvelope, 'utf8')) }),
    })

    const response = await postGeneration(fixture)
    const result = await response.json() as Record<string, unknown>
    expect(result).toMatchObject({ status: 'failed', kind: 'unavailable', stopReason: 'invalid_model_proposal' })
    expect((result.counters as { providerAttemptCount: number }).providerAttemptCount).toBe(1)
    expect(fixture.solverStarts).toHaveLength(0)
  })

  it('rejects an invalid generator response envelope before solver work', async () => {
    await replaceFixture({ generateContent: () => ({ text: JSON.stringify({ unexpected: { decision: { kind: 'refusal', reason: 'cannot_satisfy_goal' } } }) }) })

    const response = await postGeneration(fixture)
    const result = await response.json() as Record<string, unknown>
    expect(response.status).toBe(200)
    expect(result).toMatchObject({ status: 'failed', kind: 'unavailable', stopReason: 'invalid_model_proposal' })
    expect((result.counters as { providerAttemptCount: number }).providerAttemptCount).toBe(1)
    expect(fixture.solverStarts).toHaveLength(0)
  })
  it('rejects an invalid final decision DTO without running the solver', async () => {
    await replaceFixture({
      decide: () => ({ kind: 'final', candidateId: 'foreign-candidate', evaluationId: 'foreign-evaluation', summary: 'trust me', extra: W08_SYNTHETIC_SECRET }),
    })

    const response = await postGeneration(fixture)
    const result = await response.json() as Record<string, unknown>
    expect(response.status).toBe(200)
    expect(result).toMatchObject({ status: 'failed', kind: 'unavailable' })
    expect(JSON.stringify(result)).not.toContain(W08_SYNTHETIC_SECRET)
    expect(fixture.sdkCalls.filter((call) => call.operation === 'generation')).toHaveLength(1)
    expect(fixture.solverStarts).toHaveLength(0)
  })
  it('rejects forbidden fields inside executed compact evidence before another model decision', async () => {
    await replaceFixture({
      transformSolverOutput: (output) => ({
        ...output,
        evidence: { ...output.evidence, [W08_SYNTHETIC_SECRET]: 'forbidden evidence field' },
      }),
    })

    const response = await postGeneration(fixture)
    const body = await response.text()
    expect(response.status).toBe(200)
    expect(body).not.toContain(W08_SYNTHETIC_SECRET)
    expect(JSON.parse(body)).toMatchObject({ status: 'failed', kind: 'unavailable', stopReason: 'invalid_tool_result' })
    expect(fixture.solverStarts).toHaveLength(1)
    expect(fixture.sdkCalls.filter((call) => call.operation === 'generation')).toHaveLength(1)
  })

  it('projects an unrelated tool-wrapper sibling out of subsequent model context', async () => {
    await replaceFixture({
      transformSolverOutput: (output) => ({ ...output, unrelatedSibling: W08_SYNTHETIC_SECRET }),
    })

    const response = await postGeneration(fixture)
    const body = await response.text()
    expect(response.status).toBe(200)
    expect(body).not.toContain(W08_SYNTHETIC_SECRET)
    expect(JSON.stringify(fixture.modelContexts)).not.toContain(W08_SYNTHETIC_SECRET)
    expect(fixture.solverStarts).toHaveLength(2)
    expect(fixture.sdkCalls.filter((call) => call.operation === 'generation')).toHaveLength(2)
    expect(body).toContain('"verified":true')
  })

  it('keeps an actual compact solver evaluation under the 4,096-byte contract', async () => {
    const response = await postGeneration(fixture)
    expect(response.status).toBe(200)
    const secondContext = fixture.modelContexts.filter(isGeneratorContext)[1]
    const evidence = secondContext?.evaluations[0]
    expect(evidence).toBeDefined()
    expect(Buffer.byteLength(JSON.stringify(evidence), 'utf8')).toBeLessThanOrEqual(4_096)
  })
})

describe('advice HTTP/browser response bounds', () => {
  it('returns a fixed unavailable response if a faulty advice service exceeds 4,096 bytes', async () => {
    const result = await requestThroughFaultyAdviceService({
      focus: 'general',
      evidence: 'bounded evidence',
      nextTip: 'x'.repeat(5_000),
    } as AdviceResponse)
    expect(result.status).toBe(503)
    expect(Buffer.byteLength(result.body, 'utf8')).toBeLessThan(4_096)
    expect(JSON.parse(result.body)).toEqual({ error: 'ADVICE_UNAVAILABLE' })
  })

  it('stops consuming an oversized browser response before JSON parsing', async () => {
    const dto = { focus: 'survival', evidence: 'You lost all 3 lives.', nextTip: 'Wait for a gap.' }
    const bytes = new TextEncoder().encode(JSON.stringify(dto) + ' '.repeat(5_000))
    let offset = 0
    let pulls = 0
    let cancelled = false
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulls += 1
        if (offset >= bytes.byteLength) {
          controller.enqueue(new Uint8Array(1_024).fill(32))
          return
        }
        const end = Math.min(offset + 1_024, bytes.byteLength)
        controller.enqueue(bytes.slice(offset, end))
        offset = end
      },
      cancel() {
        cancelled = true
      },
    })
    const response = new Response(body, { status: 200 })
    const json = vi.spyOn(response, 'json')
    vi.stubGlobal('fetch', vi.fn(async () => response))

    const result = await requestAdvice(validAdviceSummary, new AbortController().signal)
    expect(result).toBeNull()
    expect(cancelled).toBe(true)
    expect(pulls).toBeLessThan(8)
    expect(json).not.toHaveBeenCalled()
  })
})

async function replaceFixture(options: Parameters<typeof startW08Server>[0]): Promise<void> {
  await fixture.close()
  fixture = await startW08Server(options)
}

async function postAdvice(target: W08ServerFixture): Promise<Response> {
  return fetch(`${target.origin}/api/advice`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(validAdviceSummary),
  })
}

async function postGeneration(target: W08ServerFixture): Promise<Response> {
  return fetch(`${target.origin}/api/levels/generate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(validGenerationRequest),
  })
}

function isGeneratorContext(value: unknown): value is { evaluations: unknown[] } {
  return typeof value === 'object' && value !== null && 'runId' in value
}

async function requestThroughFaultyAdviceService(advice: AdviceResponse): Promise<{ status: number; body: string }> {
  let server: Server
  server = createServer()
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const port = (server.address() as AddressInfo).port
  server.on('request', createRequestHandler({
    allowedHosts: allowedHostsFor(port),
    adviceService: { analyze: async () => advice },
  }))
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/advice`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(validAdviceSummary),
    })
    return { status: response.status, body: await response.text() }
  } finally {
    server.closeAllConnections()
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  }
}
