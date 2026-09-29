import { createServer, request, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRequestHandler } from '../../server/app'
import { allowedHostsFor } from '../../server/config'
import { AdviceServiceError, type AdviceService } from '../../server/advice/service'
import type { AdviceResponse, CompletedRunSummary } from '../../shared/advice-contract'

interface Result {
  status: number
  headers: Record<string, string | string[] | undefined>
  body: string
}

const validSummary: CompletedRunSummary = {
  outcome: 'lost',
  difficulty: 'easy',
  ticks: 18,
  crossings: 0,
  targetCrossings: 3,
  startingLives: 3,
  remainingLives: 0,
  score: 0,
}
const validAdvice: AdviceResponse = {
  focus: 'survival',
  evidence: 'You lost all 3 lives before completing a crossing.',
  nextTip: 'Wait at a safe row until a vehicle passes.',
}

let server: Server
let port: number
const analyze = vi.fn<AdviceService['analyze']>()

beforeEach(async () => {
  analyze.mockReset().mockResolvedValue(validAdvice)
  server = createServer()
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  port = (server.address() as AddressInfo).port
  server.on(
    'request',
    createRequestHandler({
      allowedHosts: allowedHostsFor(port),
      adviceService: { analyze } satisfies AdviceService,
    }),
  )
})

afterEach(async () => {
  await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
})

function send(method: string, body?: string, contentType = 'application/json'): Promise<Result> {
  return new Promise((resolve, reject) => {
    const outgoing = request({
      host: '127.0.0.1',
      port,
      path: '/api/advice',
      method,
      headers: { host: '127.0.0.1:' + port, ...(body === undefined ? {} : { 'content-type': contentType }) },
      agent: false,
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
    if (body !== undefined) outgoing.write(body)
    outgoing.end()
  })
}

describe('POST /api/advice', () => {
  it('validates an exact summary and returns only the stable DTO', async () => {
    const response = await send('POST', JSON.stringify(validSummary))

    expect(response.status).toBe(200)
    expect(response.headers['cache-control']).toBe('no-store')
    expect(JSON.parse(response.body)).toEqual(validAdvice)
    expect(analyze).toHaveBeenCalledTimes(1)
    expect(analyze).toHaveBeenCalledWith(validSummary, expect.any(AbortSignal))
  })

  it.each([
    ['malformed JSON', '{"outcome":'],
    ['unknown property', JSON.stringify({ ...validSummary, playerName: 'Ada' })],
    ['score mismatch', JSON.stringify({ ...validSummary, score: 100 })],
    ['impossible win', JSON.stringify({ ...validSummary, outcome: 'won' })],
  ])('rejects %s before invoking the service', async (_label, body) => {
    const response = await send('POST', body)

    expect(response.status).toBe(400)
    expect(JSON.parse(response.body)).toEqual({ error: 'INVALID_REQUEST' })
    expect(analyze).not.toHaveBeenCalled()
  })

  it('rejects non-JSON content and does not invoke the service', async () => {
    const response = await send('POST', JSON.stringify(validSummary), 'text/plain')

    expect(response.status).toBe(415)
    expect(JSON.parse(response.body)).toEqual({ error: 'UNSUPPORTED_MEDIA_TYPE' })
    expect(analyze).not.toHaveBeenCalled()
  })

  it('rejects a body larger than 4,096 bytes before service invocation', async () => {
    const response = await send('POST', 'x'.repeat(4097))

    expect(response.status).toBe(413)
    expect(JSON.parse(response.body)).toEqual({ error: 'REQUEST_TOO_LARGE' })
    expect(analyze).not.toHaveBeenCalled()
  })

  it('requires POST and advertises the allowed method', async () => {
    const response = await send('GET')

    expect(response.status).toBe(405)
    expect(response.headers.allow).toBe('POST')
    expect(JSON.parse(response.body)).toEqual({ error: 'METHOD_NOT_ALLOWED' })
    expect(analyze).not.toHaveBeenCalled()
  })



  it('aborts analysis when the browser disconnects', async () => {
    let capturedSignal: AbortSignal | undefined
    let markStarted: (() => void) | undefined
    const started = new Promise<void>((resolve) => { markStarted = resolve })
    analyze.mockImplementation((_summary, signal) => {
      capturedSignal = signal
      markStarted?.()
      return new Promise((resolve) => {
        signal.addEventListener('abort', () => resolve(validAdvice), { once: true })
      })
    })

    const outgoing = request({
      host: '127.0.0.1',
      port,
      path: '/api/advice',
      method: 'POST',
      headers: { host: '127.0.0.1:' + port, 'content-type': 'application/json' },
      agent: false,
    })
    outgoing.on('error', () => undefined)
    outgoing.end(JSON.stringify(validSummary))
    await started
    outgoing.destroy()

    await vi.waitFor(() => expect(capturedSignal?.aborted).toBe(true))
  })

  it('maps provider detail to the fixed safe unavailable body', async () => {
    analyze.mockRejectedValueOnce(new AdviceServiceError())

    const response = await send('POST', JSON.stringify(validSummary))

    expect(response.status).toBe(503)
    expect(JSON.parse(response.body)).toEqual({ error: 'ADVICE_UNAVAILABLE' })
    expect(response.body).not.toContain('private provider payload')
  })
})
