import { createServer, request, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getGeneratedLevelTemplate } from '../../src/config/generated-level'
import { measureTraffic } from '../../src/game/level-metrics'
import { getTrafficPeriod } from '../../src/game/solve-level'
import { createRequestHandler } from '../../server/app'
import { allowedHostsFor } from '../../server/config'
import type { GenerationResponse } from '../../shared/level-generator-contract'
import type { LevelGeneratorService } from '../../server/level-generator/service'

interface HttpResult {
  status: number
  headers: Record<string, string | string[] | undefined>
  body: string
}

const generationRequest = { targetDifficulty: 1, lives: 3, crossingsToWin: 1 }
const lanes = getGeneratedLevelTemplate(1).map((lane) => ({
  ...lane,
  vehicleStarts: [...lane.vehicleStarts],
}))
const trafficMetrics = measureTraffic(lanes)
const validPreview: GenerationResponse = {
  runId: 'run-api',
  status: 'completed',
  stopReason: 'goal_completed',
  completed: true,
  counters: { stepCount: 2, providerAttemptCount: 2, retryCount: 0, toolCallCount: 2, modelToolCallCount: 1, revisionCount: 0 },
  elapsedMs: 100,
  kind: 'preview',
  source: 'generated',
  settings: { lives: 3, crossingsToWin: 1 },
  lanes,
  requestedDifficulty: 1,
  computedDifficulty: 1,
  verified: true,
  measurements: {
    firstCrossingMinMoves: 6,
    minMoves: 6,
    ...trafficMetrics,
    trafficPeriod: getTrafficPeriod(lanes),
    exploredStates: 100,
    actionEvaluations: 500,
  },
  summary: 'Verified level is ready.',
}

let server: Server
let port: number
let generate: ReturnType<typeof vi.fn<LevelGeneratorService['generate']>>

beforeEach(async () => {
  generate = vi.fn<LevelGeneratorService['generate']>().mockResolvedValue(validPreview)
  server = createServer(createRequestHandler({
    allowedHosts: ['127.0.0.1:0'],
    generationService: { generate } satisfies LevelGeneratorService,
  }))
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  port = (server.address() as AddressInfo).port
  server.removeAllListeners('request')
  server.on('request', createRequestHandler({
    allowedHosts: allowedHostsFor(port),
    generationService: { generate } satisfies LevelGeneratorService,
  }))
})

afterEach(async () => {
  await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
})

function send(
  method: string,
  body?: string | Buffer,
  options: { contentType?: string; host?: string; contentLength?: number; chunked?: boolean } = {},
): Promise<HttpResult> {
  return new Promise((resolve, reject) => {
    const bytes = body === undefined ? undefined : Buffer.isBuffer(body) ? body : Buffer.from(body)
    const outgoing = request({
      host: '127.0.0.1',
      port,
      path: '/api/levels/generate',
      method,
      agent: false,
      headers: {
        host: options.host ?? `127.0.0.1:${port}`,
        ...(body === undefined ? {} : {
          'content-type': options.contentType ?? 'application/json',
          ...(options.chunked ? {} : { 'content-length': options.contentLength ?? bytes?.byteLength }),
        }),
      },
    }, (incoming) => {
      const chunks: Buffer[] = []
      incoming.on('data', (chunk: Buffer) => chunks.push(chunk))
      incoming.on('end', () => resolve({
        status: incoming.statusCode ?? 0,
        headers: incoming.headers,
        body: Buffer.concat(chunks).toString('utf8'),
      }))
    })
    outgoing.on('error', reject)
    if (bytes) outgoing.write(bytes)
    outgoing.end()
  })
}

