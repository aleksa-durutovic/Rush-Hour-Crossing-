import { afterEach, describe, expect, it, vi } from 'vitest'
import { MAX_GENERATION_RESPONSE_BYTES, requestGeneratedLevel } from '../src/level-generator/client'
import { validGenerationRequest } from './security/fixtures'

afterEach(() => vi.unstubAllGlobals())

describe('S03 bounded generation response baseline', () => {
  it('stops consuming the first 128 KiB response when it exceeds the 16 KiB limit', async () => {
    const chunk = new Uint8Array(1024).fill(0x20)
    let reads = 0
    let bytesRead = 0
    let cancelCalls = 0
    const response = new Response(new ReadableStream<Uint8Array>({
      pull(controller) {
        reads += 1
        bytesRead += chunk.byteLength
        controller.enqueue(chunk.slice())
        if (reads === 128) controller.close()
      },
      cancel() {
        cancelCalls += 1
      },
    }, { highWaterMark: 0 }), { status: 200 })

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response))
    const result = await requestGeneratedLevel(validGenerationRequest, new AbortController().signal)

    expect(result).toBeNull()
    expect(bytesRead).toBe(17 * 1024)
    expect(reads).toBe(17)
    expect(cancelCalls).toBe(1)
  })
})

describe('bounded generator response reader', () => {
  it('accepts valid DTO bytes up to the exact limit and preserves split UTF-8', async () => {
    const payload = JSON.stringify({ ...validUnavailable, message: 'Čeka se bezbedan prolaz.' })
    const encoder = new TextEncoder()
    const base = encoder.encode(payload)
    const bytes = new Uint8Array(MAX_GENERATION_RESPONSE_BYTES).fill(0x20)
    bytes.set(base)
    const text = new TextDecoder().decode(base)
    const markerOffset = encoder.encode(text.slice(0, text.indexOf('Č'))).byteLength
    const response = controlledResponse([bytes.slice(0, markerOffset + 1), bytes.slice(markerOffset + 1)], 200)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response.response))

    await expect(requestGeneratedLevel(validGenerationRequest, new AbortController().signal)).resolves.toMatchObject({
      kind: 'unavailable', message: 'Čeka se bezbedan prolaz.',
    })
    expect(response.response.body?.locked).toBe(false)
    expect(response.cancelled()).toBe(false)
  })

  it.each([undefined, '2', '999999', 'not-a-length'])(
    'uses delivered bytes instead of Content-Length %s', async contentLength => {
      const response = controlledResponse([new TextEncoder().encode(JSON.stringify(validUnavailable))], 200)
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(withHeader(response.response, contentLength)))
      await expect(requestGeneratedLevel(validGenerationRequest, new AbortController().signal)).resolves.toMatchObject({ kind: 'unavailable' })
      expect(response.response.body?.locked).toBe(false)
    },
  )

  it.each([
    ['invalid UTF-8', [new Uint8Array([0xc3, 0x28])]],
    ['malformed JSON', [new TextEncoder().encode('{')]],
    ['truncated JSON', [new TextEncoder().encode('{"kind":')]],
    ['invalid DTO', [new TextEncoder().encode('{"kind":"preview"}')]],
  ])('rejects %s and releases its reader', async (_name, chunks) => {
    const response = controlledResponse(chunks, 200)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response.response))
    await expect(requestGeneratedLevel(validGenerationRequest, new AbortController().signal)).resolves.toBeNull()
    expect(response.response.body?.locked).toBe(false)
  })

  it('does not parse or retain a chunk that crosses the limit and never reads again', async () => {
    const response = controlledResponse([
      new Uint8Array(MAX_GENERATION_RESPONSE_BYTES).fill(0x20),
      new Uint8Array([0x7b]),
      new Uint8Array(128 * 1024),
    ], 200)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response.response))
    await expect(requestGeneratedLevel(validGenerationRequest, new AbortController().signal)).resolves.toBeNull()
    expect(response.reads()).toBe(2)
    expect(response.bytesDelivered()).toBe(MAX_GENERATION_RESPONSE_BYTES + 1)
    expect(response.cancelled()).toBe(true)
    expect(response.response.body?.locked).toBe(false)
  })

  it('returns promptly when abort cancellation acknowledgement never settles', async () => {
    let cancelCalls = 0
    let reads = 0
    const body = new ReadableStream<Uint8Array>({
      pull() { reads += 1 },
      cancel() { cancelCalls += 1; return new Promise<void>(() => undefined) },
    }, { highWaterMark: 0 })
    const response = new Response(body, { status: 200 })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response))
    const controller = new AbortController()
    const addListener = vi.spyOn(controller.signal, 'addEventListener')
    const removeListener = vi.spyOn(controller.signal, 'removeEventListener')
    const request = requestGeneratedLevel(validGenerationRequest, controller.signal)
    await vi.waitFor(() => expect(reads).toBe(1))
    controller.abort()
    await expect(request).resolves.toBeNull()
    expect(cancelCalls).toBe(1)
    expect(body.locked).toBe(false)
    const installedAbortListener = addListener.mock.calls.find(([type]) => type === 'abort')?.[1]
    expect(installedAbortListener).toBeDefined()
    expect(removeListener.mock.calls.some(([type, listener]) => type === 'abort' && listener === installedAbortListener)).toBe(true)
  })

  it('does not wait for a rejecting overflow cancellation', async () => {
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(MAX_GENERATION_RESPONSE_BYTES + 1))
        controller.close()
      },
      cancel() { throw new Error('synthetic cancellation rejection') },
    }, { highWaterMark: 0 })
    const response = new Response(body, { status: 200 })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response))
    await expect(requestGeneratedLevel(validGenerationRequest, new AbortController().signal)).resolves.toBeNull()
    expect(body.locked).toBe(false)
  })

  it('cancels unused non-success response bodies without reading them', async () => {
    const response = controlledResponse([new Uint8Array([0x7b])], 503)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response.response))
    await expect(requestGeneratedLevel(validGenerationRequest, new AbortController().signal)).resolves.toBeNull()
    expect(response.reads()).toBe(0)
    expect(response.cancelled()).toBe(true)
    expect(response.response.body?.locked).toBe(false)
  })
})

const validUnavailable = {
  runId: 'test-run',
  status: 'failed',
  stopReason: 'provider_failed',
  counters: { stepCount: 0, providerAttemptCount: 0, retryCount: 0, toolCallCount: 0, modelToolCallCount: 0, revisionCount: 0 },
  elapsedMs: 0,
  completed: false,
  kind: 'unavailable',
  message: 'Unavailable.',
} as const

function controlledResponse(chunks: Uint8Array[], status: number) {
  let reads = 0
  let bytes = 0
  let cancelCount = 0
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      const chunk = chunks[reads]
      if (!chunk) { controller.close(); return }
      reads += 1
      bytes += chunk.byteLength
      controller.enqueue(chunk)
    },
    cancel() { cancelCount += 1 },
  }, { highWaterMark: 0 })
  return {
    response: new Response(body, { status }),
    reads: () => reads,
    bytesDelivered: () => bytes,
    cancelled: () => cancelCount > 0,
  }
}

function withHeader(response: Response, contentLength: string | undefined): Response {
  const headers = new Headers(response.headers)
  if (contentLength !== undefined) headers.set('Content-Length', contentLength)
  return new Response(response.body, { status: response.status, headers })
}
