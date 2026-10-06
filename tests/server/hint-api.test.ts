import { createServer, request, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRequestHandler } from '../../server/app'
import { allowedHostsFor } from '../../server/config'
import { HintServiceError, type HintService } from '../../server/agent/hint-service'
import { HINT_RESPONSE_MAX_BYTES, type HintResponse } from '../../shared/hint-agent-contract'
import { nearGoalHintResponse, nearGoalSnapshot } from '../hints/fixtures'

interface RawResponse {
  status: number
  headers: Record<string, string | string[] | undefined>
  body: string
}

let server: Server
let port: number
const analyze = vi.fn<HintService['analyze']>()

beforeEach(async () => {
  analyze.mockReset().mockResolvedValue(nearGoalHintResponse())
  server = createServer()
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  port = (server.address() as AddressInfo).port
  server.on(
    'request',
    createRequestHandler({
      allowedHosts: allowedHostsFor(port),
      hintService: { analyze } satisfies HintService,
    }),
  )
})

afterEach(async () => {
  await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
})

function send(
  method: string,
  body?: string,
  contentType = 'application/json',
  host = `127.0.0.1:${port}`,
): Promise<RawResponse> {
  return new Promise((resolve, reject) => {
    const outgoing = request({
      host: '127.0.0.1',
      port,
      path: '/api/hint',
      method,
      headers: { host, ...(body === undefined ? {} : { 'content-type': contentType }) },
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

describe('POST /api/hint', () => {
  it('validates a snapshot and returns only the bounded Hint DTO', async () => {
    const response = await send('POST', JSON.stringify(nearGoalSnapshot))

    expect(response.status).toBe(200)
    expect(response.headers['cache-control']).toBe('no-store')
    expect(JSON.parse(response.body)).toEqual(nearGoalHintResponse())
    expect(analyze).toHaveBeenCalledTimes(1)
    expect(analyze).toHaveBeenCalledWith(nearGoalSnapshot, expect.any(AbortSignal))
    expect(response.headers['access-control-allow-origin']).toBeUndefined()
  })

  it.each([
    ['malformed JSON', '{"status":'],
    ['unknown snapshot property', JSON.stringify({ ...nearGoalSnapshot, score: 100 })],
    ['terminal snapshot', JSON.stringify({ ...nearGoalSnapshot, status: 'won' })],
    ['impossible active crossings', JSON.stringify({ ...nearGoalSnapshot, crossings: 1 })],
    ['goal row', JSON.stringify({ ...nearGoalSnapshot, y: 0 })],
  ])('rejects %s before service invocation', async (_label, body) => {
    const response = await send('POST', body)

    expect(response.status).toBe(400)
    expect(JSON.parse(response.body)).toEqual({ error: 'INVALID_REQUEST' })
    expect(analyze).not.toHaveBeenCalled()
  })

  it('rejects non-JSON content before service invocation', async () => {
    const response = await send('POST', JSON.stringify(nearGoalSnapshot), 'text/plain')

    expect(response.status).toBe(415)
    expect(JSON.parse(response.body)).toEqual({ error: 'UNSUPPORTED_MEDIA_TYPE' })
    expect(analyze).not.toHaveBeenCalled()
  })

  it('rejects a request over 2,048 UTF-8 bytes before service invocation', async () => {
    const response = await send('POST', 'x'.repeat(2049))

    expect(response.status).toBe(413)
    expect(JSON.parse(response.body)).toEqual({ error: 'REQUEST_TOO_LARGE' })
    expect(analyze).not.toHaveBeenCalled()
  })

  it('rejects methods other than POST and advertises Allow: POST', async () => {
    const response = await send('GET')

    expect(response.status).toBe(405)
    expect(response.headers.allow).toBe('POST')
    expect(JSON.parse(response.body)).toEqual({ error: 'METHOD_NOT_ALLOWED' })
    expect(analyze).not.toHaveBeenCalled()
  })

  it('enforces the existing Host allowlist and emits no CORS header', async () => {
    const blocked = await send('POST', JSON.stringify(nearGoalSnapshot), 'application/json', 'outside.test')

    expect(blocked.status).toBe(403)
    expect(JSON.parse(blocked.body)).toEqual({ error: 'FORBIDDEN_HOST' })
    expect(blocked.headers['access-control-allow-origin']).toBeUndefined()
    expect(analyze).not.toHaveBeenCalled()
  })

  it('returns a fixed unavailable error when the service rejects', async () => {
    analyze.mockRejectedValue(new HintServiceError())
    const response = await send('POST', JSON.stringify(nearGoalSnapshot))

    expect(response.status).toBe(503)
    expect(JSON.parse(response.body)).toEqual({ error: 'HINT_UNAVAILABLE' })
    expect(response.body).not.toContain('provider')
  })

  it('does not send a service result larger than 65,536 bytes', async () => {
    const oversized = { ...nearGoalHintResponse(), extra: 'x'.repeat(HINT_RESPONSE_MAX_BYTES) }
    analyze.mockResolvedValue(oversized as unknown as HintResponse)
    const response = await send('POST', JSON.stringify(nearGoalSnapshot))

    expect(response.status).toBe(503)
    expect(response.body).toBe(JSON.stringify({ error: 'HINT_UNAVAILABLE' }))
    expect(Buffer.byteLength(response.body)).toBeLessThan(HINT_RESPONSE_MAX_BYTES)
  })

  it('aborts pending service work when the browser disconnects', async () => {
    let markAborted: ((value: boolean) => void) | undefined
    const aborted = new Promise<boolean>((resolve) => { markAborted = resolve })
    analyze.mockImplementation((_snapshot, signal) => {
      signal.addEventListener('abort', () => markAborted?.(signal.aborted), { once: true })
      return new Promise<HintResponse>(() => undefined)
    })

    const outgoing = request({
      host: '127.0.0.1',
      port,
      path: '/api/hint',
      method: 'POST',
      headers: { host: `127.0.0.1:${port}`, 'content-type': 'application/json' },
      agent: false,
    })
    outgoing.on('error', () => undefined)
    outgoing.write(JSON.stringify(nearGoalSnapshot))
    outgoing.end()
    await new Promise<void>((resolve) => setTimeout(resolve, 20))
    outgoing.destroy()

    await expect(aborted).resolves.toBe(true)
  })
})
