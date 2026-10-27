import { request } from 'node:http'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { startW08Server, type W08ServerFixture } from '../server/fixtures/w08-server'
import { validAdviceSummary, validGenerationRequest } from './fixtures'

interface HttpResult {
  status: number
  body: string
}

let fixture: W08ServerFixture

beforeEach(async () => {
  fixture = await startW08Server()
})

afterEach(async () => {
  await fixture.close()
})

describe('T16 production static response headers', () => {
  it('sets the enforcing policy and baseline headers only for built/static responses', async () => {
    const apiOnlyPage = await fetch(fixture.origin + '/')
    expect(apiOnlyPage.status).toBe(404)
    expect(apiOnlyPage.headers.get('content-security-policy')).toBeNull()
    await fixture.close()
    fixture = await startW08Server({ staticDir: resolve('tests/security/fixtures/static') })
    const response = await fetch(fixture.origin + '/')
    expect(response.status).toBe(200)
    expect(response.headers.get('content-security-policy')).toBe(
      "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; font-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
    )
    expect(response.headers.get('x-content-type-options')).toBe('nosniff')
    expect(response.headers.get('referrer-policy')).toBe('no-referrer')
    expect(response.headers.get('x-frame-options')).toBe('DENY')

    const apiResponse = await fetch(fixture.origin + '/api/health')
    expect(apiResponse.headers.get('content-security-policy')).toBeNull()
  })
})
describe('T02 privilege and body-size probe', () => {
  it.each(['role', 'ownerId', 'maxSteps', 'provider', 'model', 'correlationId'])(
    'rejects the extra %s field before provider or tool work', async (field) => {
      const response = await postJson(fixture, { ...validGenerationRequest, [field]: 'attacker-value' })
      expect(response.status).toBe(400)
      expect(JSON.parse(response.body)).toEqual({ error: 'INVALID_GENERATION_REQUEST' })
      expect(fixture.sdkCalls).toHaveLength(0)
      expect(fixture.solverStarts).toHaveLength(0)
    },
  )

  it.each([
    ['declared', false],
    ['streamed', true],
  ])('rejects %s bytes above the 2,048-byte limit before work', async (_label, chunked) => {
    const body = ' '.repeat(2_049)
    const response = await postRaw(fixture, body, chunked)
    expect(response.status).toBe(413)
    expect(JSON.parse(response.body)).toEqual({ error: 'REQUEST_TOO_LARGE' })
    expect(fixture.sdkCalls).toHaveLength(0)
    expect(fixture.solverStarts).toHaveLength(0)
  })

  it('accepts an exact-limit valid request with trailing JSON whitespace', async () => {
    const json = JSON.stringify(validGenerationRequest)
    const body = json + ' '.repeat(2_048 - Buffer.byteLength(json, 'utf8'))
    expect(Buffer.byteLength(body, 'utf8')).toBe(2_048)

    const response = await postRaw(fixture, body, false)
    expect(response.status).toBe(200)
    expect(JSON.parse(response.body)).toMatchObject({
      status: 'completed',
      completed: true,
      counters: { stepCount: 2, providerAttemptCount: 2, modelToolCallCount: 1, toolCallCount: 2 },
    })
    expect(fixture.sdkCalls.filter((call) => call.operation === 'generation')).toHaveLength(2)
    expect(fixture.solverStarts).toHaveLength(2)
  })
})

