import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '@google/genai'
import {
  createGeminiBackupAdapters,
} from '../../server/advice/gemini-provider'
import { GEMINI_BACKUP_MODEL } from '../../server/ai/provider-config'
import type { GeneratorDecisionContext } from '../../server/level-generator/model'
import type { ProviderInput } from '../../server/advice/service'

function fakeClient(generateContent: (parameters: unknown) => Promise<{ text?: string; candidates?: { finishReason: string }[] }>) {
  const generate = vi.fn(generateContent)
  const createClient = vi.fn(() => ({ models: { generateContent: generate } }))
  return { generate, createClient }
}

describe('approved Gemini backup adapters', () => {
  it('uses the approved model for both operations with unchanged strict schemas and clipped transport settings', async () => {
    const fake = fakeClient(async parameters => {
      const contents = JSON.parse((parameters as { contents: string }).contents) as { summary?: unknown }
      return contents.summary
        ? { text: JSON.stringify({ nextTip: 'Wait for a gap.' }) }
        : { text: JSON.stringify({ decision: { kind: 'refusal', reason: 'cannot_satisfy_goal' } }) }
    })
    const adapters = createGeminiBackupAdapters({ apiKey: 'fake-only', createClient: fake.createClient as never })
    const signal = new AbortController().signal
    await expect(adapters.generator.decide({ runId: 'run-fake' } as GeneratorDecisionContext, signal, { timeoutMs: 7_000 }))
      .resolves.toEqual({ kind: 'refusal', reason: 'cannot_satisfy_goal' })
    await expect(adapters.advice.generateTip({
      summary: { outcome: 'won', difficulty: 'easy', ticks: 9, crossings: 1, targetCrossings: 1,
        startingLives: 3, remainingLives: 3, score: 100 },
      focus: 'general', evidence: 'One crossing was completed.',
    } as ProviderInput, signal, { timeoutMs: 7_000 })).resolves.toEqual({ nextTip: 'Wait for a gap.' })

    const generationParameters = fake.generate.mock.calls[0]?.[0] as {
      model: string
      config: { maxOutputTokens: number; httpOptions: { timeout: number; retryOptions: { attempts: number } }; abortSignal: AbortSignal;
        responseJsonSchema: { type: string; required: string[]; properties: Record<string, unknown> } }
    }
    const adviceParameters = fake.generate.mock.calls[1]?.[0] as typeof generationParameters
    expect(generationParameters.model).toBe(GEMINI_BACKUP_MODEL)
    expect(generationParameters.config.maxOutputTokens).toBe(2_048)
    expect(generationParameters.config.responseJsonSchema.required).toEqual(['decision'])
    expect(generationParameters.config.httpOptions).toEqual({ timeout: 7_000, retryOptions: { attempts: 1 } })
    expect(generationParameters.config.abortSignal).toBe(signal)
    expect(adviceParameters.model).toBe(GEMINI_BACKUP_MODEL)
    expect(adviceParameters.config.maxOutputTokens).toBe(120)
    expect(adviceParameters.config.responseJsonSchema.required).toEqual(['nextTip'])
    expect(adviceParameters.config.httpOptions).toEqual({ timeout: 7_000, retryOptions: { attempts: 1 } })
    expect(adviceParameters.config.abortSignal).toBe(signal)
    expect(fake.generate).toHaveBeenCalledTimes(2)
  })

  it('maps transport failures into safe categories without exposing provider text', async () => {
    const fake = fakeClient(async () => { throw new TypeError('private provider response') })
    const adapters = createGeminiBackupAdapters({ apiKey: 'fake-only', createClient: fake.createClient as never })

    await expect(adapters.generator.decide({ runId: 'run-fake' } as GeneratorDecisionContext, new AbortController().signal))
      .rejects.toMatchObject({ kind: 'temporary_unavailable', message: 'Generator model request failed.' })
    await expect(adapters.advice.generateTip({} as ProviderInput, new AbortController().signal))
      .rejects.toMatchObject({ category: 'temporary_unavailable', message: 'Provider operation failed.' })
  })

  it.each([
    [429, 'rate_limit', 'rate_limit'],
    [408, 'timeout', 'timeout'],
    [503, 'temporary_unavailable', 'temporary_unavailable'],
    [401, 'configuration', 'configuration'],
    [400, 'permanent', 'permanent'],
  ] as const)('classifies HTTP %i consistently for both operations', async (status, generatorKind, adviceCategory) => {
    const fake = fakeClient(async () => { throw new ApiError({ message: 'private provider payload', status }) })
    const adapters = createGeminiBackupAdapters({ apiKey: 'fake-only', createClient: fake.createClient as never })
    await expect(adapters.generator.decide({ runId: 'run-fake' } as GeneratorDecisionContext, new AbortController().signal))
      .rejects.toMatchObject({ kind: generatorKind, message: 'Generator model request failed.' })
    await expect(adapters.advice.generateTip({} as ProviderInput, new AbortController().signal))
      .rejects.toMatchObject({ category: adviceCategory, message: 'Provider operation failed.' })
  })
})
