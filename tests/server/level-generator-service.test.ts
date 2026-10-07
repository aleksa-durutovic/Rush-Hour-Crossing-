import { afterEach, describe, expect, it, vi } from 'vitest'
import { getGeneratedLevelTemplate } from '../../src/config/generated-level'
import { createSolveLevelTool } from '../../server/level-generator/solve-tool'
import {
  createLevelGeneratorService,
  InvalidGenerationRequestError,
} from '../../server/level-generator/service'
import { GeneratorModelError, type GeneratorDecisionContext, type LevelGeneratorModel } from '../../server/level-generator/model'
import type { SolveLevelTool } from '../../server/level-generator/solve-tool'
import { ProviderFailure, type ProviderRole } from '../../server/ai/failover-policy'

const signal = (): AbortSignal => new AbortController().signal
const easyTemplate = getGeneratedLevelTemplate(1)

afterEach(() => vi.useRealTimers())

function finalFor(context: GeneratorDecisionContext, index = 0) {
  const evidence = context.evaluations[index]
  if (!evidence) throw new Error('The script expected a prior solveLevel evaluation.')
  return {
    kind: 'final',
    candidateId: evidence.candidateId,
    evaluationId: evidence.evaluationId,
    summary: 'Select the verified level.',
  }
}

function modelWith(script: (context: GeneratorDecisionContext, decision: number) => unknown): LevelGeneratorModel {
  let decision = 0
  return {
    decide: vi.fn(async (context: GeneratorDecisionContext) => script(context, ++decision)),
  }
}

