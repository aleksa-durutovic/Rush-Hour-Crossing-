import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  HintServiceError,
  TransientHintProviderError,
  createHintService,
  type HintProvider,
} from '../../server/agent/hint-service'
import { findSafePath } from '../../server/agent/tools/find-safe-path'
import type { HintSnapshot, HintSolverResult } from '../../shared/hint-agent-contract'
import { nearGoalSnapshot, nearGoalSolverResult } from '../hints/fixtures'

function createProvider(): {
  provider: HintProvider
  proposePath: ReturnType<typeof vi.fn<HintProvider['proposePath']>>
  explainVerifiedPath: ReturnType<typeof vi.fn<HintProvider['explainVerifiedPath']>>
} {
  const proposePath = vi.fn<HintProvider['proposePath']>().mockResolvedValue({
    calls: [{ name: 'find_safe_path', args: {} }],
    continuation: { callId: 'opaque-server-only' },
  })
  const explainVerifiedPath = vi.fn<HintProvider['explainVerifiedPath']>().mockResolvedValue({
    explanation: 'Follow the verified route to the next crossing.',
  })
  return {
    provider: { proposePath, explainVerifiedPath },
    proposePath,
    explainVerifiedPath,
  }
}

describe('bounded Hint agent service', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('validates the proposal, executes one solver, and sends only normalized evidence to step two', async () => {
    const { provider, proposePath, explainVerifiedPath } = createProvider()
    const solver = vi.fn((_snapshot: HintSnapshot): HintSolverResult => nearGoalSolverResult)
    const service = createHintService(provider, { solver })

    const response = await service.analyze(nearGoalSnapshot, new AbortController().signal)

    expect(response.outcome).toBe('verified')
    expect(response.steps).toEqual(nearGoalSolverResult.steps)
    expect(proposePath).toHaveBeenCalledTimes(1)
    expect(solver).toHaveBeenCalledTimes(1)
    expect(solver).toHaveBeenCalledWith(nearGoalSnapshot)
    expect(explainVerifiedPath).toHaveBeenCalledTimes(1)
    expect(explainVerifiedPath.mock.calls[0]?.[0]).toEqual({ callId: 'opaque-server-only' })
    expect(explainVerifiedPath.mock.calls[0]?.[1]).toEqual({
      outcome: 'verified',
      actionCount: 1,
      finalCrossings: 1,
      unchangedLives: 3,
    })
    expect(JSON.stringify(explainVerifiedPath.mock.calls[0]?.[1])).not.toContain('entered')
  })

  it('returns the next crossing without routing through the remaining configured crossings', async () => {
    const origin = { ...nearGoalSnapshot, crossingsToWin: 3 }
    const { provider } = createProvider()
    const service = createHintService(provider, { solver: findSafePath })

    const response = await service.analyze(origin, new AbortController().signal)

    expect(response.outcome).toBe('verified')
    expect(response.steps).toHaveLength(1)
    expect(response.steps.at(-1)).toMatchObject({
      entered: { x: 4, y: 0 },
      crossings: 1,
      status: 'active',
      lives: origin.lives,
    })
  })

  it.each([
    ['unknown tool name', [{ name: 'read_files', args: {} }]],
    ['non-empty arguments', [{ name: 'find_safe_path', args: { maxNodes: 1 } }]],
    ['multiple tool calls', [
      { name: 'find_safe_path', args: {} },
      { name: 'find_safe_path', args: {} },
    ]],
  ])('rejects %s before solver execution', async (_label, calls) => {
    const { provider, proposePath, explainVerifiedPath } = createProvider()
    proposePath.mockResolvedValue({ calls, continuation: {} })
    const solver = vi.fn((_snapshot: HintSnapshot): HintSolverResult => nearGoalSolverResult)
    const service = createHintService(provider, { solver })

    await expect(service.analyze(nearGoalSnapshot, new AbortController().signal)).rejects.toBeInstanceOf(HintServiceError)
    expect(solver).not.toHaveBeenCalled()
    expect(explainVerifiedPath).not.toHaveBeenCalled()
  })

  it('does not call the provider for an invalid request snapshot', async () => {
    const { provider, proposePath, explainVerifiedPath } = createProvider()
    const solver = vi.fn((_snapshot: HintSnapshot): HintSolverResult => nearGoalSolverResult)
    const service = createHintService(provider, { solver })

    await expect(
      service.analyze({ ...nearGoalSnapshot, crossings: nearGoalSnapshot.crossingsToWin }, new AbortController().signal),
    ).rejects.toBeInstanceOf(HintServiceError)
    expect(proposePath).not.toHaveBeenCalled()
    expect(solver).not.toHaveBeenCalled()
    expect(explainVerifiedPath).not.toHaveBeenCalled()
  })

  it('replays and rejects a malformed solver trace before provider continuation', async () => {
    const { provider, explainVerifiedPath } = createProvider()
    const invalidSolver = (): HintSolverResult => ({
      outcome: 'verified',
      steps: [{ ...nearGoalSolverResult.steps[0]!, x: 0 }],
    })
    const service = createHintService(provider, { solver: invalidSolver })

    await expect(service.analyze(nearGoalSnapshot, new AbortController().signal)).rejects.toBeInstanceOf(HintServiceError)
    expect(explainVerifiedPath).not.toHaveBeenCalled()
  })

  it('maps a solver exception to a safe failure without calling model step two', async () => {
    const { provider, explainVerifiedPath } = createProvider()
    const service = createHintService(provider, {
      solver: () => { throw new Error('private solver diagnostic') },
    })

    await expect(service.analyze(nearGoalSnapshot, new AbortController().signal)).rejects.toMatchObject({
      name: 'HintServiceError',
      code: 'HINT_UNAVAILABLE',
    })
    expect(explainVerifiedPath).not.toHaveBeenCalled()
  })

  it('returns fixed outcomes for exhaustive no-route and search-limit results without a model claim', async () => {
    const { provider, explainVerifiedPath } = createProvider()
    const noRoute = createHintService(provider, {
      solver: () => ({ outcome: 'no_safe_path', steps: [] }),
    })
    const limited = createHintService(provider, {
      solver: () => ({ outcome: 'search_limit', steps: [] }),
    })

    await expect(noRoute.analyze(nearGoalSnapshot, new AbortController().signal)).resolves.toMatchObject({
      outcome: 'no_safe_path',
      explanation: '',
      steps: [],
    })
    await expect(limited.analyze(nearGoalSnapshot, new AbortController().signal)).resolves.toMatchObject({
      outcome: 'search_limit',
      explanation: '',
      steps: [],
    })
    expect(explainVerifiedPath).not.toHaveBeenCalled()
  })

  it('retries only transient provider failures and never repeats the solver', async () => {
    const { provider, proposePath, explainVerifiedPath } = createProvider()
    proposePath.mockRejectedValueOnce(new TransientHintProviderError())
    const service = createHintService(provider)

    await service.analyze(nearGoalSnapshot, new AbortController().signal)

    expect(proposePath).toHaveBeenCalledTimes(2)
    expect(explainVerifiedPath).toHaveBeenCalledTimes(1)
  })

  it('does not retry malformed explanation or permanent provider failures', async () => {
    const malformed = createProvider()
    malformed.explainVerifiedPath.mockResolvedValue({ explanation: 'ok', route: [] })
    const malformedService = createHintService(malformed.provider)

    await expect(malformedService.analyze(nearGoalSnapshot, new AbortController().signal)).rejects.toBeInstanceOf(HintServiceError)
    expect(malformed.explainVerifiedPath).toHaveBeenCalledTimes(1)

    const permanent = createProvider()
    permanent.proposePath.mockRejectedValue(new Error('private provider detail'))
    const permanentService = createHintService(permanent.provider)
    await expect(permanentService.analyze(nearGoalSnapshot, new AbortController().signal)).rejects.toBeInstanceOf(HintServiceError)
    expect(permanent.proposePath).toHaveBeenCalledTimes(1)
  })

  it('caps a step at two attempts with a 15-second attempt timeout', async () => {
    vi.useFakeTimers()
    const { provider, proposePath } = createProvider()
    proposePath.mockImplementation(() => new Promise(() => undefined))
    const service = createHintService(provider)
    const result = service.analyze(nearGoalSnapshot, new AbortController().signal)
    const rejected = expect(result).rejects.toBeInstanceOf(HintServiceError)

    await vi.advanceTimersByTimeAsync(30_000)
    await rejected
    expect(proposePath).toHaveBeenCalledTimes(2)
  })

  it('enforces the 45-second total deadline across both model steps', async () => {
    vi.useFakeTimers()
    const { provider, proposePath, explainVerifiedPath } = createProvider()
    proposePath
      .mockImplementationOnce((_snapshot, _signal) => new Promise((_resolve, reject) => {
        setTimeout(() => reject(new TransientHintProviderError()), 14_900)
      }))
      .mockImplementationOnce(async () => ({ calls: [{ name: 'find_safe_path', args: {} }], continuation: {} }))
    explainVerifiedPath
      .mockImplementationOnce(() => new Promise(() => undefined))
      .mockImplementationOnce(() => new Promise(() => undefined))
    const service = createHintService(provider)
    const result = service.analyze(nearGoalSnapshot, new AbortController().signal)
    const rejected = expect(result).rejects.toBeInstanceOf(HintServiceError)

    await vi.advanceTimersByTimeAsync(45_000)
    await rejected
    expect(proposePath).toHaveBeenCalledTimes(2)
    expect(explainVerifiedPath).toHaveBeenCalledTimes(2)
  })

  it('stops when the caller cancels and exposes no internal error details', async () => {
    const controller = new AbortController()
    const { provider, proposePath } = createProvider()
    proposePath.mockImplementation(() => new Promise(() => undefined))
    const service = createHintService(provider)
    const result = service.analyze(nearGoalSnapshot, controller.signal)
    controller.abort()

    await expect(result).rejects.toMatchObject({ name: 'HintServiceError', code: 'HINT_UNAVAILABLE' })
    expect(proposePath).toHaveBeenCalledTimes(1)
  })
})
