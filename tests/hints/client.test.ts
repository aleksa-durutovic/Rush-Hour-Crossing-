import { afterEach, describe, expect, it, vi } from 'vitest'
import { requestHint } from '../../src/hints/client'
import { HINT_RESPONSE_MAX_BYTES } from '../../shared/hint-agent-contract'
import { nearGoalHintResponse, nearGoalSnapshot } from './fixtures'

afterEach(() => vi.unstubAllGlobals())

describe('Hint browser client', () => {
  it('posts only the snapshot to the same-origin endpoint without caching', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(nearGoalHintResponse()), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }))
    vi.stubGlobal('fetch', fetchMock)
    const controller = new AbortController()

    await expect(requestHint(nearGoalSnapshot, controller.signal)).resolves.toEqual(nearGoalHintResponse())
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/hint')
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nearGoalSnapshot),
      signal: controller.signal,
      cache: 'no-store',
    })
  })

  it.each([
    ['malformed JSON', '{'],
    ['a mismatched origin', JSON.stringify(nearGoalHintResponse({ ...nearGoalSnapshot, tick: 1 }))],
    ['an invalid DTO', JSON.stringify({ ...nearGoalHintResponse(), route: [] })],
  ])('returns a safe failure for %s', async (_label, body) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(body, { status: 200 })))

    await expect(requestHint(nearGoalSnapshot, new AbortController().signal)).resolves.toBeNull()
  })

  it('rejects an oversized response body before parsing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(' '.repeat(HINT_RESPONSE_MAX_BYTES + 1), { status: 200 })))

    await expect(requestHint(nearGoalSnapshot, new AbortController().signal)).resolves.toBeNull()
  })

  it('returns a safe failure for non-success responses and network errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('provider secret', { status: 503 })))
    await expect(requestHint(nearGoalSnapshot, new AbortController().signal)).resolves.toBeNull()

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('private provider detail')))
    await expect(requestHint(nearGoalSnapshot, new AbortController().signal)).resolves.toBeNull()
  })
})
