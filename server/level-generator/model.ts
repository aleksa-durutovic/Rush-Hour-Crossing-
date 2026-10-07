import type {
  CompactEvaluation,
  GenerationRequest,
  ModelDecision,
} from '../../shared/level-generator-contract'
import type { RunCounters } from '../../shared/level-generator-contract'
import type { LaneDefinition } from '../../src/game/state'
import type { GeneratedDifficulty, GeneratedRatingBand } from '../../src/config/generated-level'
import { ProviderFailure } from '../ai/failover-policy'

export interface GeneratorCandidateContext {
  candidateId: string
  evaluationId: string
  lanes: readonly LaneDefinition[]
}

export interface RemainingGeneratorBudget {
  decisions: number
  providerAttempts: number
  retries: number
  solverExecutions: number
  candidates: number
  revisions: number
  millisecondsToDecisionCutoff: number
  millisecondsToDeadline: number
}

export interface GeneratorDecisionContext {
  runId: string
  request: GenerationRequest
  goal: string
  rules: readonly string[]
  laneContract: string
  ratingBands: Readonly<Record<GeneratedDifficulty, GeneratedRatingBand>>
  candidates: readonly GeneratorCandidateContext[]
  tools: readonly [{ name: 'solveLevel'; description: string }]
  remaining: RemainingGeneratorBudget
  counters: RunCounters
  evaluations: readonly CompactEvaluation[]
}

export interface LevelGeneratorModel {
  decide(context: GeneratorDecisionContext, signal: AbortSignal, options?: ProviderAttemptOptions): Promise<unknown | ModelDecision>
}

export interface ProviderAttemptOptions {
  timeoutMs: number
}

export type GeneratorModelFailureKind =
  | 'transient'
  | 'rate_limit'
  | 'timeout'
  | 'temporary_unavailable'
  | 'invalid_output'
  | 'output_limit'
  | 'permanent'
  | 'configuration'
  | 'refusal'

export class GeneratorModelError extends Error {
  constructor(readonly kind: GeneratorModelFailureKind) {
    super('Generator model request failed.')
    this.name = 'GeneratorModelError'
  }
}

export function toGeneratorProviderFailure(error: unknown): ProviderFailure {
  if (error instanceof ProviderFailure) return error
  if (!(error instanceof GeneratorModelError)) return new ProviderFailure('permanent')
  switch (error.kind) {
    case 'transient': return new ProviderFailure('temporary_unavailable')
    case 'rate_limit': return new ProviderFailure('rate_limit')
    case 'timeout': return new ProviderFailure('timeout')
    case 'temporary_unavailable': return new ProviderFailure('temporary_unavailable')
    case 'invalid_output': return new ProviderFailure('invalid_output')
    case 'output_limit': return new ProviderFailure('output_limit')
    case 'configuration': return new ProviderFailure('configuration')
    case 'refusal': return new ProviderFailure('refusal')
    case 'permanent': return new ProviderFailure('permanent')
  }
}
