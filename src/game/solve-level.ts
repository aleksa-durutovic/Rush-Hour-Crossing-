import { GRID_COLUMNS } from './constants'
import { measureTraffic, type TrafficMetrics } from './level-metrics'
import { createInitialState, type GameState, type LaneDefinition, type PlayerAction } from './state'
import { applyAction } from './turn'

export const SOLVE_LEVEL_LIMITS = {
  maxStates: 35_000,
  maxActions: 175_000,
  maxBatchSize: 256,
  maxWitnessActions: 32_768,
} as const

export type SolveBudgetReason = 'state_limit' | 'action_limit'
export type SearchPhase = 'first_crossing' | 'whole_target'

export interface SearchBudget {
  maxStates?: number
  maxActions?: number
}

export interface SearchSettings {
  lives: number
  crossingsToWin: number
}

export interface SearchProgress {
  status: 'running'
  phase: SearchPhase
  exploredStates: number
  actionEvaluations: number
  expandedThisStep: number
}

export interface SolvedLevel {
  status: 'solved'
  firstCrossingMinMoves: number
  minMoves: number
  firstCrossingActions: PlayerAction[]
  winningActions: PlayerAction[]
  exploredStates: number
  actionEvaluations: number
  metrics: TrafficMetrics
}

export interface UnsolvableLevel {
  status: 'unsolvable'
  explorationComplete: true
  firstCrossingMinMoves: number | null
  minMoves: null
  firstCrossingActions: PlayerAction[] | null
  exploredStates: number
  actionEvaluations: number
  metrics: TrafficMetrics
}

export interface BudgetExceededLevel {
  status: 'budget_exceeded'
  budgetReason: SolveBudgetReason
  exploredStates: number
  actionEvaluations: number
  metrics: TrafficMetrics
}

export type SolveLevelResult = SolvedLevel | UnsolvableLevel | BudgetExceededLevel

export interface LevelSearch {
  advance(maxExpandedStates?: number): SearchProgress | SolveLevelResult
}

const ACTION_ORDER: readonly PlayerAction[] = ['up', 'down', 'left', 'right', 'wait']

export function getTrafficPeriod(lanes: readonly LaneDefinition[]): number {
  return lanes.reduce((period, lane) => lcm(period, GRID_COLUMNS * lane.moveEveryTicks), 1)
}

export function levelSearchStateKey(state: GameState, period: number): string {
  return `${state.player.x},${state.player.y},${state.tick % period},${state.crossings}`
}

export function createLevelSearch(
  lanes: readonly LaneDefinition[],
  settings: SearchSettings,
  budget: SearchBudget = {},
): LevelSearch {
  const limits = {
    maxStates: budget.maxStates ?? SOLVE_LEVEL_LIMITS.maxStates,
    maxActions: budget.maxActions ?? SOLVE_LEVEL_LIMITS.maxActions,
  }
  const period = getTrafficPeriod(lanes)
  const counts = { exploredStates: 0, actionEvaluations: 0 }
  const metrics = measureTraffic(lanes)
  let phase: SearchPhase = 'first_crossing'
  let firstSearch: BfsSearch | null = createBfs(lanes, settings, 1, period, counts, limits)
  let wholeSearch: BfsSearch | null = null
  let firstCrossingActions: PlayerAction[] | null = null
  let terminal: SolveLevelResult | null = firstSearch ? null : budgetResult('state_limit')

  return {
    advance(maxExpandedStates = SOLVE_LEVEL_LIMITS.maxBatchSize): SearchProgress | SolveLevelResult {
      if (terminal) return terminal
      const batchLimit = Math.max(1, Math.min(SOLVE_LEVEL_LIMITS.maxBatchSize, Math.floor(maxExpandedStates) || 1))
      let expandedThisStep = 0

      while (expandedThisStep < batchLimit) {
        const search = phase === 'first_crossing' ? firstSearch : wholeSearch
        if (!search) {
          terminal = budgetResult('state_limit')
          return terminal
        }

        const step = search.expandOne()
        if (step.kind === 'budget') {
          terminal = budgetResult(step.reason)
          return terminal
        }
        if (step.kind === 'exhausted') {
          if (phase === 'first_crossing') {
            terminal = {
              status: 'unsolvable',
              explorationComplete: true,
              firstCrossingMinMoves: null,
              minMoves: null,
              firstCrossingActions: null,
              ...counts,
              metrics,
            }
            return terminal
          }
          terminal = {
            status: 'unsolvable',
            explorationComplete: true,
            firstCrossingMinMoves: firstCrossingActions?.length ?? null,
            minMoves: null,
            firstCrossingActions,
            ...counts,
            metrics,
          }
          return terminal
        }
        if (step.kind === 'solved') {
          if (phase === 'first_crossing') {
            firstCrossingActions = step.actions
            if (settings.crossingsToWin === 1) {
              terminal = solvedResult(step.actions, step.actions)
              return terminal
            }
            phase = 'whole_target'
            firstSearch = null
            wholeSearch = createBfs(lanes, settings, settings.crossingsToWin, period, counts, limits)
            if (!wholeSearch) {
              terminal = budgetResult('state_limit')
              return terminal
            }
          } else {
            terminal = solvedResult(firstCrossingActions ?? step.actions, step.actions)
            return terminal
          }
        }
        expandedThisStep += 1
      }

      return {
        status: 'running',
        phase,
        ...counts,
        expandedThisStep,
      }
    },
  }

  function solvedResult(firstActions: PlayerAction[], wholeActions: PlayerAction[]): SolvedLevel {
    return {
      status: 'solved',
      firstCrossingMinMoves: firstActions.length,
      minMoves: wholeActions.length,
      firstCrossingActions: [...firstActions],
      winningActions: [...wholeActions],
      ...counts,
      metrics,
    }
  }

  function budgetResult(budgetReason: SolveBudgetReason): BudgetExceededLevel {
    return { status: 'budget_exceeded', budgetReason, ...counts, metrics }
  }
}