describe('POST /api/levels/generate', () => {
  it('validates the exact request and returns a no-store same-origin preview', async () => {
    const response = await send('POST', JSON.stringify(generationRequest))

    expect(response.status).toBe(200)
    expect(response.headers['cache-control']).toBe('no-store')
    expect(response.headers['x-content-type-options']).toBe('nosniff')
    expect(response.headers['access-control-allow-origin']).toBeUndefined()
    expect(JSON.parse(response.body)).toEqual(validPreview)
    expect(generate).toHaveBeenCalledTimes(1)
    expect(generate).toHaveBeenCalledWith(generationRequest, expect.any(AbortSignal))
  })

  it.each([
    ['malformed JSON', '{"targetDifficulty":'],
    ['extra field', JSON.stringify({ ...generationRequest, lanes })],
    ['numeric string', JSON.stringify({ ...generationRequest, targetDifficulty: '1' })],
  ])('rejects %s before generation service work', async (_label, body) => {
    const response = await send('POST', body)
    expect(response.status).toBe(400)
    expect(JSON.parse(response.body)).toEqual({ error: 'INVALID_GENERATION_REQUEST' })
    expect(generate).not.toHaveBeenCalled()
  })

  it('rejects bodies above the declared and streamed 2,048-byte cap', async () => {
    const declared = await send('POST', 'x', { contentLength: 2_049 })
    expect(declared.status).toBe(413)
    expect(JSON.parse(declared.body)).toEqual({ error: 'REQUEST_TOO_LARGE' })

    const streamed = await send('POST', ' '.repeat(2_049), { chunked: true })
    expect(streamed.status).toBe(413)
    expect(generate).not.toHaveBeenCalled()
  })

  it('rejects invalid UTF-8 before service work', async () => {
    const response = await send('POST', Buffer.from([0xc3, 0x28]))
    expect(response.status).toBe(400)
    expect(JSON.parse(response.body)).toEqual({ error: 'INVALID_GENERATION_REQUEST' })
    expect(generate).not.toHaveBeenCalled()
  })

  it('enforces POST and JSON media type with stable errors', async () => {
    const wrongMethod = await send('GET')
    expect(wrongMethod.status).toBe(405)
    expect(wrongMethod.headers.allow).toBe('POST')
    expect(JSON.parse(wrongMethod.body)).toEqual({ error: 'METHOD_NOT_ALLOWED' })
    const wrongType = await send('POST', JSON.stringify(generationRequest), { contentType: 'text/plain' })
    expect(wrongType.status).toBe(415)
    expect(JSON.parse(wrongType.body)).toEqual({ error: 'UNSUPPORTED_MEDIA_TYPE' })
    expect(generate).not.toHaveBeenCalled()
  })

  it('keeps the existing Host allowlist on the generation route', async () => {
    const response = await send('POST', JSON.stringify(generationRequest), { host: 'evil.example' })
    expect(response.status).toBe(403)
    expect(JSON.parse(response.body)).toEqual({ error: 'FORBIDDEN_HOST' })
    expect(generate).not.toHaveBeenCalled()
  })

  it('rejects a second valid run as busy and aborts disconnected work without late writes', async () => {
    let signal: AbortSignal | undefined
    let settleFirst: ((value: GenerationResponse) => void) | undefined
    let markStarted: (() => void) | undefined
    const started = new Promise<void>((resolve) => { markStarted = resolve })
    generate.mockImplementationOnce((_body, callerSignal) => {
      signal = callerSignal
      markStarted?.()
      return new Promise((resolve) => { settleFirst = resolve })
    })

    const first = new Promise<void>((resolve) => {
      const outgoing = request({
        host: '127.0.0.1', port, path: '/api/levels/generate', method: 'POST', agent: false,
        headers: { host: `127.0.0.1:${port}`, 'content-type': 'application/json' },
      })
      outgoing.on('error', () => resolve())
      outgoing.end(JSON.stringify(generationRequest))
      void started.then(() => {
        outgoing.destroy()
        resolve()
      })
    })
    await started
    const busy = await send('POST', JSON.stringify(generationRequest))
    expect(busy.status).toBe(409)
    expect(JSON.parse(busy.body)).toEqual({ error: 'GENERATION_BUSY' })
    await first
    await vi.waitFor(() => expect(signal?.aborted).toBe(true))

    settleFirst?.(validPreview)
    const afterRelease = await send('POST', JSON.stringify(generationRequest))
    expect(afterRelease.status).toBe(200)
  })

  it('maps invalid service output to a fixed internal error', async () => {
    generate.mockResolvedValueOnce({ ...validPreview, completed: false } as GenerationResponse)
    const response = await send('POST', JSON.stringify(generationRequest))
    expect(response.status).toBe(500)
    expect(JSON.parse(response.body)).toEqual({ error: 'INTERNAL_ERROR' })
    expect(response.body).not.toContain('invalid')
  })
})