describe('bounded level generator service', () => {
  it('supplies previous validated traffic and rating bands without exposing internal proof', async () => {
    const model = modelWith((context, decision) => {
      expect(context).toMatchObject({ ratingBands: { 3: { minimumMoves: 11, maximumMoves: 12 } } })
      expect(context.rules.join(' ')).toContain('(4, 6)')
      if (decision === 1) {
        expect(context).toMatchObject({ candidates: [] })
        return { kind: 'tool_request', name: 'solveLevel', arguments: { lanes: easyTemplate } }
      }
      expect(context).toMatchObject({ candidates: [{ candidateId: 'c1', evaluationId: 'e1', lanes: easyTemplate }] })
      expect(JSON.stringify(context)).not.toMatch(/winningActions|firstCrossingActions/)
      // Provider input must not be able to mutate the stored, solver-verified candidate.
      const memory = (context as unknown as { candidates: { lanes: { vehicleStarts: number[] }[] }[] }).candidates
      memory[0]!.lanes[0]!.vehicleStarts[0] = 8
      context.request.targetDifficulty = 5
      context.evaluations[0]!.computedDifficulty = 5
      return finalFor(context)
    })
    const result = await createLevelGeneratorService({ model }).generate(
      { targetDifficulty: 1, lives: 3, crossingsToWin: 1 }, signal())
    expect(result).toMatchObject({ kind: 'preview', completed: true, lanes: easyTemplate })
  })

  it('never packages a stored fallback whose witness cannot replay a safe win', async () => {
    const real = createSolveLevelTool()
    const solver: SolveLevelTool = { ...real, execute: vi.fn(async input => {
      const output = await real.execute(input)
      return { ...output, proof: { ...output.proof, winningActions: Array.from({ length: output.evidence.minMoves ?? 0 }, () => 'wait' as const) } }
    }) }
    const model = modelWith(() => ({ kind: 'tool_request', name: 'solveLevel', arguments: { lanes: easyTemplate } }))
    const result = await createLevelGeneratorService({ model, solver }).generate(
      { targetDifficulty: 1, lives: 3, crossingsToWin: 1 }, signal())
    expect(result).toMatchObject({ kind: 'unavailable', completed: false, stopReason: 'repeated_action' })
    expect(solver.execute).toHaveBeenCalledTimes(1)
  })

  it('uses the reserved five seconds for final verification after a timely final decision', async () => {
    let now = 0
    let calls = 0
    const real = createSolveLevelTool({ now: () => now })
    const solver: SolveLevelTool = { ...real, execute: vi.fn(async input => {
      const output = await real.execute(input)
      if (++calls === 2) now = 40_100
      return output
    }) }
    const model = modelWith((context, decision) => {
      if (decision === 1) return { kind: 'tool_request', name: 'solveLevel', arguments: { lanes: easyTemplate } }
      now = 39_999
      return finalFor(context)
    })
    const result = await createLevelGeneratorService({ model, solver, now: () => now }).generate(
      { targetDifficulty: 1, lives: 3, crossingsToWin: 1 }, signal())
    expect(result).toMatchObject({ kind: 'preview', completed: true, elapsedMs: 40_100 })
    expect(result.counters.toolCallCount).toBe(2)
  })

  it('completes after two decisions with an actual local solve and separate final verification', async () => {
    const model = modelWith((context, decision) => decision === 1
      ? { kind: 'tool_request', name: 'solveLevel', arguments: { lanes: easyTemplate } }
      : finalFor(context))
    const service = createLevelGeneratorService({ model, solver: createSolveLevelTool() })

    const result = await service.generate({ targetDifficulty: 1, lives: 3, crossingsToWin: 1 }, signal())

    expect(result).toMatchObject({ kind: 'preview', status: 'completed', completed: true, stopReason: 'goal_completed' })
    expect(result.counters).toMatchObject({
      stepCount: 2, providerAttemptCount: 2, modelToolCallCount: 1, toolCallCount: 2, revisionCount: 0,
    })
    expect(model.decide).toHaveBeenCalledTimes(2)
    if (result.kind !== 'preview') return
    expect(result.lanes).toEqual(easyTemplate)
    expect(result.verified).toBe(true)
    expect(result.measurements.minMoves).toBe(6)
  })

  it('verifies the requested rating and every crossing in the captured three-crossing target', async () => {
    const candidate = getGeneratedLevelTemplate(3)
    const model = modelWith((context, decision) => decision === 1
      ? { kind: 'tool_request', name: 'solveLevel', arguments: { lanes: candidate } }
      : finalFor(context))
    const service = createLevelGeneratorService({ model, solver: createSolveLevelTool() })

    const result = await service.generate({ targetDifficulty: 3, lives: 3, crossingsToWin: 3 }, signal())

    expect(result).toMatchObject({ kind: 'preview', status: 'completed', stopReason: 'goal_completed', requestedDifficulty: 3, computedDifficulty: 3 })
    if (result.kind !== 'preview') return
    expect(result.settings.crossingsToWin).toBe(3)
    expect(result.measurements).toMatchObject({ firstCrossingMinMoves: 11, minMoves: 31 })
    expect(result.counters).toMatchObject({ stepCount: 2, providerAttemptCount: 2, modelToolCallCount: 1, toolCallCount: 2 })
  })

  it('rejects invalid request fields before any model or solver operation', async () => {
    const model = modelWith(() => ({ kind: 'refusal', reason: 'cannot_satisfy_goal' }))
    const solver = createSolveLevelTool()
    const execute = vi.spyOn(solver, 'execute')
    const service = createLevelGeneratorService({ model, solver })

    await expect(service.generate({ targetDifficulty: '3', lives: 3, crossingsToWin: 3 }, signal()))
      .rejects.toBeInstanceOf(InvalidGenerationRequestError)
    expect(model.decide).not.toHaveBeenCalled()
    expect(execute).not.toHaveBeenCalled()
  })

  it('does not accept an early final before solver evidence exists', async () => {
    const model = modelWith(() => ({ kind: 'final', candidateId: 'c1', evaluationId: 'e1', summary: 'too early' }))
    const service = createLevelGeneratorService({ model, solver: createSolveLevelTool() })

    const result = await service.generate({ targetDifficulty: 1, lives: 3, crossingsToWin: 1 }, signal())

    expect(result).toMatchObject({ kind: 'unavailable', status: 'failed', completed: false, stopReason: 'invalid_final_selection' })
    expect(result.counters).toMatchObject({ stepCount: 1, providerAttemptCount: 1, toolCallCount: 0 })
  })

  it('rejects a final selection that references the wrong evaluation', async () => {
    const model = modelWith((context, decision) => decision === 1
      ? { kind: 'tool_request', name: 'solveLevel', arguments: { lanes: easyTemplate } }
      : { ...finalFor(context), evaluationId: 'e999' })
    const service = createLevelGeneratorService({ model, solver: createSolveLevelTool() })

    const result = await service.generate({ targetDifficulty: 1, lives: 3, crossingsToWin: 1 }, signal())

    expect(result).toMatchObject({ kind: 'unavailable', status: 'failed', stopReason: 'invalid_final_selection', completed: false })
    expect(result.counters.toolCallCount).toBe(1)
  })

  it('returns impossible evidence to the model, accepts one distinct revision and finalizes only the solved candidate', async () => {
    const impossible = [
      { row: 1, direction: 'right', moveEveryTicks: 1, vehicleLength: 2, vehicleStarts: [0, 2, 4, 6] },
      ...getGeneratedLevelTemplate(1).slice(1),
    ]
    const model = modelWith((context, decision) => {
      if (decision === 1) return { kind: 'tool_request', name: 'solveLevel', arguments: { lanes: impossible } }
      if (decision === 2) {
        expect(context.evaluations[0]?.outcome).toBe('unsolvable')
        return { kind: 'tool_request', name: 'solveLevel', arguments: { lanes: easyTemplate } }
      }
      expect(context.evaluations.map((item) => item.outcome)).toEqual(['unsolvable', 'solved'])
      return finalFor(context, 1)
    })
    const service = createLevelGeneratorService({ model, solver: createSolveLevelTool() })

    const result = await service.generate({ targetDifficulty: 1, lives: 3, crossingsToWin: 1 }, signal())

    expect(result).toMatchObject({ kind: 'preview', status: 'completed', completed: true })
    expect(result.counters).toMatchObject({ stepCount: 3, modelToolCallCount: 2, toolCallCount: 3, revisionCount: 1 })
    if (result.kind !== 'preview') return
    expect(result.lanes).toEqual(easyTemplate)
  })

  it('revalidates the exact selected traffic and returns a non-completed fallback on rating mismatch', async () => {
    const model = modelWith((context, decision) => decision === 1
      ? { kind: 'tool_request', name: 'solveLevel', arguments: { lanes: easyTemplate } }
      : finalFor(context))
    const service = createLevelGeneratorService({ model, solver: createSolveLevelTool() })

    const result = await service.generate({ targetDifficulty: 2, lives: 3, crossingsToWin: 1 }, signal())

    expect(result).toMatchObject({ kind: 'preview', status: 'stopped', completed: false, stopReason: 'target_not_met' })
    expect(result.counters.toolCallCount).toBe(2)
    if (result.kind !== 'preview') return
    expect(result.requestedDifficulty).toBe(2)
    expect(result.computedDifficulty).toBe(1)
    expect(result.lanes).toEqual(easyTemplate)
  })

  it('rejects an unknown first tool without executing verification or offering fallback', async () => {
    const model = modelWith(() => ({ kind: 'tool_request', name: 'solveAnything', arguments: { lanes: easyTemplate } }))
    const solver = createSolveLevelTool()
    const execute = vi.spyOn(solver, 'execute')
    const service = createLevelGeneratorService({ model, solver })

    const result = await service.generate({ targetDifficulty: 1, lives: 3, crossingsToWin: 1 }, signal())

    expect(result).toMatchObject({ kind: 'unavailable', status: 'failed', completed: false, stopReason: 'unknown_tool' })
    expect(result.counters.toolCallCount).toBe(0)
    expect(execute).not.toHaveBeenCalled()
  })

  it('rejects malformed solveLevel arguments before any solver execution', async () => {
    const model = modelWith(() => ({ kind: 'tool_request', name: 'solveLevel', arguments: { lanes: easyTemplate, settings: { lives: 5 } } }))
    const solver = createSolveLevelTool()
    const execute = vi.spyOn(solver, 'execute')
    const service = createLevelGeneratorService({ model, solver })

    const result = await service.generate({ targetDifficulty: 1, lives: 3, crossingsToWin: 1 }, signal())

    expect(result).toMatchObject({ kind: 'unavailable', status: 'failed', stopReason: 'invalid_tool_arguments' })
    expect(result.counters.toolCallCount).toBe(0)
    expect(execute).not.toHaveBeenCalled()
  })

  it('rejects malformed tool evidence without creating a candidate or security fallback', async () => {
    const model = modelWith(() => ({ kind: 'tool_request', name: 'solveLevel', arguments: { lanes: easyTemplate } }))
    const solver = { execute: vi.fn(async () => ({ evidence: { outcome: 'solved', computedDifficulty: 1 }, proof: { winningActions: [] } })) , searchFactory: createSolveLevelTool().searchFactory } as unknown as SolveLevelTool
    const service = createLevelGeneratorService({ model, solver })

    const result = await service.generate({ targetDifficulty: 1, lives: 3, crossingsToWin: 1 }, signal())

    expect(result).toMatchObject({ kind: 'unavailable', status: 'failed', completed: false, stopReason: 'invalid_tool_result' })
    expect(result.counters.toolCallCount).toBe(1)
    expect(result.counters.modelToolCallCount).toBe(1)
  })

  it('rejects malformed model decisions without calling the solver', async () => {
    const model = modelWith(() => ({ kind: 'tool_request', name: 'solveLevel', arguments: { lanes: easyTemplate }, extra: true }))
    const solver = createSolveLevelTool()
    const execute = vi.spyOn(solver, 'execute')
    const service = createLevelGeneratorService({ model, solver })

    const result = await service.generate({ targetDifficulty: 1, lives: 3, crossingsToWin: 1 }, signal())

    expect(result).toMatchObject({ kind: 'unavailable', status: 'failed', stopReason: 'invalid_model_proposal' })
    expect(result.counters.toolCallCount).toBe(0)
    expect(execute).not.toHaveBeenCalled()
  })

  it('stops a third revision before executing its candidate', async () => {
    const candidates = [1, 2, 3, 4].map((rating) => getGeneratedLevelTemplate(rating as 1 | 2 | 3 | 4))
    const model = modelWith((_, decision) => ({ kind: 'tool_request', name: 'solveLevel', arguments: { lanes: candidates[decision - 1] } }))
    const solver = createSolveLevelTool()
    const execute = vi.spyOn(solver, 'execute')
    const service = createLevelGeneratorService({ model, solver })

    const result = await service.generate({ targetDifficulty: 1, lives: 3, crossingsToWin: 1 }, signal())

    expect(result).toMatchObject({ kind: 'preview', source: 'last_verified', status: 'stopped', stopReason: 'revision_limit', completed: false, computedDifficulty: 3 })
    expect(result.counters).toMatchObject({ stepCount: 4, modelToolCallCount: 3, revisionCount: 2, toolCallCount: 3 })
    expect(execute).toHaveBeenCalledTimes(3)
  })

  it('withholds preview when separate final verification does not reproduce the proof', async () => {
    const realSolver = createSolveLevelTool()
    let calls = 0
    const solver: SolveLevelTool = {
      searchFactory: realSolver.searchFactory,
      execute: vi.fn(async (input) => {
        const result = await realSolver.execute(input)
        calls += 1
        return calls === 2 ? { ...result, proof: { ...result.proof, winningActions: [] } } : result
      }),
    }
    const model = modelWith((context, decision) => decision === 1
      ? { kind: 'tool_request', name: 'solveLevel', arguments: { lanes: easyTemplate } }
      : finalFor(context))
    const service = createLevelGeneratorService({ model, solver })

    const result = await service.generate({ targetDifficulty: 1, lives: 3, crossingsToWin: 1 }, signal())

    expect(result).toMatchObject({ kind: 'unavailable', status: 'failed', stopReason: 'final_verification_failed', completed: false })
    expect(result.counters.toolCallCount).toBe(2)
  })

  it('retries one transient provider failure within the run-wide attempt budget', async () => {
    const decide = vi.fn()
      .mockRejectedValueOnce(new GeneratorModelError('transient'))
      .mockImplementationOnce(async () => ({ kind: 'tool_request', name: 'solveLevel', arguments: { lanes: easyTemplate } }))
      .mockImplementationOnce(async (context: GeneratorDecisionContext) => finalFor(context))
    const model: LevelGeneratorModel = { decide }
    const service = createLevelGeneratorService({ model, solver: createSolveLevelTool(), waitBeforeRetry: async () => {} })

    const result = await service.generate({ targetDifficulty: 1, lives: 3, crossingsToWin: 1 }, signal())

    expect(result).toMatchObject({ kind: 'preview', status: 'completed' })
    expect(result.counters).toMatchObject({ stepCount: 2, providerAttemptCount: 3, retryCount: 1, toolCallCount: 2 })
    expect(decide).toHaveBeenCalledTimes(3)
    expect(decide.mock.calls[1]?.[0].counters).toMatchObject({ stepCount: 1, providerAttemptCount: 2, retryCount: 1 })
  })

  it('stops exactly at six provider attempts while keeping retries inside each decision', async () => {
    const decisions = [
      new GeneratorModelError('transient'),
      { kind: 'tool_request', name: 'solveLevel', arguments: { lanes: easyTemplate } },
      new GeneratorModelError('transient'),
      { kind: 'tool_request', name: 'solveLevel', arguments: { lanes: getGeneratedLevelTemplate(2) } },
      new GeneratorModelError('transient'),
    ] as const
    let index = 0
    const model: LevelGeneratorModel = {
      decide: vi.fn(async (context) => {
        const next = decisions[index++]
        if (next instanceof Error) throw next
        if (next) return next
        return finalFor(context)
      }),
    }
    const service = createLevelGeneratorService({ model, solver: createSolveLevelTool(), waitBeforeRetry: async () => {} })

    const result = await service.generate({ targetDifficulty: 1, lives: 3, crossingsToWin: 1 }, signal())

    expect(result).toMatchObject({ kind: 'preview', status: 'completed' })
    expect(result.counters).toMatchObject({ stepCount: 3, providerAttemptCount: 6, retryCount: 3, modelToolCallCount: 2, toolCallCount: 3 })
    expect(model.decide).toHaveBeenCalledTimes(6)
  })

  it('times out each hung provider attempt, makes one retry, then counts verified fallback', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    try {
      const attemptSignals: AbortSignal[] = []
      const model: LevelGeneratorModel = {
        decide: vi.fn((_context, attemptSignal) => {
          attemptSignals.push(attemptSignal)
          return new Promise(() => {})
        }),
      }
      const service = createLevelGeneratorService({ model, waitBeforeRetry: async () => {} })
      const pending = service.generate({ targetDifficulty: 1, lives: 3, crossingsToWin: 1 }, signal())
      await vi.waitFor(() => expect(model.decide).toHaveBeenCalledTimes(1))
      await vi.advanceTimersByTimeAsync(15_000)
      await vi.waitFor(() => expect(model.decide).toHaveBeenCalledTimes(2))
      await vi.advanceTimersByTimeAsync(15_000)

      const result = await pending

      expect(result).toMatchObject({ kind: 'preview', status: 'stopped', stopReason: 'provider_failed', completed: false, source: 'template' })
      expect(result.counters).toMatchObject({ stepCount: 1, providerAttemptCount: 2, retryCount: 1, toolCallCount: 1 })
      expect(attemptSignals.every((attemptSignal) => attemptSignal.aborted)).toBe(true)
    } finally {
      vi.useRealTimers()
    }
  })

  it('allows exactly two distinct revisions and counts final verification separately', async () => {
    const candidates = [1, 2, 3].map((rating) => getGeneratedLevelTemplate(rating as 1 | 2 | 3))
    const model = modelWith((context, decision) => decision <= 3
      ? { kind: 'tool_request', name: 'solveLevel', arguments: { lanes: candidates[decision - 1] } }
      : finalFor(context, 0))
    const service = createLevelGeneratorService({ model, solver: createSolveLevelTool() })

    const result = await service.generate({ targetDifficulty: 1, lives: 3, crossingsToWin: 1 }, signal())

    expect(result).toMatchObject({ kind: 'preview', status: 'completed', completed: true })
    expect(result.counters).toMatchObject({ stepCount: 4, modelToolCallCount: 3, revisionCount: 2, toolCallCount: 4 })
    expect(result.counters.toolCallCount).toBeLessThanOrEqual(8)
  })

  it('stops at the 40-second decision cutoff even when the run deadline has not elapsed', async () => {
    let now = 0
    const model = modelWith(() => {
      now = 40_000
      return { kind: 'refusal', reason: 'cannot_satisfy_goal' }
    })
    const service = createLevelGeneratorService({ model, solver: createSolveLevelTool({ now: () => now }), now: () => now })

    const result = await service.generate({ targetDifficulty: 1, lives: 3, crossingsToWin: 1 }, signal())

    expect(result).toMatchObject({ kind: 'preview', source: 'template', stopReason: 'deadline', completed: false })
    expect(result.elapsedMs).toBe(40_000)
    expect(result.counters.providerAttemptCount).toBe(1)
  })

  it('stops at the 45-second absolute run deadline and does not start verification', async () => {
    let now = 0
    const model = modelWith(() => {
      now = 45_000
      return { kind: 'refusal', reason: 'cannot_satisfy_goal' }
    })
    const solver = createSolveLevelTool({ now: () => now })
    const execute = vi.spyOn(solver, 'execute')
    const service = createLevelGeneratorService({ model, solver, now: () => now })

    const result = await service.generate({ targetDifficulty: 1, lives: 3, crossingsToWin: 1 }, signal())

    expect(result).toMatchObject({ kind: 'unavailable', status: 'stopped', stopReason: 'deadline', completed: false })
    expect(result.elapsedMs).toBe(45_000)
    expect(execute).not.toHaveBeenCalled()
  })

  it('detects reordered repeats and never exceeds the eight-execution ceiling including verification', async () => {
    const reordered = [...easyTemplate].reverse().map((lane) => ({ ...lane, vehicleStarts: [...lane.vehicleStarts].reverse() }))
    const model = modelWith((_, decision) => decision === 1
      ? { kind: 'tool_request', name: 'solveLevel', arguments: { lanes: easyTemplate } }
      : { kind: 'tool_request', name: 'solveLevel', arguments: { lanes: reordered } })
    const solver = createSolveLevelTool()
    const execute = vi.spyOn(solver, 'execute')
    const service = createLevelGeneratorService({ model, solver })

    const result = await service.generate({ targetDifficulty: 1, lives: 3, crossingsToWin: 1 }, signal())

    expect(result).toMatchObject({ kind: 'preview', source: 'last_verified', stopReason: 'repeated_action', completed: false })
    expect(result.counters.toolCallCount).toBe(1)
    expect(execute).toHaveBeenCalledTimes(1)
    expect(result.counters.toolCallCount).toBeLessThanOrEqual(8)
  })

  it('returns the last solved candidate as an explicitly incomplete operational fallback', async () => {
    const decide = vi.fn()
      .mockImplementationOnce(async () => ({ kind: 'tool_request', name: 'solveLevel', arguments: { lanes: easyTemplate } }))
      .mockRejectedValueOnce(new GeneratorModelError('permanent'))
    const service = createLevelGeneratorService({ model: { decide }, solver: createSolveLevelTool() })

    const result = await service.generate({ targetDifficulty: 1, lives: 3, crossingsToWin: 1 }, signal())

    expect(result).toMatchObject({ kind: 'preview', status: 'stopped', completed: false, stopReason: 'provider_failed', source: 'last_verified' })
    if (result.kind !== 'preview') return
    expect(result.requestedDifficulty).toBe(1)
    expect(result.computedDifficulty).toBe(1)
    expect(result.counters).toMatchObject({ modelToolCallCount: 1, toolCallCount: 1 })
  })

  it('verifies a rating-matched application template when provider failure left no solved candidate', async () => {
    const service = createLevelGeneratorService({
      model: { decide: vi.fn().mockRejectedValue(new GeneratorModelError('permanent')) },
      solver: createSolveLevelTool(),
    })

    const result = await service.generate({ targetDifficulty: 1, lives: 3, crossingsToWin: 1 }, signal())

    expect(result).toMatchObject({ kind: 'preview', status: 'stopped', completed: false, stopReason: 'provider_failed', source: 'template' })
    if (result.kind !== 'preview') return
    expect(result.lanes).toEqual(easyTemplate)
    expect(result.requestedDifficulty).toBe(result.computedDifficulty)
    expect(result.counters).toMatchObject({ modelToolCallCount: 0, toolCallCount: 1 })
  })

  it('preserves a solved candidate on operational failure with its measured rating clearly separate', async () => {
    const decide = vi.fn()
      .mockImplementationOnce(async () => ({ kind: 'tool_request', name: 'solveLevel', arguments: { lanes: easyTemplate } }))
      .mockRejectedValueOnce(new GeneratorModelError('permanent'))
    const service = createLevelGeneratorService({ model: { decide }, solver: createSolveLevelTool() })

    const result = await service.generate({ targetDifficulty: 2, lives: 3, crossingsToWin: 1 }, signal())

    expect(result).toMatchObject({ kind: 'preview', status: 'stopped', completed: false, stopReason: 'provider_failed', source: 'last_verified' })
    if (result.kind !== 'preview') return
    expect(result.requestedDifficulty).toBe(2)
    expect(result.computedDifficulty).toBe(1)
    expect(result.lanes).toEqual(easyTemplate)
    expect(result.counters.toolCallCount).toBe(1)
  })

  it('withholds operational fallback when the final solver does not return a proof witness', async () => {
    const realSolver = createSolveLevelTool()
    const solver = {
      searchFactory: realSolver.searchFactory,
      execute: vi.fn(async (input) => {
        const output = await realSolver.execute(input)
        return { ...output, proof: { ...output.proof, winningActions: null } }
      }),
    } as unknown as SolveLevelTool
    const service = createLevelGeneratorService({
      model: { decide: vi.fn().mockRejectedValue(new GeneratorModelError('permanent')) },
      solver,
    })

    const result = await service.generate({ targetDifficulty: 1, lives: 3, crossingsToWin: 1 }, signal())

    expect(result).toMatchObject({ kind: 'unavailable', status: 'failed', stopReason: 'provider_failed', completed: false })
    expect(result.counters.toolCallCount).toBe(1)
  })

  it('does not fall back when provider failure arrives inside the reserved verification window', async () => {
    let now = 0
    const service = createLevelGeneratorService({
      model: { decide: vi.fn(async () => { now = 43_001; throw new GeneratorModelError('permanent') }) },
      solver: createSolveLevelTool({ now: () => now }),
      now: () => now,
    })

    const result = await service.generate({ targetDifficulty: 1, lives: 3, crossingsToWin: 1 }, signal())

    expect(result).toMatchObject({ kind: 'unavailable', status: 'stopped', stopReason: 'deadline', completed: false })
    expect(result.counters.toolCallCount).toBe(0)
  })

  it('never starts fallback verification after cancellation', async () => {
    const controller = new AbortController()
    const solver = createSolveLevelTool()
    const execute = vi.spyOn(solver, 'execute')
    const model: LevelGeneratorModel = { decide: vi.fn(async () => { controller.abort(); throw new GeneratorModelError('permanent') }) }
    const service = createLevelGeneratorService({ model, solver })

    const result = await service.generate({ targetDifficulty: 1, lives: 3, crossingsToWin: 1 }, controller.signal)

    expect(result).toMatchObject({ kind: 'unavailable', status: 'stopped', stopReason: 'cancelled', completed: false })
    expect(execute).not.toHaveBeenCalled()
  })

  it('cancels an in-flight fallback solve without settling a late preview', async () => {
    const controller = new AbortController()
    const realSolver = createSolveLevelTool()
    const solver = {
      searchFactory: realSolver.searchFactory,
      execute: vi.fn((input: { signal: AbortSignal }) => new Promise((resolve) => {
        input.signal.addEventListener('abort', () => resolve({ evidence: null, proof: null }), { once: true })
      })),
    } as unknown as SolveLevelTool
    const service = createLevelGeneratorService({
      model: { decide: vi.fn().mockRejectedValue(new GeneratorModelError('permanent')) },
      solver,
    })
    const pending = service.generate({ targetDifficulty: 1, lives: 3, crossingsToWin: 1 }, controller.signal)
    await vi.waitFor(() => expect(solver.execute).toHaveBeenCalledTimes(1))
    controller.abort()

    const result = await pending

    expect(result).toMatchObject({ kind: 'unavailable', status: 'stopped', stopReason: 'cancelled', completed: false })
    expect(result.counters.toolCallCount).toBe(1)
  })

  it('uses one counted backup switch in the same run and verifies its candidate with the real solver', async () => {
    const primary: LevelGeneratorModel = {
      decide: vi.fn(async () => { throw new ProviderFailure('rate_limit') }),
    }
    const backupRoles: ProviderRole[] = []
    const backup = modelWith((context, decision) => {
      backupRoles.push('backup')
      if (decision === 1) {
        expect(context.counters).toMatchObject({ stepCount: 1, providerAttemptCount: 2, retryCount: 1 })
        return { kind: 'tool_request', name: 'solveLevel', arguments: { lanes: easyTemplate } }
      }
      expect(context.counters).toMatchObject({ stepCount: 2, providerAttemptCount: 3, retryCount: 1 })
      return finalFor(context)
    })
    const result = await createLevelGeneratorService({
      model: primary,
      backupModel: backup,
      failoverEnabled: true,
    }).generate({ targetDifficulty: 1, lives: 3, crossingsToWin: 1 }, signal())

    expect(result).toMatchObject({ kind: 'preview', completed: true, stopReason: 'goal_completed', lanes: easyTemplate })
    expect(result.counters).toMatchObject({
      stepCount: 2,
      providerAttemptCount: 3,
      retryCount: 1,
      modelToolCallCount: 1,
      toolCallCount: 2,
      revisionCount: 0,
    })
    expect(primary.decide).toHaveBeenCalledOnce()
    expect(backup.decide).toHaveBeenCalledTimes(2)
    expect(backupRoles).toEqual(['backup', 'backup'])
  })

  it('never fails over after a successful primary decision or a rejected primary output', async () => {
    const backup: LevelGeneratorModel = { decide: vi.fn(async () => ({
      kind: 'refusal', reason: 'cannot_satisfy_goal',
    })) }
    const successPrimary = modelWith((_context, decision) => decision === 1
      ? { kind: 'tool_request', name: 'solveLevel', arguments: { lanes: easyTemplate } }
      : finalFor(_context))
    const successful = await createLevelGeneratorService({
      model: successPrimary,
      backupModel: backup,
      failoverEnabled: true,
    }).generate({ targetDifficulty: 1, lives: 3, crossingsToWin: 1 }, signal())
    expect(successful).toMatchObject({ kind: 'preview', completed: true })
    expect(backup.decide).not.toHaveBeenCalled()

    const invalidPrimary: LevelGeneratorModel = { decide: vi.fn(async () => ({ kind: 'not-a-decision' })) }
    const rejected = await createLevelGeneratorService({
      model: invalidPrimary,
      backupModel: backup,
      failoverEnabled: true,
    }).generate({ targetDifficulty: 1, lives: 3, crossingsToWin: 1 }, signal())
    expect(rejected).toMatchObject({ kind: 'unavailable', stopReason: 'invalid_model_proposal' })
    expect(backup.decide).not.toHaveBeenCalled()
  })

  it('cancellation after an eligible primary failure prevents backup and all recovery work', async () => {
    const controller = new AbortController()
    const primary: LevelGeneratorModel = {
      decide: vi.fn(async () => {
        controller.abort()
        throw new ProviderFailure('rate_limit')
      }),
    }
    const backup: LevelGeneratorModel = { decide: vi.fn(async () => ({ kind: 'refusal', reason: 'cannot_satisfy_goal' })) }
    const solver = createSolveLevelTool()
    const execute = vi.spyOn(solver, 'execute')
    const result = await createLevelGeneratorService({
      model: primary,
      backupModel: backup,
      failoverEnabled: true,
      solver,
    }).generate({ targetDifficulty: 1, lives: 3, crossingsToWin: 1 }, controller.signal)

    expect(result).toMatchObject({ kind: 'unavailable', stopReason: 'cancelled', completed: false })
    expect(backup.decide).not.toHaveBeenCalled()
    expect(execute).not.toHaveBeenCalled()
    expect(result.counters).toMatchObject({ providerAttemptCount: 1, retryCount: 0, toolCallCount: 0 })
  })

  it('uses existing verified recovery when both providers fail without a third call', async () => {
    const primary: LevelGeneratorModel = {
      decide: vi.fn(async () => { throw new ProviderFailure('rate_limit') }),
    }
    const backup: LevelGeneratorModel = {
      decide: vi.fn(async () => { throw new ProviderFailure('temporary_unavailable') }),
    }
    const events: { event: string; status?: string }[] = []
    const result = await createLevelGeneratorService({
      model: primary,
      backupModel: backup,
      failoverEnabled: true,
      onEvidence: event => events.push(event),
    })
      .generate({ targetDifficulty: 1, lives: 3, crossingsToWin: 1 }, signal())
    expect(result).toMatchObject({ kind: 'preview', status: 'stopped', source: 'template', stopReason: 'provider_failed', verified: true })
    expect(primary.decide).toHaveBeenCalledOnce()
    expect(backup.decide).toHaveBeenCalledOnce()
    expect(result.counters.providerAttemptCount).toBe(2)
    expect(events).toContainEqual(expect.objectContaining({ event: 'recovery_selected', status: 'verified_recovery' }))
  })

  it('keeps provider exhaustion distinct from the outer generator deadline', async () => {
    vi.useFakeTimers()
    const primary: LevelGeneratorModel = { decide: vi.fn(() => new Promise<never>(() => undefined)) }
    const backup: LevelGeneratorModel = { decide: vi.fn(() => new Promise<never>(() => undefined)) }
    const pending = createLevelGeneratorService({
      model: primary,
      backupModel: backup,
      failoverEnabled: true,
      now: () => Date.now(),
    }).generate({ targetDifficulty: 1, lives: 3, crossingsToWin: 1 }, signal())
    const observed = pending.then(result => result)
    await vi.advanceTimersByTimeAsync(15_000)
    const result = await observed
    expect(result).toMatchObject({ kind: 'preview', source: 'template', status: 'stopped', stopReason: 'provider_failed' })
    expect(result.counters.providerAttemptCount).toBe(2)
    expect(primary.decide).toHaveBeenCalledOnce()
    expect(backup.decide).toHaveBeenCalledOnce()
  })

  it('starts a later request on primary after an earlier request switched to backup', async () => {
    const primary: LevelGeneratorModel = {
      decide: vi.fn()
        .mockRejectedValueOnce(new ProviderFailure('rate_limit'))
        .mockResolvedValue({ kind: 'refusal', reason: 'cannot_satisfy_goal' }),
    }
    const backup: LevelGeneratorModel = {
      decide: vi.fn(async () => ({ kind: 'refusal', reason: 'cannot_satisfy_goal' })),
    }
    const service = createLevelGeneratorService({ model: primary, backupModel: backup, failoverEnabled: true })
    const first = await service.generate({ targetDifficulty: 1, lives: 3, crossingsToWin: 1 }, signal())
    const second = await service.generate({ targetDifficulty: 1, lives: 3, crossingsToWin: 1 }, signal())
    expect(first.counters.providerAttemptCount).toBe(2)
    expect(second.counters.providerAttemptCount).toBe(1)
    expect(primary.decide).toHaveBeenCalledTimes(2)
    expect(backup.decide).toHaveBeenCalledOnce()
  })

  it('rejects an invalid backup decision with the same validation and no extra model call', async () => {
    const primary: LevelGeneratorModel = { decide: vi.fn(async () => { throw new ProviderFailure('rate_limit') }) }
    const backup: LevelGeneratorModel = { decide: vi.fn(async () => ({
      kind: 'tool_request', name: 'unknownTool', arguments: { lanes: easyTemplate },
    })) }
    const result = await createLevelGeneratorService({ model: primary, backupModel: backup, failoverEnabled: true })
      .generate({ targetDifficulty: 1, lives: 3, crossingsToWin: 1 }, signal())
    expect(result).toMatchObject({ kind: 'unavailable', status: 'failed', stopReason: 'unknown_tool' })
    expect(primary.decide).toHaveBeenCalledOnce()
    expect(backup.decide).toHaveBeenCalledOnce()
    expect(result.counters.toolCallCount).toBe(0)
  })

  it('propagates cancellation to a pending provider attempt and ignores its late decision', async () => {
    const controller = new AbortController()
    let receivedSignal: AbortSignal | undefined
    const model: LevelGeneratorModel = {
      decide: vi.fn((_context, attemptSignal) => {
        receivedSignal = attemptSignal
        return new Promise((resolve) => {
          attemptSignal.addEventListener('abort', () => resolve({ kind: 'tool_request', name: 'solveLevel', arguments: { lanes: easyTemplate } }), { once: true })
        })
      }),
    }
    const solver = createSolveLevelTool()
    const execute = vi.spyOn(solver, 'execute')
    const service = createLevelGeneratorService({ model, solver })
    const pending = service.generate({ targetDifficulty: 1, lives: 3, crossingsToWin: 1 }, controller.signal)
    await vi.waitFor(() => expect(model.decide).toHaveBeenCalledTimes(1))
    controller.abort()

    const result = await pending

    expect(receivedSignal?.aborted).toBe(true)
    expect(result).toMatchObject({ kind: 'unavailable', status: 'stopped', stopReason: 'cancelled', completed: false })
    expect(execute).not.toHaveBeenCalled()
  })
})
