import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { resolveGameConfig } from '../../src/config/game-config'
import { generationRequestSchema } from '../../shared/level-generator-contract'
import { isCompletedRunSummary } from '../../shared/advice-contract'
import { startW08Server, type W08ServerFixture } from '../server/fixtures/w08-server'
import { validAdviceSummary, validGenerationRequest } from './fixtures'

let fixture: W08ServerFixture

beforeEach(async () => {
  fixture = await startW08Server()
})

afterEach(async () => {
  await fixture.close()
})

describe('T15 browser-controlled integrity boundaries', () => {
  it('rejects forged arithmetic before provider or solver work', async () => {
    const forged = { ...validAdviceSummary, score: 999_999 }
    expect(isCompletedRunSummary(forged)).toBe(false)
    const response = await fetch(`${fixture.origin}/api/advice`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(forged),
    })
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'INVALID_REQUEST' })
    expect(fixture.sdkCalls).toHaveLength(0)
    expect(fixture.solverStarts).toHaveLength(0)
  })

  it('does not let URL or request fields choose server policy or generated settings', async () => {
    const urlConfig = resolveGameConfig(new URLSearchParams(
      'lives=3&crossingsToWin=1&difficulty=normal&score=999999&provider=backup&maxSteps=500&ownerId=attacker',
    ))
    expect(urlConfig.config).toEqual({ lives: 3, crossingsToWin: 1, difficulty: 'normal' })
    expect(generationRequestSchema.safeParse({
      ...validGenerationRequest,
      provider: 'backup',
      maxSteps: 500,
      ownerId: 'attacker',
      score: 999_999,
    }).success).toBe(false)
  })

  it('treats an arithmetic-consistent synthetic summary as advice input only', async () => {
    const synthetic = {
      outcome: 'won' as const,
      difficulty: 'hard' as const,
      ticks: 600,
      crossings: 10,
      targetCrossings: 10,
      startingLives: 5,
      remainingLives: 5,
      score: 1_000,
    }
    expect(isCompletedRunSummary(synthetic)).toBe(true)
    const advice = await fetch(`${fixture.origin}/api/advice`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(synthetic),
    })
    expect(advice.status).toBe(200)
    expect(fixture.sdkCalls.filter((call) => call.operation === 'advice')).toHaveLength(1)
    expect(fixture.solverStarts).toHaveLength(0)

    const generated = await fetch(`${fixture.origin}/api/levels/generate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(validGenerationRequest),
    })
    const result = await generated.json() as Record<string, unknown>
    expect(result).toMatchObject({ verified: true, settings: { lives: 3, crossingsToWin: 1 } })
    const generatorContext = fixture.modelContexts.find((value) => (
      typeof value === 'object' && value !== null && 'runId' in value
    )) as { request: unknown } | undefined
    expect(generatorContext?.request).toEqual(validGenerationRequest)
    expect(fixture.solverStarts).toHaveLength(2)
    expect(result).not.toHaveProperty('certifiedScore')
  })
})