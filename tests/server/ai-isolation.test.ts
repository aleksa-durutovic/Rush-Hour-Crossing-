import { describe, expect, it, vi } from 'vitest'
import { createAdviceService, type AdviceProvider } from '../../server/advice/service'
import { createLevelGeneratorService } from '../../server/level-generator/service'
import type { LevelGeneratorModel } from '../../server/level-generator/model'
import { ProviderFailure } from '../../server/ai/failover-policy'
import type { CompletedRunSummary } from '../../shared/advice-contract'

const summary: CompletedRunSummary = {
  outcome: 'won', difficulty: 'easy', ticks: 8, crossings: 1, targetCrossings: 1,
  startingLives: 3, remainingLives: 3, score: 100,
}

describe('independent AI request routing', () => {
  it('keeps concurrent advice on primary while a generator request switches to backup', async () => {
    const generatorPrimary: LevelGeneratorModel = {
      decide: vi.fn(async () => { throw new ProviderFailure('rate_limit') }),
    }
    const generatorBackup: LevelGeneratorModel = {
      decide: vi.fn(async () => ({ kind: 'refusal', reason: 'cannot_satisfy_goal' })),
    }
    const advicePrimary: AdviceProvider = {
      generateTip: vi.fn(async () => ({ nextTip: 'Wait for a safe gap.' })),
    }
    const adviceBackup: AdviceProvider = {
      generateTip: vi.fn(async () => ({ nextTip: 'Backup tip.' })),
    }

    const generation = createLevelGeneratorService({
      model: generatorPrimary,
      backupModel: generatorBackup,
      failoverEnabled: true,
    }).generate({ targetDifficulty: 1, lives: 3, crossingsToWin: 1 }, new AbortController().signal)
    const advice = createAdviceService(advicePrimary, {
      enabled: true,
      backupProvider: adviceBackup,
    }).analyze(summary, new AbortController().signal)
    const [generationResult, adviceResult] = await Promise.all([generation, advice])

    expect(generationResult.counters.providerAttemptCount).toBe(2)
    expect(generatorPrimary.decide).toHaveBeenCalledOnce()
    expect(generatorBackup.decide).toHaveBeenCalledOnce()
    expect(adviceResult).toMatchObject({ focus: 'general', nextTip: 'Wait for a safe gap.' })
    expect(advicePrimary.generateTip).toHaveBeenCalledOnce()
    expect(adviceBackup.generateTip).not.toHaveBeenCalled()
  })
})
