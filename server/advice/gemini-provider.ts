import { ApiError, GoogleGenAI } from '@google/genai'
import type { AdviceProvider, ProviderInput } from './service'
import { TransientProviderError } from './service'

export const GEMINI_MODEL = 'gemini-3.1-flash-lite'
const OUTPUT_SCHEMA = {
  type: 'object',
  properties: { nextTip: { type: 'string' } },
  required: ['nextTip'],
  additionalProperties: false,
}

class ProviderConfigurationError extends Error {}

export function createGeminiProvider(apiKey = process.env.GEMINI_API_KEY): AdviceProvider {
  return {
    async generateTip(input: ProviderInput, signal: AbortSignal): Promise<unknown> {
      if (!apiKey) throw new ProviderConfigurationError()
      const ai = new GoogleGenAI({ apiKey })
      try {
        const response = await ai.models.generateContent({
          model: GEMINI_MODEL,
          contents: JSON.stringify(input),
          config: {
            systemInstruction:
              'You are a brief Rush Hour Crossing coach. Give one practical tip grounded only in the supplied run summary, focus, and evidence. Keep nextTip non-empty and no longer than 160 characters. Do not claim events the summary cannot support. Return only a JSON object with nextTip, no markdown or extra keys.',
            responseMimeType: 'application/json',
            responseJsonSchema: OUTPUT_SCHEMA,
            maxOutputTokens: 120,
            temperature: 0.3,
            httpOptions: { timeout: 15_000, retryOptions: { attempts: 1 } },
            abortSignal: signal,
          },
        })
        const text = response.text
        if (typeof text !== 'string') return null
        try {
          return JSON.parse(text) as unknown
        } catch {
          return null
        }
      } catch (error) {
        if (error instanceof ApiError && (error.status === 408 || error.status === 429 || error.status >= 500)) {
          throw new TransientProviderError()
        }
        if (error instanceof TypeError) throw new TransientProviderError()
        throw error
      }
    },
  }
}
