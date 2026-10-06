import { isHintSnapshot, type HintResponse, type HintSnapshot } from '../../shared/hint-agent-contract'

export type HintNotice =
  | { kind: 'ready'; response: HintResponse }
  | { kind: 'unavailable' }
  | { kind: 'stale' }

export type HintMode = 'ready' | 'loading' | 'visible' | 'hidden'

export interface HintLifecycleState {
  generation: number
  mode: HintMode
  usedLives: readonly number[]
  snapshot: HintSnapshot | null
  notice: HintNotice | null
}

export interface HintAnalysisRequest {
  generation: number
  snapshot: HintSnapshot
}

export interface HintActivation {
  state: HintLifecycleState
  request: HintAnalysisRequest | null
}

export function createHintLifecycleState(): HintLifecycleState {
  return { generation: 0, mode: 'ready', usedLives: [], snapshot: null, notice: null }
}

/** Starts this life's permitted request, or toggles an already cached result. */
export function activateHint(state: HintLifecycleState, snapshot: HintSnapshot | null): HintActivation {
  const current = snapshot ? advanceHintLife(state, snapshot.lives) : state
  if (current.mode === 'visible') return { state: { ...current, mode: 'hidden' }, request: null }
  if (current.mode === 'hidden') return { state: { ...current, mode: 'visible' }, request: null }
  if (current.mode !== 'ready' || !snapshot || !isHintSnapshot(snapshot) || current.usedLives.includes(snapshot.lives)) {
    return { state: current, request: null }
  }

  const generation = current.generation + 1
  const nextState: HintLifecycleState = {
    ...current,
    generation,
    mode: 'loading',
    usedLives: [...current.usedLives, snapshot.lives],
    snapshot: { ...snapshot },
    notice: null,
  }
  return { state: nextState, request: { generation, snapshot: { ...snapshot } } }
}

/** A cached result belongs to the life count when it was requested. */
export function advanceHintLife(state: HintLifecycleState, lives: number): HintLifecycleState {
  if (state.snapshot === null || state.snapshot.lives === lives) return state
  return { ...state, generation: state.generation + 1, mode: 'ready', snapshot: null, notice: null }
}

export function settleHint(
  state: HintLifecycleState,
  generation: number,
  notice: HintNotice,
): HintLifecycleState {
  if (state.mode !== 'loading' || state.generation !== generation) return state
  return { ...state, mode: 'visible', notice }
}

export function resetHintForNewGame(
  state: HintLifecycleState,
  _reason: 'restart' | 'difficulty',
): HintLifecycleState {
  return {
    generation: state.generation + 1,
    mode: 'ready',
    usedLives: [],
    snapshot: null,
    notice: null,
  }
}
