import type { AdviceResponse, CompletedRunSummary } from '../../shared/advice-contract'
import {
  completeAdviceRun,
  createAdviceLifecycleState,
  resetAdviceForNewRun,
  settleAdviceJob,
  type AdviceLifecycleState,
  type AdviceNotice,
} from './lifecycle'
import { requestAdvice } from './client'

export interface AdviceController {
  complete(summary: CompletedRunSummary): void
  reset(reason: 'restart' | 'difficulty'): void
}

export function createAdviceController(render: (notice: AdviceNotice | null) => void): AdviceController {
  let state: AdviceLifecycleState = createAdviceLifecycleState()
  const requests = new Map<number, AbortController>()

  return {
    complete(summary) {
      const completed = completeAdviceRun(state, summary)
      state = completed.state
      if (completed.supersededJobId !== null) {
        requests.get(completed.supersededJobId)?.abort()
        requests.delete(completed.supersededJobId)
      }
      render(state.visibleNotice)

      const controller = new AbortController()
      requests.set(completed.analysisRequest.jobId, controller)
      void requestAdvice(summary, controller.signal).then((response: AdviceResponse | null) => {
        requests.delete(completed.analysisRequest.jobId)
        state = settleAdviceJob(
          state,
          completed.analysisRequest.jobId,
          response ? { kind: 'ready', response } : { kind: 'unavailable' },
        )
        render(state.visibleNotice)
      })
    },
    reset(reason) {
      state = resetAdviceForNewRun(state, reason)
      render(state.visibleNotice)
    },
  }
}
