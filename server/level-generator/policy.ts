import type { CompactEvaluation, GenerationRequest, RunCounters } from '../../shared/level-generator-contract'
import type { GeneratorCandidateContext, GeneratorDecisionContext, RemainingGeneratorBudget } from './model'
import { GENERATED_RATING_BANDS } from '../../src/config/generated-level'

export const LEVEL_GENERATOR_POLICY = {
  maxDecisions: 5,
  maxProviderAttempts: 6,
  maxAttemptsPerDecision: 2,
  retryDelayMs: 250,
  providerAttemptTimeoutMs: 15_000,
  maxSolverExecutions: 8,
  maxCandidates: 3,
  maxRevisions: 2,
  runDeadlineMs: 45_000,
  decisionCutoffMs: 40_000,
  solverTimeoutMs: 2_000,
  maxModelContextBytes: 24_576,
  maxModelOutputBytes: 8_192,
  maxModelOutputTokens: 2_048,
  maxEvaluationsInContext: 3,
  maxEvidenceEvents: 32,
} as const

export const LEVEL_GENERATOR_RULES_VERSION = '007-v1'

export const GENERATOR_GOAL =
  'Propose a five-lane traffic layout whose first safe crossing measures the requested challenge rating and whose entire captured crossing target is winnable without losing a life.'

export const GENERATOR_RULES: readonly string[] = [
  'The board is nine columns by seven rows; traffic occupies exactly rows 1 through 5.',
  'Each candidate starts at tick zero with the player at (4, 6). Reaching row zero scores a crossing and returns the player to (4, 6), without resetting traffic or ticks.',
  'Each player action moves one cell or waits, then checks collisions before traffic moves and again after traffic advances one tick.',
  'Traffic wraps horizontally; turn logic is deterministic and unchanged.',
  'A traffic row may never be fully occupied, and same-row vehicles may never overlap in any phase.',
  'Only a no-life-loss path that completes the captured crossing target is verified as playable.',
  'Rate challenge by firstCrossingMinMoves using ratingBands, not the full-target minMoves. Revise previous candidate lanes when too easy, too hard or unsolvable; never repeat identical traffic. Select a solved matching candidate with a final decision instead of requesting its evaluation again.',
]

export const GENERATOR_LANE_CONTRACT =
  'solveLevel arguments have exactly one field, lanes: five lane objects, one for each row 1..5; direction left|right; moveEveryTicks integer 1..3; vehicleLength integer 1..2; vehicleStarts array of 1..4 unique integers 0..8. No overlapping cells, including wrap-around. Do not provide settings, difficulty, metrics, proof, limits or extra keys.'

export const SOLVE_LEVEL_TOOL_DESCRIPTOR = {
  name: 'solveLevel',
  description: 'Evaluate one exact five-lane candidate using the real deterministic game engine. Read-only; application-owned settings and limits are fixed.',
} as const

export interface GeneratorBudgetSnapshot {
  counters: RunCounters
  elapsedMs: number
  solverExecutions: number
}

export function remainingGeneratorBudget(snapshot: GeneratorBudgetSnapshot): RemainingGeneratorBudget {
  const policy = LEVEL_GENERATOR_POLICY
  return {
    decisions: Math.max(0, policy.maxDecisions - snapshot.counters.stepCount),
    providerAttempts: Math.max(0, policy.maxProviderAttempts - snapshot.counters.providerAttemptCount),
    retries: Math.max(0, policy.maxProviderAttempts - snapshot.counters.providerAttemptCount),
    solverExecutions: Math.max(0, policy.maxSolverExecutions - snapshot.solverExecutions),
    candidates: Math.max(0, policy.maxCandidates - snapshot.counters.modelToolCallCount),
    revisions: Math.max(0, policy.maxRevisions - snapshot.counters.revisionCount),
    millisecondsToDecisionCutoff: Math.max(0, policy.decisionCutoffMs - snapshot.elapsedMs),
    millisecondsToDeadline: Math.max(0, policy.runDeadlineMs - snapshot.elapsedMs),
  }
}

export function buildGeneratorDecisionContext(
  runId: string,
  request: GenerationRequest,
  counters: RunCounters,
  evaluations: readonly CompactEvaluation[],
  snapshot: GeneratorBudgetSnapshot,
  candidates: readonly GeneratorCandidateContext[] = [],
): GeneratorDecisionContext {
  const context: GeneratorDecisionContext = {
    runId,
    request: { ...request },
    goal: GENERATOR_GOAL,
    rules: [...GENERATOR_RULES],
    laneContract: GENERATOR_LANE_CONTRACT,
    ratingBands: structuredClone(GENERATED_RATING_BANDS),
    candidates: candidates.slice(-LEVEL_GENERATOR_POLICY.maxEvaluationsInContext).map(candidate => ({
      candidateId: candidate.candidateId,
      evaluationId: candidate.evaluationId,
      lanes: candidate.lanes.map(lane => ({ ...lane, vehicleStarts: [...lane.vehicleStarts] })),
    })),
    tools: [{ ...SOLVE_LEVEL_TOOL_DESCRIPTOR }],
    remaining: remainingGeneratorBudget(snapshot),
    counters: { ...counters },
    evaluations: evaluations.slice(-LEVEL_GENERATOR_POLICY.maxEvaluationsInContext).map(evaluation => ({ ...evaluation })),
  }
  const byteLength = new TextEncoder().encode(JSON.stringify(context)).byteLength
  if (byteLength > LEVEL_GENERATOR_POLICY.maxModelContextBytes) {
    throw new RangeError('Generator decision context exceeds its fixed byte limit.')
  }
  return context
}