describe('T01 request validation and legitimate limits', () => {
  it.each([
    ['malformed JSON', '{"targetDifficulty":'],
    ['null root', 'null'],
    ['wrong numeric type', JSON.stringify({ ...validGenerationRequest, lives: '3' })],
    ['fractional rating', JSON.stringify({ ...validGenerationRequest, targetDifficulty: 1.5 })],
    ['rating below range', JSON.stringify({ ...validGenerationRequest, targetDifficulty: 0 })],
    ['lives above range', JSON.stringify({ ...validGenerationRequest, lives: 6 })],
    ['crossing target above range', JSON.stringify({ ...validGenerationRequest, crossingsToWin: 11 })],
  ])('rejects %s before provider or solver work', async (_label, body) => {
    const response = await postRaw(fixture, body, false)
    expect(response.status).toBe(400)
    expect(JSON.parse(response.body)).toEqual({ error: 'INVALID_GENERATION_REQUEST' })
    expect(fixture.sdkCalls).toHaveLength(0)
    expect(fixture.solverStarts).toHaveLength(0)
  })

  it.each([
    ['minimum', { targetDifficulty: 1, lives: 1, crossingsToWin: 1 }],
    ['maximum', { targetDifficulty: 5, lives: 5, crossingsToWin: 10 }],
  ])('accepts the %s valid generation settings through the real solver', async (_label, body) => {
    const response = await postJson(fixture, body)
    expect(response.status).toBe(200)
    expect(JSON.parse(response.body)).toMatchObject({ kind: 'preview', completed: true, settings: { lives: body.lives, crossingsToWin: body.crossingsToWin } })
    expect(fixture.solverStarts).toHaveLength(2)
  })

  it.each([
    ['malformed advice JSON', '/api/advice', '{"outcome":'],
    ['wrong advice type', '/api/advice', JSON.stringify({ ...validAdviceSummary, score: '0' })],
    ['inconsistent advice summary', '/api/advice', JSON.stringify({ ...validAdviceSummary, outcome: 'won' })],
  ])('rejects %s before provider work', async (_label, path, body) => {
    const response = await postRaw(fixture, body, false, path)
    expect(response.status).toBe(400)
    expect(JSON.parse(response.body)).toEqual({ error: 'INVALID_REQUEST' })
    expect(fixture.sdkCalls).toHaveLength(0)
    expect(fixture.solverStarts).toHaveLength(0)
  })
})

describe('T07 exact Origin policy', () => {
  it.each([
    ['foreign origin', 'https://attacker.example'],
    ['null origin', 'null'],
    ['origin substring', `${'http://127.0.0.1:4173'}.attacker.example`],
    ['multiple origins', 'http://127.0.0.1:4173, http://localhost:4173'],
  ])('rejects a supplied %s before work', async (_label, origin) => {
    const response = await postRaw(fixture, JSON.stringify(validGenerationRequest), false, '/api/levels/generate', origin)
    expect(response.status).toBe(403)
    expect(JSON.parse(response.body)).toEqual({ error: 'FORBIDDEN_ORIGIN' })
    expect(fixture.sdkCalls).toHaveLength(0)
    expect(fixture.solverStarts).toHaveLength(0)
  })

  it.each(['loopback address', 'localhost alias'] as const)('allows an exact configured %s Origin', async (label) => {
    const origin = label === 'loopback address' ? fixture.origin : fixture.origin.replace('127.0.0.1', 'localhost')
    const response = await postRaw(fixture, JSON.stringify(validGenerationRequest), false, '/api/levels/generate', origin)
    expect(response.status).toBe(200)
    expect(JSON.parse(response.body)).toMatchObject({ completed: true, verified: true })
    expect(fixture.solverStarts).toHaveLength(2)
  })
})

function postJson(target: W08ServerFixture, value: unknown): Promise<HttpResult> {
  return postRaw(target, JSON.stringify(value), false)
}

function postRaw(
  target: W08ServerFixture,
  body: string,
  chunked: boolean,
  path = '/api/levels/generate',
  origin?: string,
): Promise<HttpResult> {
  return new Promise((resolve, reject) => {
    const outgoing = request({
      host: '127.0.0.1',
      port: target.port,
      path,
      method: 'POST',
      agent: false,
      headers: {
        host: `127.0.0.1:${target.port}`,
        'content-type': 'application/json',
        ...(origin === undefined ? {} : { origin }),
        ...(chunked ? { 'transfer-encoding': 'chunked' } : { 'content-length': Buffer.byteLength(body, 'utf8') }),
      },
    }, (incoming) => {
      const chunks: Buffer[] = []
      incoming.on('data', (chunk: Buffer) => chunks.push(chunk))
      incoming.on('end', () => resolve({
        status: incoming.statusCode ?? 0,
        body: Buffer.concat(chunks).toString('utf8'),
      }))
    })
    outgoing.on('error', reject)
    outgoing.end(body)
  })
}
