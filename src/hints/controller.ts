import {
  areHintSnapshotsEqual,
  type HintSnapshot,
} from '../../shared/hint-agent-contract'
import { requestHint } from './client'
import {
  activateHint,
  advanceHintLife,
  createHintLifecycleState,
  resetHintForNewGame,
  settleHint,
  type HintLifecycleState,
  type HintNotice,
} from './lifecycle'

export interface HintController {
  activate(snapshot: HintSnapshot | null): void
  lifeChanged(lives: number): void
  reset(reason: 'restart' | 'difficulty'): void
  getState(): HintLifecycleState
}

export type HintRequestFunction = typeof requestHint

export function createHintController(
  render: (state: HintLifecycleState) => void,
  readCurrentSnapshot: () => HintSnapshot | null,
  sendRequest: HintRequestFunction = requestHint,
): HintController {
  let state = createHintLifecycleState()
  let pendingRequest: AbortController | null = null

  return {
    activate(snapshot) {
      const transition = activateHint(state, snapshot)
      if (transition.state !== state) {
        state = transition.state
        render(state)
      }
      if (!transition.request) return

      const controller = new AbortController()
      pendingRequest = controller
      void sendRequest(transition.request.snapshot, controller.signal).then((response) => {
        if (pendingRequest === controller) pendingRequest = null
        let notice: HintNotice
        const currentSnapshot = readCurrentSnapshot()
        if (!response) {
          notice = { kind: 'unavailable' }
        } else if (!currentSnapshot || !areHintSnapshotsEqual(currentSnapshot, transition.request!.snapshot)) {
          notice = { kind: 'stale' }
        } else {
          notice = { kind: 'ready', response }
        }
        state = settleHint(state, transition.request!.generation, notice)
        render(state)
      })
    },
    lifeChanged(lives) {
      const nextState = advanceHintLife(state, lives)
      if (nextState !== state) {
        pendingRequest?.abort()
        pendingRequest = null
        state = nextState
        render(state)
      }
    },
    reset(reason) {
      pendingRequest?.abort()
      pendingRequest = null
      state = resetHintForNewGame(state, reason)
      render(state)
    },
    getState() {
      return state
    },
  }
}
