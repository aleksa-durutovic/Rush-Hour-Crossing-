import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { getGeneratedLevelTemplate } from '../../src/config/generated-level'
import { startW08Server, type W08ServerFixture } from '../server/fixtures/w08-server'
import { validGenerationRequest } from './fixtures'

let fixture: W08ServerFixture

beforeEach(async () => {
  fixture = await startW08Server()
})

afterEach(async () => {
  await fixture.close()
})

describe('T07-T09 model/tool authority', () => {
  it.each(['constructor', 'toString', 'set_score', 'readFile', 'httpFetch', 'set_budget'])(
    'rejects model tool name %s before any solver execution', async (name) => {
      const response = await generateWithDecision(fixture, () => ({
        kind: 'tool_request',
        name,
        arguments: { lanes: getGeneratedLevelTemplate(1) },
      }))
      const result = await response.json() as Record<string, unknown>

      expect(response.status).toBe(200)
      expect(result).toMatchObject({ status: 'failed', kind: 'unavailable', stopReason: 'unknown_tool' })
      expect((result.counters as { providerAttemptCount: number; toolCallCount: number }).providerAttemptCount).toBe(1)
      expect((result.counters as { toolCallCount: number }).toolCallCount).toBe(0)
      expect(result).not.toHaveProperty('lanes')
      expect(fixture.sdkCalls.filter((call) => call.operation === 'generation')).toHaveLength(1)
      expect(fixture.solverStarts).toHaveLength(0)
    },
  )

  it.each([
    ['extra settings', { lanes: getGeneratedLevelTemplate(1), settings: { lives: 5, crossingsToWin: 10 } }],
    ['extra budget authority', { lanes: getGeneratedLevelTemplate(1), maxSteps: 500 }],
    ['overlapping starts', { lanes: overlappingTemplate() }],
    ['wrong lane row', { lanes: wrongRowTemplate() }],
    ['out-of-range vehicle start', { lanes: outOfRangeTemplate() }],
  ])('rejects solveLevel %s before execution', async (_label, args) => {
    const response = await generateWithDecision(fixture, () => ({ kind: 'tool_request', name: 'solveLevel', arguments: args }))
    const result = await response.json() as Record<string, unknown>
    expect(result).toMatchObject({ status: 'failed', kind: 'unavailable', stopReason: 'invalid_tool_arguments' })
    expect((result.counters as { providerAttemptCount: number; toolCallCount: number }).providerAttemptCount).toBe(1)
    expect((result.counters as { toolCallCount: number }).toolCallCount).toBe(0)
    expect(fixture.solverStarts).toHaveLength(0)
  })

  it('does not add a free-form goal or caller-selected limits to valid model context', async () => {
    const response = await fetch(`${fixture.origin}/api/levels/generate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(validGenerationRequest),
    })
    expect(response.status).toBe(200)
    const context = fixture.modelContexts[0] as Record<string, unknown>
    expect(context).toMatchObject({ request: validGenerationRequest })
    expect(context).not.toHaveProperty('goalText')
    expect(context).not.toHaveProperty('playerPrompt')
    expect(context).not.toHaveProperty('provider')
    expect(context).not.toHaveProperty('maxSteps')
  })
})

async function generateWithDecision(
  target: W08ServerFixture,
  decision: () => unknown,
): Promise<Response> {
  await target.close()
  fixture = await startW08Server({ decide: () => decision() })
  return fetch(`${fixture.origin}/api/levels/generate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(validGenerationRequest),
  })
}

function wrongRowTemplate() {
  const lanes = getGeneratedLevelTemplate(1)
  const first = lanes[0]
  if (!first) return lanes
  return [{ ...first, row: 2 }, ...lanes.slice(1)]
}

function outOfRangeTemplate() {
  const lanes = getGeneratedLevelTemplate(1)
  const first = lanes[0]
  if (!first) return lanes
  return [{ ...first, vehicleStarts: [9] }, ...lanes.slice(1)]
}
function overlappingTemplate() {
  const lanes = getGeneratedLevelTemplate(1)
  const first = lanes[0]
  if (!first) return lanes
  return [
    { ...first, vehicleLength: 2, vehicleStarts: [0, 1] },
    ...lanes.slice(1),
  ]
}
