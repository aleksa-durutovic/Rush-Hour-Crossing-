import { describe, expect, it } from 'vitest'
import { getGeneratedLevelTemplate } from '../src/config/generated-level'
import {
  beginLevelGeneration,
  cancelLevelGeneration,
  createLevelGeneratorLifecycle,
  invalidateLevelGeneration,
  previewForPlay,
  settleLevelGeneration,
} from '../src/level-generator/lifecycle'
import { measureTraffic } from '../src/game/level-metrics'
import { getTrafficPeriod } from '../src/game/solve-level'

const request = { targetDifficulty: 1, lives: 3, crossingsToWin: 1 }
const lanes = getGeneratedLevelTemplate(1).map((lane) => ({ ...lane, vehicleStarts: [...lane.vehicleStarts] }))
const metrics = measureTraffic(lanes)
const preview = {
  runId: 'run-lifecycle',
  status: 'completed',
  stopReason: 'goal_completed',
  completed: true,
  counters: { stepCount: 2, providerAttemptCount: 2, retryCount: 0, toolCallCount: 2, modelToolCallCount: 1, revisionCount: 0 },
  elapsedMs: 50,
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
    ...metrics,
    trafficPeriod: getTrafficPeriod(lanes),
    exploredStates: 100,
    actionEvaluations: 500,
  },
  summary: 'Verified level ready.',
}

describe('verified level browser lifecycle', () => {
  it('moves through idle, running and ready with captured immutable settings', () => {
    const mutableRequest = { ...request }
    const started = beginLevelGeneration(createLevelGeneratorLifecycle(), mutableRequest)
    mutableRequest.lives = 5
    expect(started.state.status).toBe('running')
    expect(started.state.capturedSettings).toEqual(request)

    const settled = settleLevelGeneration(started.state, started.requestId, preview)
    expect(settled.status).toBe('ready')
    expect(settled.preview).toEqual(preview)
  })

  it('ignores a late result from a superseded request', () => {
    const initial = createLevelGeneratorLifecycle()
    const first = beginLevelGeneration(initial, request)
    const second = beginLevelGeneration(first.state, { ...request, targetDifficulty: 2 })
    const late = settleLevelGeneration(second.state, first.requestId, preview)

    expect(late).toEqual(second.state)
    expect(late.status).toBe('running')
    expect(late.activeRequestId).toBe(second.requestId)
  })

  it('clears preview on cancel/reset and ignores later settlements', () => {
    const started = beginLevelGeneration(createLevelGeneratorLifecycle(), request)
    const cancelled = cancelLevelGeneration(started.state)
    expect(cancelled.status).toBe('idle')
    expect(settleLevelGeneration(cancelled, started.requestId, preview)).toEqual(cancelled)

    const ready = settleLevelGeneration(started.state, started.requestId, preview)
    const invalidated = invalidateLevelGeneration(ready)
    expect(invalidated.status).toBe('idle')
    expect(invalidated.preview).toBeNull()
  })

  it('does not enable Play for invalid DTOs or changed captured settings', () => {
    const started = beginLevelGeneration(createLevelGeneratorLifecycle(), request)
    const badDto = settleLevelGeneration(started.state, started.requestId, { ...preview, verified: false })
    expect(badDto.status).toBe('unavailable')
    expect(previewForPlay(badDto, request).level).toBeNull()

    const ready = settleLevelGeneration(started.state, started.requestId, preview)
    expect(previewForPlay(ready, { ...request, lives: 2 }).level).toBeNull()
    expect(ready.status).toBe('ready')
  })

  it('consumes the exact validated preview only after matching player settings', () => {
    const started = beginLevelGeneration(createLevelGeneratorLifecycle(), request)
    const ready = settleLevelGeneration(started.state, started.requestId, preview)
    const result = previewForPlay(ready, request)

    expect(result.level).toMatchObject({
      origin: 'generated',
      settings: { lives: request.lives, crossingsToWin: request.crossingsToWin },
      lanes,
    })
    expect(result.state.status).toBe('idle')
    expect(result.state.preview).toBeNull()
  })
})
