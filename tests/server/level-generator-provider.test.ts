import { describe, expect, it, vi } from 'vitest'
import { GEMINI_MODEL, createGeminiGeneratorModel } from '../../server/advice/gemini-provider'
import { GeneratorModelError, type GeneratorDecisionContext } from '../../server/level-generator/model'
import { createLevelGeneratorService } from '../../server/level-generator/service'
import { getGeneratedLevelTemplate } from '../../src/config/generated-level'

const context: GeneratorDecisionContext = {
  runId: 'run-test',
  request: { targetDifficulty: 3, lives: 3, crossingsToWin: 3 },
  goal: 'Find an exactly rated full-target verified level.',
  rules: ['Check both collision phases.'],
  laneContract: 'Five lane definitions only.',
  ratingBands: { 1: { minimumMoves: 6, maximumMoves: 8 }, 2: { minimumMoves: 9, maximumMoves: 10 },
    3: { minimumMoves: 11, maximumMoves: 12 }, 4: { minimumMoves: 13, maximumMoves: 14 }, 5: { minimumMoves: 15, maximumMoves: null } },
  candidates: [],
  tools: [{ name: 'solveLevel', description: 'Read-only local solver.' }],
  remaining: {
    decisions: 5, providerAttempts: 6, retries: 1, solverExecutions: 7, candidates: 3,
    revisions: 2, millisecondsToDecisionCutoff: 40_000, millisecondsToDeadline: 45_000,
  },
  counters: {
    stepCount: 0, providerAttemptCount: 0, retryCount: 0, toolCallCount: 0, modelToolCallCount: 0, revisionCount: 0,
  },
  evaluations: [],
}

function fakeClient(generateContent: (parameters: unknown) => Promise<{ text?: string; candidates?: { finishReason: string }[] }>) {
  const generate = vi.fn(generateContent)
  const createClient = vi.fn(() => ({ models: { generateContent: generate } }))
  return { generate, createClient }
}

