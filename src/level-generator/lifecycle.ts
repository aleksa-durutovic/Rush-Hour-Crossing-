import {
  generationRequestSchema,
  generationResponseSchema,
  type GenerationRequest,
  type GenerationResponse,
  type LaneDefinition as ContractLaneDefinition,
} from '../../shared/level-generator-contract'

export type LevelGeneratorStatus = 'idle' | 'running' | 'ready' | 'unavailable'
export type VerifiedLevelPreview = Extract<GenerationResponse, { kind: 'preview' }>

export interface LevelGeneratorLifecycle {
  nextRequestId: number
  status: LevelGeneratorStatus
  activeRequestId: number | null
  capturedSettings: GenerationRequest | null
  preview: VerifiedLevelPreview | null
  message: string | null
}

export interface GeneratedLevelSelection {
  origin: 'generated'
  runId: string
  lanes: ContractLaneDefinition[]
  settings: { lives: number; crossingsToWin: number }
  requestedDifficulty: number
  computedDifficulty: number
  source: 'generated' | 'last_verified' | 'template'
}

export interface LevelGeneratorLifecycleResult {
  state: LevelGeneratorLifecycle
  level: GeneratedLevelSelection | null
}

export function createLevelGeneratorLifecycle(): LevelGeneratorLifecycle {
  return {
    nextRequestId: 1,
    status: 'idle',
    activeRequestId: null,
    capturedSettings: null,
    preview: null,
    message: null,
  }
}

export function beginLevelGeneration(
  state: LevelGeneratorLifecycle,
  request: unknown,
): { state: LevelGeneratorLifecycle; requestId: number } {
  const parsed = generationRequestSchema.safeParse(request)
  if (!parsed.success) throw new TypeError('Generation settings are invalid.')
  const requestId = state.nextRequestId
  return {
    requestId,
    state: {
      nextRequestId: requestId + 1,
      status: 'running',
      activeRequestId: requestId,
      capturedSettings: Object.freeze({ ...parsed.data }),
      preview: null,
      message: 'Preparing a verified five-lane level…',
    },
  }
}

export function settleLevelGeneration(
  state: LevelGeneratorLifecycle,
  requestId: number,
  value: unknown,
): LevelGeneratorLifecycle {
  if (state.status !== 'running' || state.activeRequestId !== requestId) return state
  const parsed = generationResponseSchema.safeParse(value)
  if (!parsed.success) return unavailableState(state, 'The level response could not be verified.')

  if (parsed.data.kind === 'unavailable') {
    return unavailableState(state, parsed.data.message)
  }

  const captured = state.capturedSettings
  if (!captured ||
      parsed.data.settings.lives !== captured.lives ||
      parsed.data.settings.crossingsToWin !== captured.crossingsToWin ||
      parsed.data.requestedDifficulty !== captured.targetDifficulty) {
    return unavailableState(state, 'The verified preview does not match the captured game settings.')
  }

  return {
    ...state,
    status: 'ready',
    activeRequestId: null,
    preview: clonePreview(parsed.data),
    message: null,
  }
}

export function cancelLevelGeneration(state: LevelGeneratorLifecycle): LevelGeneratorLifecycle {
  return idleState(state, 'Level generation was cancelled.')
}

export function invalidateLevelGeneration(state: LevelGeneratorLifecycle): LevelGeneratorLifecycle {
  return idleState(state, null)
}

export function previewForPlay(
  state: LevelGeneratorLifecycle,
  currentSettings: { lives: number; crossingsToWin: number },
): LevelGeneratorLifecycleResult {
  const preview = state.preview
  const captured = state.capturedSettings
  if (
    state.status !== 'ready' || !preview || !captured ||
    currentSettings.lives !== captured.lives ||
    currentSettings.crossingsToWin !== captured.crossingsToWin ||
    preview.settings.lives !== captured.lives ||
    preview.settings.crossingsToWin !== captured.crossingsToWin
  ) return { state, level: null }

  return {
    state: idleState(state, null),
    level: {
      origin: 'generated',
      runId: preview.runId,
      lanes: cloneLanes(preview.lanes),
      settings: { lives: captured.lives, crossingsToWin: captured.crossingsToWin },
      requestedDifficulty: preview.requestedDifficulty,
      computedDifficulty: preview.computedDifficulty,
      source: preview.source,
    },
  }
}

function unavailableState(state: LevelGeneratorLifecycle, message: string): LevelGeneratorLifecycle {
  return {
    ...state,
    status: 'unavailable',
    activeRequestId: null,
    preview: null,
    message,
  }
}

function idleState(state: LevelGeneratorLifecycle, message: string | null): LevelGeneratorLifecycle {
  return {
    ...state,
    nextRequestId: state.nextRequestId + 1,
    status: 'idle',
    activeRequestId: null,
    capturedSettings: null,
    preview: null,
    message,
  }
}

function clonePreview(preview: VerifiedLevelPreview): VerifiedLevelPreview {
  return {
    ...preview,
    settings: { ...preview.settings },
    lanes: cloneLanes(preview.lanes),
    measurements: { ...preview.measurements },
    counters: { ...preview.counters },
  }
}

function cloneLanes(lanes: readonly ContractLaneDefinition[]): ContractLaneDefinition[] {
  return lanes.map((lane) => ({ ...lane, vehicleStarts: [...lane.vehicleStarts] }))
}
