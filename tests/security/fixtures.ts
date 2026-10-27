import { getGeneratedLevelTemplate, type GeneratedDifficulty } from '../../src/config/generated-level'
import type { GeneratorDecisionContext } from '../../server/level-generator/model'
import type { CompletedRunSummary } from '../../shared/advice-contract'
import type { GenerationRequest, ModelDecision } from '../../shared/level-generator-contract'

export const W08_SYNTHETIC_SECRET = 'W08_SERVER_SECRET_DO_NOT_EXPOSE'

export const validGenerationRequest: GenerationRequest = {
  targetDifficulty: 1,
  lives: 3,
  crossingsToWin: 1,
}

export const validAdviceSummary: CompletedRunSummary = {
  outcome: 'lost',
  difficulty: 'easy',
  ticks: 18,
  crossings: 0,
  targetCrossings: 3,
  startingLives: 3,
  remainingLives: 0,
  score: 0,
}

export function normalGeneratorDecision(
  context: GeneratorDecisionContext,
  index: number,
): ModelDecision {
  if (index === 0 || context.counters.stepCount === 1) {
    return {
      kind: 'tool_request',
      name: 'solveLevel',
      arguments: { lanes: getGeneratedLevelTemplate(context.request.targetDifficulty as GeneratedDifficulty) },
    }
  }

  const candidate = context.candidates.at(-1)
  if (!candidate) return { kind: 'refusal', reason: 'insufficient_evidence' }
  return {
    kind: 'final',
    candidateId: candidate.candidateId,
    evaluationId: candidate.evaluationId,
    summary: 'Select the solver-verified candidate.',
  }
}

export function maliciousForeignFinalDecision(context: GeneratorDecisionContext, index: number): ModelDecision {
  if (context.counters.stepCount === 1) return normalGeneratorDecision(context, index)
  return {
    kind: 'final',
    candidateId: 'c-foreign-run-2',
    evaluationId: 'e-foreign-run-2',
    summary: '<img src="/w08-missing.png" onerror="window.__w08XssMarker=true">',
  }
}
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
