import { describe, expect, it } from 'vitest'
import {
  completeAdviceRun,
  createAdviceLifecycleState,
  resetAdviceForNewRun,
  settleAdviceJob,
} from '../../src/advice/lifecycle'
import type { CompletedRunSummary } from '../../shared/advice-contract'

const lostRun: CompletedRunSummary = {
  outcome: 'lost',
  difficulty: 'easy',
  ticks: 18,
  crossings: 0,
  targetCrossings: 3,
  startingLives: 3,
  remainingLives: 0,
  score: 0,
}

const nextRun: CompletedRunSummary = {
  ...lostRun,
  ticks: 21,
  crossings: 1,
  score: 100,
}

const readyResponse = {
  focus: 'survival' as const,
  evidence: 'You lost all 3 lives before completing a crossing.',
  nextTip: 'Wait at a safe row until a vehicle passes.',
}

describe('one-run-delayed advice lifecycle', () => {
  it('hides the first run result, then shows a ready result once after the next completed run', () => {
    const first = completeAdviceRun(createAdviceLifecycleState(), lostRun)

    expect(first.noticeToDisplay).toBeNull()
    expect(first.analysisRequest?.summary).toEqual(lostRun)

    const ready = settleAdviceJob(first.state, first.analysisRequest!.jobId, {
      kind: 'ready',
      response: readyResponse,
    })
    expect(ready.hiddenNotice).toEqual({ kind: 'ready', response: readyResponse })
    expect(ready.visibleNotice).toBeNull()

    const second = completeAdviceRun(ready, nextRun)
    expect(second.noticeToDisplay).toEqual({ kind: 'ready', response: readyResponse })
    expect(second.state.visibleNotice).toEqual(second.noticeToDisplay)
    expect(second.state.hiddenNotice).toBeNull()
    expect(second.analysisRequest?.summary).toEqual(nextRun)

    const secondAdvice = {
      focus: 'general' as const,
      evidence: 'You completed 1 of 3 crossings.',
      nextTip: 'Keep choosing a safe opening.',
    }
    const secondReady = settleAdviceJob(second.state, second.analysisRequest!.jobId, {
      kind: 'ready',
      response: secondAdvice,
    })
    const afterReset = resetAdviceForNewRun(secondReady, 'restart')
    const third = completeAdviceRun(afterReset, nextRun)

    expect(third.noticeToDisplay).toEqual({ kind: 'ready', response: secondAdvice })
    expect(third.state.visibleNotice).toEqual(third.noticeToDisplay)
  })

  it.each(['restart', 'difficulty', 'generated'] as const)(
    'keeps ready advice hidden through a mid-run %s reset',
    (reason) => {
      const first = completeAdviceRun(createAdviceLifecycleState(), lostRun)
      const ready = settleAdviceJob(first.state, first.analysisRequest!.jobId, {
        kind: 'ready',
        response: readyResponse,
      })

      const reset = resetAdviceForNewRun(ready, reason)

      expect(reset.hiddenNotice).toEqual({ kind: 'ready', response: readyResponse })
      expect(reset.visibleNotice).toBeNull()
      expect(completeAdviceRun(reset, nextRun).noticeToDisplay).toEqual({
        kind: 'ready',
        response: readyResponse,
      })
    },
  )

  it.each(['restart', 'difficulty', 'generated'] as const)(
    'clears a displayed notice on a post-result %s reset',
    (reason) => {
      const first = completeAdviceRun(createAdviceLifecycleState(), lostRun)
      const ready = settleAdviceJob(first.state, first.analysisRequest!.jobId, {
        kind: 'ready',
        response: readyResponse,
      })
      const second = completeAdviceRun(ready, nextRun)

      expect(resetAdviceForNewRun(second.state, reason).visibleNotice).toBeNull()
    },
  )

  it('shows unavailable and starts a new job if a pending result is superseded at the next end', () => {
    const first = completeAdviceRun(createAdviceLifecycleState(), lostRun)
    const oldJobId = first.analysisRequest!.jobId

    const second = completeAdviceRun(first.state, nextRun)

    expect(second.supersededPending).toBe(true)
    expect(second.noticeToDisplay).toEqual({ kind: 'unavailable' })
    expect(second.analysisRequest?.jobId).not.toBe(oldJobId)
    expect(second.analysisRequest?.summary).toEqual(nextRun)

    const afterLateOldResponse = settleAdviceJob(second.state, oldJobId, {
      kind: 'ready',
      response: readyResponse,
    })
    expect(afterLateOldResponse).toBe(second.state)
    expect(afterLateOldResponse.visibleNotice).toEqual({ kind: 'unavailable' })
  })

  it('keeps a failed result hidden until the following run ends', () => {
    const first = completeAdviceRun(createAdviceLifecycleState(), lostRun)
    const unavailable = settleAdviceJob(first.state, first.analysisRequest!.jobId, {
      kind: 'unavailable',
    })

    expect(unavailable.visibleNotice).toBeNull()
    expect(completeAdviceRun(unavailable, nextRun).noticeToDisplay).toEqual({ kind: 'unavailable' })
  })
})
