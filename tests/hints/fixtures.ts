import type { HintResponse, HintSnapshot, HintSolverResult } from '../../shared/hint-agent-contract'

export const nearGoalSnapshot: HintSnapshot = {
  status: 'active',
  difficulty: 'easy',
  tick: 0,
  x: 4,
  y: 1,
  lives: 3,
  crossings: 0,
  crossingsToWin: 1,
}

export const nearGoalSolverResult: HintSolverResult = {
  outcome: 'verified',
  steps: [
    {
      action: 'up',
      entered: { x: 4, y: 0 },
      tick: 1,
      x: 4,
      y: 6,
      lives: 3,
      crossings: 1,
      status: 'won',
    },
  ],
}

export function nearGoalHintResponse(
  origin: HintSnapshot = nearGoalSnapshot,
  explanation = 'The verified route reaches the next crossing without losing a life.',
): HintResponse {
  return {
    outcome: 'verified',
    origin,
    explanation,
    steps: nearGoalSolverResult.steps,
  }
}
