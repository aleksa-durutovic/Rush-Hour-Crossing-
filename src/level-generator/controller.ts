import type { GenerationRequest } from '../../shared/level-generator-contract'
import {
  beginLevelGeneration,
  cancelLevelGeneration,
  createLevelGeneratorLifecycle,
  invalidateLevelGeneration,
  previewForPlay,
  settleLevelGeneration,
  type GeneratedLevelSelection,
  type LevelGeneratorLifecycle,
} from './lifecycle'
import { requestGeneratedLevel } from './client'

export interface LevelGeneratorController {
  readonly state: LevelGeneratorLifecycle
  generate(request: GenerationRequest): void
  cancel(): void
  invalidate(): void
  play(currentSettings: { lives: number; crossingsToWin: number }): GeneratedLevelSelection | null
}

export function createLevelGeneratorController(
  render: (state: LevelGeneratorLifecycle) => void,
): LevelGeneratorController {
  let state = createLevelGeneratorLifecycle()
  let activeController: AbortController | null = null

  const update = (next: LevelGeneratorLifecycle): void => {
    state = next
    render(state)
  }

  return {
    get state() {
      return state
    },
    generate(request) {
      activeController?.abort()
      const started = beginLevelGeneration(state, request)
      const controller = new AbortController()
      activeController = controller
      update(started.state)

      void requestGeneratedLevel(request, controller.signal).then((result) => {
        if (state.activeRequestId !== started.requestId || controller.signal.aborted) return
        activeController = null
        update(settleLevelGeneration(state, started.requestId, result))
      })
    },
    cancel() {
      activeController?.abort()
      activeController = null
      update(cancelLevelGeneration(state))
    },
    invalidate() {
      activeController?.abort()
      activeController = null
      update(invalidateLevelGeneration(state))
    },
    play(currentSettings) {
      const result = previewForPlay(state, currentSettings)
      if (!result.level) return null
      activeController?.abort()
      activeController = null
      update(result.state)
      return result.level
    },
  }
}
