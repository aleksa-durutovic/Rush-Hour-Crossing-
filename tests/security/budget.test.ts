import { describe, expect, it, vi } from 'vitest'
import { getGeneratedLevelTemplate } from '../../src/config/generated-level'
import { createSolveLevelTool, type SolveLevelTool } from '../../server/level-generator/solve-tool'
import { createLevelGeneratorService } from '../../server/level-generator/service'
import { GeneratorModelError } from '../../server/level-generator/model'
import type { GeneratorDecisionContext, LevelGeneratorModel } from '../../server/level-generator/model'
import { createAdmissionController } from '../../server/security/admission'

const settings = { targetDifficulty: 1, lives: 3, crossingsToWin: 1 }
const lanes = getGeneratedLevelTemplate(1)
const signal = (): AbortSignal => new AbortController().signal

describe('T11-T12 generator run budgets', () => {
  it('stops a reordered repeat before repeating solver work and returns only last verified preview', async () => {
    const reordered = [...lanes].reverse().map((lane) => ({
      ...lane,
      vehicleStarts: [...lane.vehicleStarts].reverse(),
    }))
    const decide = vi.fn(async (context: GeneratorDecisionContext) => context.counters.stepCount === 1
      ? { kind: 'tool_request', name: 'solveLevel', arguments: { lanes } }
      : { kind: 'tool_request', name: 'solveLevel', arguments: { lanes: reordered } })
    const model: LevelGeneratorModel = { decide }
    const solver = createSolveLevelTool()
    const execute = vi.spyOn(solver, 'execute')
    const result = await createLevelGeneratorService({ model, solver }).generate(settings, signal())

    expect(result).toMatchObject({
      kind: 'preview', status: 'stopped', stopReason: 'repeated_action',
      source: 'last_verified', completed: false,
    })
    expect(result.counters).toMatchObject({ providerAttemptCount: 2, stepCount: 2, toolCallCount: 1 })
    expect(decide).toHaveBeenCalledTimes(2)
    expect(execute).toHaveBeenCalledTimes(1)
  })

  it.each([
    [40_000, 'preview', 1],
    [45_000, 'unavailable', 0],
  ] as const)('stops at the exact %i ms boundary without starting later model work', async (boundary, kind, solverStarts) => {
    let now = 0
    const decide = vi.fn(async () => {
      now = boundary
      return { kind: 'refusal', reason: 'cannot_satisfy_goal' }
    })
    const solver = createSolveLevelTool({ now: () => now })
    const execute = vi.spyOn(solver, 'execute')
    const model: LevelGeneratorModel = { decide }
    const result = await createLevelGeneratorService({ model, solver, now: () => now }).generate(settings, signal())

    expect(result).toMatchObject({ kind, stopReason: 'deadline', elapsedMs: boundary, completed: false })
    expect(result.counters.providerAttemptCount).toBe(1)
    expect(decide).toHaveBeenCalledTimes(1)
    expect(execute).toHaveBeenCalledTimes(solverStarts)
  })
})

describe.each([false, true])('T12 cumulative timing with failover enabled=%s', (failoverEnabled) => {
  it('reaches the decision cutoff cumulatively while every provider call stays within its own timeout', async () => {
    const observed = await runCumulativeScenario(failoverEnabled, 'candidate')

    expect(observed.result).toMatchObject({
      kind: 'preview', source: 'last_verified', completed: false,
      status: 'stopped', stopReason: 'deadline', elapsedMs: failoverEnabled ? 41_200 : 41_450,
    })
    expect(observed.result.counters).toMatchObject({
      stepCount: 3, providerAttemptCount: 6, modelToolCallCount: 3, toolCallCount: 3,
    })
    expect(observed.solverDurations).toEqual([1_900, 1_900, 1_900])
    assertBoundedCallsAndCleanup(observed, failoverEnabled)
  })

  it('completes cumulative final verification inside the stronger 42-second bound', async () => {
    const observed = await runCumulativeScenario(failoverEnabled, 'final')

    expect(observed.result).toMatchObject({
      kind: 'preview', completed: true, verified: true,
      status: 'completed', stopReason: 'goal_completed', elapsedMs: failoverEnabled ? 41_200 : 41_450,
    })
    expect(observed.result.elapsedMs).toBeLessThanOrEqual(42_000)
    expect(observed.result.counters).toMatchObject({
      stepCount: 3, providerAttemptCount: 6, modelToolCallCount: 2, toolCallCount: 3,
    })
    expect(observed.solverDurations).toEqual([1_900, 1_900, 1_900])
    assertBoundedCallsAndCleanup(observed, failoverEnabled)
  })

  it('rejects an injected late final proof at the outer deadline after cumulative timely provider work', async () => {
    const observed = await runCumulativeScenario(failoverEnabled, 'final', true)

    expect(observed.result).toMatchObject({
      kind: 'unavailable', completed: false,
      status: 'stopped', stopReason: 'deadline', elapsedMs: 45_000,
    })
    expect(observed.result).not.toHaveProperty('lanes')
    expect(observed.result.counters).toMatchObject({
      stepCount: 3, providerAttemptCount: 6, modelToolCallCount: 2, toolCallCount: 3,
    })
    // Deliberately faulty verification is separate from the compliant 2s-tool cases.
    expect(observed.solverDurations.slice(0, 2)).toEqual([1_900, 1_900])
    expect(observed.solverDurations[2]).toBeGreaterThan(2_000)
    assertBoundedCallsAndCleanup(observed, failoverEnabled)
  })
})