type BfsStep =
  | { kind: 'expanded' }
  | { kind: 'solved'; actions: PlayerAction[] }
  | { kind: 'exhausted' }
  | { kind: 'budget'; reason: SolveBudgetReason }

interface SearchCounters {
  exploredStates: number
  actionEvaluations: number
}

interface SearchLimits {
  maxStates: number
  maxActions: number
}

interface SearchNode {
  state: GameState
  predecessor: number | null
  action: PlayerAction | null
}

class BfsSearch {
  private readonly nodes: SearchNode[]
  private readonly visited: Set<string>
  private nextIndex = 0

  constructor(
    private readonly lanes: readonly LaneDefinition[],
    config: { lives: number; crossingsToWin: number },
    private readonly period: number,
    private readonly counters: SearchCounters,
    private readonly limits: SearchLimits,
  ) {
    const initial = createInitialState({ ...config, difficulty: 'normal' })
    const key = levelSearchStateKey(initial, period)
    this.nodes = [{ state: initial, predecessor: null, action: null }]
    this.visited = new Set([key])
    counters.exploredStates += 1
  }

  expandOne(): BfsStep {
    if (this.nextIndex >= this.nodes.length) return { kind: 'exhausted' }

    const index = this.nextIndex
    const node = this.nodes[index]!
    this.nextIndex += 1

    for (const action of ACTION_ORDER) {
      if (this.counters.actionEvaluations >= this.limits.maxActions) {
        return { kind: 'budget', reason: 'action_limit' }
      }
      this.counters.actionEvaluations += 1
      const next = applyAction(node.state, action, this.lanes)
      if (next.lives !== node.state.lives || next.status === 'lost') continue
      if (next.status === 'won') {
        const actions = [...this.reconstruct(index), action]
        if (actions.length > SOLVE_LEVEL_LIMITS.maxWitnessActions) {
          return { kind: 'budget', reason: 'state_limit' }
        }
        return { kind: 'solved', actions }
      }

      const key = levelSearchStateKey(next, this.period)
      if (this.visited.has(key)) continue
      if (this.counters.exploredStates >= this.limits.maxStates) {
        return { kind: 'budget', reason: 'state_limit' }
      }
      this.visited.add(key)
      this.nodes.push({ state: next, predecessor: index, action })
      this.counters.exploredStates += 1
    }

    return { kind: 'expanded' }
  }

  private reconstruct(index: number): PlayerAction[] {
    const actions: PlayerAction[] = []
    let cursor: number | null = index
    while (cursor !== null) {
      const node: SearchNode = this.nodes[cursor]!
      if (node.action !== null) actions.push(node.action)
      cursor = node.predecessor
    }
    actions.reverse()
    return actions
  }
}

function createBfs(
  lanes: readonly LaneDefinition[],
  settings: SearchSettings,
  crossingsToWin: number,
  period: number,
  counters: SearchCounters,
  limits: SearchLimits,
): BfsSearch | null {
  if (counters.exploredStates >= limits.maxStates) return null
  return new BfsSearch(lanes, { lives: settings.lives, crossingsToWin }, period, counters, limits)
}

function gcd(left: number, right: number): number {
  let a = left
  let b = right
  while (b !== 0) [a, b] = [b, a % b]
  return a
}

function lcm(left: number, right: number): number {
  return (left / gcd(left, right)) * right
}
