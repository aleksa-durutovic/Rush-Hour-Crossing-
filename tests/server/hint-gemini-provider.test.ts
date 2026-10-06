import { beforeEach, describe, expect, it, vi } from 'vitest'

const { generateContent } = vi.hoisted(() => ({ generateContent: vi.fn() }))

vi.mock('@google/genai', () => ({
  ApiError: class ApiError extends Error {
    status: number
    constructor(options: { status: number; message: string }) {
      super(options.message)
      this.status = options.status
    }
  },
  FunctionCallingConfigMode: { ANY: 'ANY', NONE: 'NONE' },
  GoogleGenAI: class GoogleGenAI {
    models = { generateContent }
    constructor(_options: { apiKey: string }) {}
  },
  Type: { OBJECT: 'OBJECT' },
}))

import { createGeminiHintProvider } from '../../server/agent/gemini-provider'
import { ApiError } from '@google/genai'
import { nearGoalSnapshot } from '../hints/fixtures'

describe('Gemini Hint provider request schemas', () => {
  beforeEach(() => {
    generateContent.mockReset().mockResolvedValue({ text: '{"explanation":"Follow the verified route."}' })
  })

  it('sends the explanation schema in JSON Schema lowercase type names', async () => {
    const provider = createGeminiHintProvider('test-api-key')
    await provider.explainVerifiedPath(
      { prompt: 'original user content', candidate: { role: 'model', parts: [] } },
      { outcome: 'verified', actionCount: 1, finalCrossings: 1, unchangedLives: 3 },
      new AbortController().signal,
    )

    expect(generateContent).toHaveBeenCalledWith(expect.objectContaining({
      config: expect.objectContaining({
        tools: [{ functionDeclarations: [expect.objectContaining({ name: 'find_safe_path' })] }],
        responseJsonSchema: {
          type: 'object',
          properties: { explanation: { type: 'string' } },
          required: ['explanation'],
          additionalProperties: false,
        },
      }),
    }))
    expect(generateContent.mock.calls[0]?.[0].config.toolConfig).toEqual({
      functionCallingConfig: { mode: 'NONE' },
    })
    expect(generateContent.mock.calls[0]?.[0].contents).toEqual([
      { role: 'user', parts: [{ text: 'original user content' }] },
      { role: 'model', parts: [] },
      {
        role: 'user',
        parts: [{ functionResponse: { name: 'find_safe_path', response: {
          outcome: 'verified', actionCount: 1, finalCrossings: 1, unchangedLives: 3,
        } } }],
      },
    ])
  })

  it('declares the safe-path function without an empty parameter schema', async () => {
    generateContent.mockResolvedValue({
      functionCalls: [{ name: 'find_safe_path' }],
      candidates: [{ content: { role: 'model', parts: [] } }],
    })
    const provider = createGeminiHintProvider('test-api-key')

    const proposal = await provider.proposePath(nearGoalSnapshot, new AbortController().signal)

    const request = generateContent.mock.calls[0]?.[0]
    expect(request.config.tools[0].functionDeclarations[0]).not.toHaveProperty('parameters')
    expect(proposal.calls).toEqual([{ name: 'find_safe_path', args: {} }])
    expect(proposal.continuation).toMatchObject({ prompt: JSON.stringify({
      goal: 'Request the one safe-path solver tool for this active snapshot.',
      snapshot: nearGoalSnapshot,
    }) })
  })

  it('logs a safe HTTP status without exposing a provider error message', async () => {
    generateContent.mockRejectedValue(new ApiError({ status: 400, message: 'private provider detail' }))
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const provider = createGeminiHintProvider('test-api-key')

    await expect(provider.proposePath(nearGoalSnapshot, new AbortController().signal)).rejects.toMatchObject({ status: 400 })

    expect(log).toHaveBeenCalledWith('[hint] Gemini safe-path tool call request failed (HTTP 400).')
    expect(log.mock.calls.flat().join(' ')).not.toContain('private provider detail')
    log.mockRestore()
  })
})