async function runCumulativeScenario(
  failoverEnabled: boolean,
  lastDecision: 'candidate' | 'final',
  lateFinalProof = false,
) {
  let now = 0
  const providerDurations = [6_500, 6_500, 6_500, 6_500, 4_500, 4_500]
  const calls: { role: 'primary' | 'backup'; durationMs: number; timeoutMs: number; signal: AbortSignal }[] = []
  const retryDelays: number[] = []
  const solverDurations: number[] = []
  const admission = createAdmissionController({ now: () => now })
  const acquired = admission.tryAcquire('generation')
  if (!acquired.accepted) throw new Error('Expected the initial generation lease.')
  const lease = acquired.lease

  const modelFor = (role: 'primary' | 'backup'): LevelGeneratorModel => ({
    async decide(context, attemptSignal, options) {
      const index = calls.length
      const durationMs = providerDurations[index]
      if (durationMs === undefined || !options) throw new Error('Unexpected provider attempt.')
      calls.push({ role, durationMs, timeoutMs: options.timeoutMs, signal: attemptSignal })
      now += durationMs
      if (index % 2 === 0) throw new GeneratorModelError('transient')

      if (lastDecision === 'candidate' || context.counters.stepCount < 3) {
        return {
          kind: 'tool_request', name: 'solveLevel',
          arguments: { lanes: getGeneratedLevelTemplate(context.counters.stepCount as 1 | 2 | 3) },
        }
      }
      const selected = context.candidates[0]
      if (!selected) throw new Error('Expected previously solved same-run evidence.')
      return {
        kind: 'final', candidateId: selected.candidateId, evaluationId: selected.evaluationId,
        summary: 'Select the first verified candidate.',
      }
    },
  })
  const realSolver = createSolveLevelTool({ now: () => now })
  const solver: SolveLevelTool = {
    searchFactory: realSolver.searchFactory,
    async execute(input) {
      const startedAt = now
      const output = await realSolver.execute(input)
      if (lateFinalProof && solverDurations.length === 2) now = input.runDeadline
      else now += 1_900
      solverDurations.push(now - startedAt)
      return output
    },
  }
  const service = createLevelGeneratorService({
    model: modelFor('primary'),
    backupModel: failoverEnabled ? modelFor('backup') : undefined,
    failoverEnabled,
    solver,
    now: () => now,
    waitBeforeRetry: async (delayMs) => {
      retryDelays.push(delayMs)
      now += delayMs
    },
  })
  const result = await service.generate(settings, signal(), (kind, start) => lease.start(kind, start))
  expect(lease.providerAttempts).toBe(6)
  expect(lease.executedToolCalls).toBe(3)
  expect(lease.pendingWork).toBe(0)
  expect(admission.tryAcquire('generation')).toMatchObject({ accepted: false, reason: 'busy' })
  lease.markTerminal()
  const recovered = admission.tryAcquire('generation')
  const recoveryAccepted = recovered.accepted
  if (recovered.accepted) recovered.lease.markTerminal()
  await Promise.resolve()

  return { result, calls, retryDelays, solverDurations, lease, recoveryAccepted }
}

function assertBoundedCallsAndCleanup(
  observed: Awaited<ReturnType<typeof runCumulativeScenario>>,
  failoverEnabled: boolean,
): void {
  expect(observed.calls).toHaveLength(6)
  for (const call of observed.calls) {
    expect(call.durationMs).toBeLessThan(call.timeoutMs)
    expect(call.signal.aborted).toBe(true)
  }
  expect(observed.calls.map((call) => call.role)).toEqual(
    failoverEnabled
      ? ['primary', 'backup', 'backup', 'backup', 'backup', 'backup']
      : ['primary', 'primary', 'primary', 'primary', 'primary', 'primary'],
  )
  expect(observed.retryDelays).toEqual(failoverEnabled ? [250, 250] : [250, 250, 250])
  expect(observed.lease.pendingWork).toBe(0)
  expect(observed.lease.released).toBe(true)
  expect(observed.recoveryAccepted).toBe(true)
}