describe('Gemini generator decision adapter', () => {
  it('returns structured decisions through the fake SDK transport', async () => {
    const decision = { kind: 'refusal', reason: 'cannot_satisfy_goal' }
    const fake = fakeClient(async () => ({ text: JSON.stringify({ decision }) }))
    const model = createGeminiGeneratorModel({ apiKey: 'test-only', createClient: fake.createClient as never })

    await expect(model.decide(context, new AbortController().signal)).resolves.toEqual(decision)
    expect(fake.createClient).toHaveBeenCalledTimes(1)
    expect(fake.generate).toHaveBeenCalledTimes(1)
  })

  it('uses the installed model configuration, strict JSON decision schema and one SDK attempt', async () => {
    const fake = fakeClient(async () => ({ text: JSON.stringify({ decision: { kind: 'refusal', reason: 'cannot_satisfy_goal' } }) }))
    const model = createGeminiGeneratorModel({ apiKey: 'test-only', createClient: fake.createClient as never })
    const signal = new AbortController().signal
    await model.decide(context, signal)
    const parameters = fake.generate.mock.calls[0]?.[0] as {
      model: string
      contents: string
      config: {
        maxOutputTokens: number
        responseMimeType: string
        responseJsonSchema: { type: string; properties: { decision: { anyOf: unknown[] } }; required: string[]; additionalProperties: boolean }
        httpOptions: { retryOptions: { attempts: number }; timeout: number }
        abortSignal: AbortSignal
      }
    }

    expect(parameters.model).toBe(GEMINI_MODEL)
    expect(parameters.contents).toContain('run-test')
    expect(parameters.config.maxOutputTokens).toBe(2_048)
    expect(parameters.config.responseMimeType).toBe('application/json')
    expect(parameters.config.responseJsonSchema.type).toBe('object')
    expect(parameters.config.responseJsonSchema.properties.decision.anyOf).toHaveLength(3)
    expect(parameters.config.responseJsonSchema.required).toEqual(['decision'])
    expect(parameters.config.responseJsonSchema.additionalProperties).toBe(false)
    expect(parameters.config.httpOptions.retryOptions.attempts).toBe(1)
    expect(parameters.config.httpOptions.timeout).toBe(15_000)
    expect(parameters.config.abortSignal).toBe(signal)
  })

  it('honors the application-clipped provider timeout while keeping one SDK attempt', async () => {
    const fake = fakeClient(async () => ({
      text: JSON.stringify({ decision: { kind: 'refusal', reason: 'cannot_satisfy_goal' } }),
    }))
    const model = createGeminiGeneratorModel({ apiKey: 'test-only', createClient: fake.createClient as never })
    await model.decide(context, new AbortController().signal, { timeoutMs: 8_000 })
    const parameters = fake.generate.mock.calls[0]?.[0] as {
      config: { httpOptions: { timeout: number; retryOptions: { attempts: number } } }
    }
    expect(parameters.config.httpOptions.timeout).toBe(8_000)
    expect(parameters.config.httpOptions.retryOptions.attempts).toBe(1)
  })

  it('passes enveloped tool and final decisions through the actual solver service', async () => {
    const fake = fakeClient(async (parameters) => {
      const supplied = JSON.parse((parameters as { contents: string }).contents) as GeneratorDecisionContext
      const evidence = supplied.evaluations[0]
      const decision = evidence
        ? { kind: 'final', candidateId: evidence.candidateId, evaluationId: evidence.evaluationId, summary: 'Verified.' }
        : { kind: 'tool_request', name: 'solveLevel', arguments: { lanes: getGeneratedLevelTemplate(3) } }
      return { text: JSON.stringify({ decision }), candidates: [{ finishReason: 'STOP' }] }
    })
    const model = createGeminiGeneratorModel({ apiKey: 'test-only', createClient: fake.createClient as never })
    const result = await createLevelGeneratorService({ model }).generate(context.request, new AbortController().signal)
    expect(result).toMatchObject({ kind: 'preview', completed: true, stopReason: 'goal_completed' })
    expect(result.counters).toMatchObject({ providerAttemptCount: 2, modelToolCallCount: 1, toolCallCount: 2 })
  })

  it('rejects extra envelope fields and malformed nested decisions', async () => {
    for (const value of [
      { decision: { kind: 'refusal', reason: 'cannot_satisfy_goal' }, extra: true },
      { decision: { kind: 'refusal', reason: 'cannot_satisfy_goal', extra: true } },
      { kind: 'refusal', reason: 'cannot_satisfy_goal' },
    ]) {
      const fake = fakeClient(async () => ({ text: JSON.stringify(value) }))
      const model = createGeminiGeneratorModel({ apiKey: 'test-only', createClient: fake.createClient as never })
      await expect(model.decide(context, new AbortController().signal)).resolves.toBeNull()
    }
  })

  it('treats a token-truncated provider response as operational failure even if its text parses', async () => {
    const fake = fakeClient(async () => ({
      text: JSON.stringify({ decision: { kind: 'refusal', reason: 'cannot_satisfy_goal' } }),
      candidates: [{ finishReason: 'MAX_TOKENS' }],
    }))
    const model = createGeminiGeneratorModel({ apiKey: 'test-only', createClient: fake.createClient as never })
    await expect(model.decide(context, new AbortController().signal)).rejects.toMatchObject({ kind: 'output_limit' })
    const result = await createLevelGeneratorService({ model }).generate(context.request, new AbortController().signal)
    expect(result).toMatchObject({ kind: 'preview', completed: false, source: 'template', stopReason: 'provider_failed' })
    expect(result.counters).toMatchObject({ providerAttemptCount: 1, modelToolCallCount: 0, toolCallCount: 1 })
  })

  it('bounds both serialized context and raw model output before parsing', async () => {
    const fake = fakeClient(async () => ({ text: 'x'.repeat(8_193) }))
    const model = createGeminiGeneratorModel({ apiKey: 'test-only', createClient: fake.createClient as never })

    await expect(model.decide(context, new AbortController().signal)).resolves.toBeNull()
    expect(fake.generate).toHaveBeenCalledTimes(1)
    await expect(model.decide({ ...context, goal: 'x'.repeat(24_600) }, new AbortController().signal))
      .rejects.toBeInstanceOf(GeneratorModelError)
    expect(fake.generate).toHaveBeenCalledTimes(1)
  })

  it('classifies transient transport errors and hides provider messages', async () => {
    const fake = fakeClient(async () => { throw new TypeError('private provider payload') })
    const model = createGeminiGeneratorModel({ apiKey: 'test-only', createClient: fake.createClient as never })

    try {
      await model.decide(context, new AbortController().signal)
      throw new Error('Expected the model request to fail.')
    } catch (error) {
      expect(error).toBeInstanceOf(GeneratorModelError)
      expect(error).toMatchObject({ kind: 'temporary_unavailable' })
      expect((error as Error).message).not.toContain('private provider payload')
    }
  })

  it('classifies configuration/permanent failures without retrying inside the adapter', async () => {
    const model = createGeminiGeneratorModel({ apiKey: '', createClient: vi.fn() as never })
    await expect(model.decide(context, new AbortController().signal)).rejects.toMatchObject({ kind: 'configuration' })

    const fake = fakeClient(async () => { throw new Error('private provider payload') })
    const permanent = createGeminiGeneratorModel({ apiKey: 'test-only', createClient: fake.createClient as never })
    await expect(permanent.decide(context, new AbortController().signal)).rejects.toMatchObject({
      kind: 'permanent',
      message: 'Generator model request failed.',
    })
    expect(fake.generate).toHaveBeenCalledTimes(1)
  })
})
