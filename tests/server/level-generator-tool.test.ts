import { describe, expect, it, vi } from 'vitest'
import { getGeneratedLevelTemplate } from '../../src/config/generated-level'
import { createLevelSearch, type LevelSearch, type SearchProgress, type SolveLevelResult } from '../../src/game/solve-level'
import { createSolveLevelTool, InvalidSolveLevelResultError } from '../../server/level-generator/solve-tool'
import type { SolveLevelToolInput } from '../../server/level-generator/solve-tool'

const lanes = getGeneratedLevelTemplate(1)
const settings = { lives: 3, crossingsToWin: 3 }

function request(overrides: Partial<SolveLevelToolInput> = {}): SolveLevelToolInput {
  return {
    candidateId: 'c1',
    evaluationId: 'e1',
    lanes,
    settings,
    runDeadline: 20_000,
    signal: new AbortController().signal,
    ...overrides,
  }
}

function progressingSearch(result: () => SolveLevelResult, progressCount = 1): LevelSearch {
  let calls = 0
  return {
    advance: (_batchSize?: number): SearchProgress | SolveLevelResult => {
      calls += 1
      if (calls <= progressCount) {
        return {
          status: 'running', phase: 'whole_target', exploredStates: calls, actionEvaluations: calls * 5,
          expandedThisStep: 1,
        }
      }
      return result()
    },
  }
}

describe('server solveLevel driver', () => {
  it('yields between bounded batches, solves locally and keeps proof outside compact evidence', async () => {
    let now = 100
    const yieldToEventLoop = vi.fn(async () => { now += 1 })
    const advanceSizes: number[] = []
    const tool = createSolveLevelTool({
      now: () => now,
      yieldToEventLoop,
      searchFactory: (...args: Parameters<typeof createLevelSearch>) => {
        const search = createLevelSearch(...args)
        return {
          advance: (batchSize) => {
            advanceSizes.push(batchSize ?? 0)
            return search.advance(batchSize)
          },
        }
      },
    })
    const output = await tool.execute(request())

    expect(output.evidence.outcome).toBe('solved')
    if (output.evidence.outcome !== 'solved') return
    expect(output.evidence.candidateId).toBe('c1')
    expect(output.evidence.evaluationId).toBe('e1')
    expect(output.evidence.minMoves).toBeGreaterThan(0)
    expect(output.proof?.winningActions).toHaveLength(output.evidence.minMoves)
    expect(JSON.stringify(output.evidence)).not.toContain('winningActions')
    expect(yieldToEventLoop).toHaveBeenCalled()
    expect(advanceSizes.every((size) => size > 0 && size <= 256)).toBe(true)
  })

  it('applies shared ceilings to the first-crossing and complete-target searches', async () => {
    const tool = createSolveLevelTool()
    const output = await tool.execute(request({
      lanes: getGeneratedLevelTemplate(3),
      settings: { lives: 3, crossingsToWin: 10 },
    }))

    expect(output.evidence.outcome).toBe('solved')
    expect(output.evidence.exploredStates).toBeLessThanOrEqual(35_000)
    expect(output.evidence.actionEvaluations).toBeLessThanOrEqual(175_000)
    expect(Buffer.byteLength(JSON.stringify(output.evidence), 'utf8')).toBeLessThanOrEqual(4_096)
  })

  it('returns budget_exceeded at the two-second invocation timeout', async () => {
    let now = 0
    const searchFactory = vi.fn(() => progressingSearch(() => { throw new Error('unreachable') }, 100))
    const tool = createSolveLevelTool({ now: () => now, yieldToEventLoop: async () => { now += 1_000 }, searchFactory })
    const output = await tool.execute(request())

    expect(output.evidence).toMatchObject({ outcome: 'budget_exceeded', budgetReason: 'timeout' })
    expect(searchFactory).toHaveBeenCalledTimes(1)
  })

  it('stops on the earlier run deadline and on caller cancellation', async () => {
    let now = 0
    const atDeadline = createSolveLevelTool({
      now: () => now,
      yieldToEventLoop: async () => { now = 500 },
      searchFactory: () => progressingSearch(() => { throw new Error('unreachable') }, 100),
    })
    const deadlineOutput = await atDeadline.execute(request({ runDeadline: 400 }))
    expect(deadlineOutput.evidence).toMatchObject({ outcome: 'budget_exceeded', budgetReason: 'deadline' })

    const controller = new AbortController()
    const cancelled = createSolveLevelTool({
      now: () => 0,
      yieldToEventLoop: async () => controller.abort(),
      searchFactory: () => progressingSearch(() => { throw new Error('unreachable') }, 100),
    })
    const cancelledOutput = await cancelled.execute(request({ signal: controller.signal }))
    expect(cancelledOutput.evidence).toMatchObject({ outcome: 'budget_exceeded', budgetReason: 'cancelled' })
  })

  it('rejects a solver result whose witness does not replay under the real engine', async () => {
    const invalidResult: SolveLevelResult = {
      status: 'solved',
      firstCrossingMinMoves: 6,
      minMoves: 1,
      firstCrossingActions: ['up', 'up', 'up', 'up', 'up', 'up'],
      winningActions: ['wait'],
      exploredStates: 10,
      actionEvaluations: 50,
      metrics: { tightestGap: 8, averageGap: 8, trafficDensity: 1 / 9 },
    }
    const tool = createSolveLevelTool({
      now: () => 0,
      searchFactory: () => progressingSearch(() => invalidResult, 0),
    })

    await expect(tool.execute(request())).rejects.toThrow(InvalidSolveLevelResultError)
  })
})
