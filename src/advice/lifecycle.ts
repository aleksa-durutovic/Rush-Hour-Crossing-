import type { AdviceResponse, CompletedRunSummary } from '../../shared/advice-contract'

export type AdviceNotice =
  | { kind: 'ready'; response: AdviceResponse }
  | { kind: 'unavailable' }

export interface PendingAdviceJob {
  jobId: number
  summary: CompletedRunSummary
}

export interface AdviceLifecycleState {
  nextJobId: number
  pendingJob: PendingAdviceJob | null
  hiddenNotice: AdviceNotice | null
  visibleNotice: AdviceNotice | null
}

export interface AdviceAnalysisRequest {
  jobId: number
  summary: CompletedRunSummary
}

export interface AdviceRunCompletion {
  state: AdviceLifecycleState
  analysisRequest: AdviceAnalysisRequest
  noticeToDisplay: AdviceNotice | null
  supersededPending: boolean
  supersededJobId: number | null
}

export function createAdviceLifecycleState(): AdviceLifecycleState {
  return { nextJobId: 1, pendingJob: null, hiddenNotice: null, visibleNotice: null }
}

export function completeAdviceRun(
  state: AdviceLifecycleState,
  summary: CompletedRunSummary,
): AdviceRunCompletion {
  const supersededJobId = state.pendingJob?.jobId ?? null
  const supersededPending = supersededJobId !== null
  const noticeToDisplay = supersededPending
    ? { kind: 'unavailable' as const }
    : state.hiddenNotice
  const jobId = state.nextJobId

  const next: AdviceLifecycleState = {
    nextJobId: jobId + 1,
    pendingJob: { jobId, summary },
    hiddenNotice: null,
    visibleNotice: noticeToDisplay,
  }

  return {
    state: next,
    analysisRequest: { jobId, summary },
    noticeToDisplay,
    supersededPending,
    supersededJobId,
  }
}

export function settleAdviceJob(
  state: AdviceLifecycleState,
  jobId: number,
  result: { kind: 'ready'; response: AdviceResponse } | { kind: 'unavailable' },
): AdviceLifecycleState {
  if (state.pendingJob?.jobId !== jobId) return state
  return {
    ...state,
    pendingJob: null,
    hiddenNotice: result,
  }
}

export function resetAdviceForNewRun(
  state: AdviceLifecycleState,
  _reason: 'restart' | 'difficulty' | 'generated',
): AdviceLifecycleState {
  if (state.visibleNotice === null) return state
  return { ...state, visibleNotice: null }
}
