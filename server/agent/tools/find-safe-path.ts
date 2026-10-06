import { DIFFICULTY_PRESETS } from '../../../src/config/presets'
import { GRID_COLUMNS } from '../../../src/game/constants'
import { createInitialState, type GameConfig, type GameState, type LaneDefinition, type PlayerAction, type Position } from '../../../src/game/state'
import { applyAction, getActionDestination } from '../../../src/game/turn'
import { isHintSnapshot, HINT_ROUTE_ACTION_LIMIT, type HintRouteStep, type HintSnapshot, type HintSolverResult } from '../../../shared/hint-agent-contract'

export const HINT_EXPANDED_STATE_LIMIT = 30_000

export interface HintSearchOptions {
  /** Test seam only; API callers cannot override production caps or presets. */
  maxExpandedStates?: number
  /** Test seam only; API callers cannot override production caps or presets. */
  maxActions?: number
  /** Test seam for the finite-graph outcome; production uses the configured preset. */
  lanes?: readonly LaneDefinition[]
}

interface SearchNode {
  state: GameState
  parent: number | null
  action?: PlayerAction
  entered?: Position
  depth: number
}

const ACTION_ORDER: readonly PlayerAction[] = ['up', 'down', 'left', 'right', 'wait']

export function findSafePath(snapshot: HintSnapshot, options: HintSearchOptions = {}): HintSolverResult {
  if (!isHintSnapshot(snapshot)) return { outcome: 'search_limit', steps: [] }

  const maxExpandedStates = options.maxExpandedStates ?? HINT_EXPANDED_STATE_LIMIT
  const maxActions = options.maxActions ?? HINT_ROUTE_ACTION_LIMIT
  if (!Number.isSafeInteger(maxExpandedStates) || maxExpandedStates < 1) return { outcome: 'search_limit', steps: [] }
  if (!Number.isSafeInteger(maxActions) || maxActions < 1) return { outcome: 'search_limit', steps: [] }

  const lanes = options.lanes ?? DIFFICULTY_PRESETS[snapshot.difficulty]
  const cycleTicks = getTrafficCycleTicks(lanes)
  const initialState = stateFromSnapshot(snapshot)
  const nodes: SearchNode[] = [{ state: initialState, parent: null, depth: 0 }]
  const visited = new Set<string>([stateKey(initialState, cycleTicks)])
  let cursor = 0
  let expandedStates = 0
  let reachedActionLimit = false

  while (cursor < nodes.length) {
    if (expandedStates >= maxExpandedStates) return { outcome: 'search_limit', steps: [] }

    const currentIndex = cursor
    const current = nodes[cursor++]
    if (!current) continue
    expandedStates += 1

    for (const action of ACTION_ORDER) {
      const entered = getActionDestination(current.state.player, action)
      const nextState = applyAction(current.state, action, lanes)
      if (nextState.lives !== snapshot.lives) continue
      if (nextState.status === 'lost') continue

      const nextDepth = current.depth + 1
      if (nextState.crossings > current.state.crossings) {
        if (nextDepth > maxActions) return { outcome: 'search_limit', steps: [] }
        const finalStep = makeStep(action, entered, nextState)
        const steps = [...reconstructSteps(nodes, currentIndex), finalStep]
        return { outcome: 'verified', steps }
      }
      if (nextState.status !== 'active') continue

      const key = stateKey(nextState, cycleTicks)
      if (visited.has(key)) continue
      if (nextDepth > maxActions) {
        reachedActionLimit = true
        continue
      }

      visited.add(key)
      nodes.push({
        state: nextState,
        parent: currentIndex,
        action,
        entered,
        depth: nextDepth,
      })
    }
  }

  return reachedActionLimit ? { outcome: 'search_limit', steps: [] } : { outcome: 'no_safe_path', steps: [] }
}

export function getTrafficCycleTicks(lanes: readonly LaneDefinition[]): number {
  const lanePeriods = lanes.map((lane) => GRID_COLUMNS * lane.moveEveryTicks)
  return lanePeriods.reduce(leastCommonMultiple, 1)
}

function stateFromSnapshot(snapshot: HintSnapshot): GameState {
  const config: GameConfig = {
    lives: snapshot.lives,
    crossingsToWin: snapshot.crossingsToWin,
    difficulty: snapshot.difficulty,
  }
  return {
    ...createInitialState(config),
    tick: snapshot.tick,
    player: { x: snapshot.x, y: snapshot.y },
    lives: snapshot.lives,
    crossings: snapshot.crossings,
    score: snapshot.crossings * 100,
  }
}

function makeStep(action: PlayerAction, entered: Position, state: GameState): HintRouteStep {
  if (state.status === 'lost') throw new Error('Lost states are not part of a safe route.')
  return {
    action,
    entered: { ...entered },
    tick: state.tick,
    x: state.player.x,
    y: state.player.y,
    lives: state.lives,
    crossings: state.crossings,
    status: state.status,
  }
}

function reconstructSteps(nodes: readonly SearchNode[], endIndex: number): HintRouteStep[] {
  const steps: HintRouteStep[] = []
  let cursor: number | null = endIndex

  while (cursor !== null) {
    const node: SearchNode | undefined = nodes[cursor]
    if (!node) break
    if (node.parent !== null && node.action && node.entered) {
      steps.push(makeStep(node.action, node.entered, node.state))
    }
    cursor = node.parent
  }

  return steps.reverse()
}

function stateKey(state: GameState, cycleTicks: number): string {
  return [state.player.x, state.player.y, state.tick % cycleTicks, state.crossings].join(':')
}

function leastCommonMultiple(left: number, right: number): number {
  return (left / greatestCommonDivisor(left, right)) * right
}

function greatestCommonDivisor(left: number, right: number): number {
  let a = left
  let b = right
  while (b !== 0) {
    const remainder = a % b
    a = b
    b = remainder
  }
  return a
}
