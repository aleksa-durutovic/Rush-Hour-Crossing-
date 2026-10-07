import {
  generationRequestSchema,
  generationResponseSchema,
  type GenerationRequest,
  type GenerationResponse,
} from '../../shared/level-generator-contract'

export const MAX_GENERATION_RESPONSE_BYTES = 16_384

export async function requestGeneratedLevel(
  requestValue: GenerationRequest,
  signal: AbortSignal,
): Promise<GenerationResponse | null> {
  const request = generationRequestSchema.safeParse(requestValue)
  if (!request.success || signal.aborted) return null

  try {
    const response = await fetch('/api/levels/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request.data),
      signal,
      cache: 'no-store',
      credentials: 'same-origin',
      mode: 'same-origin',
    })
    if (!response.ok) return null
    const text = await response.text()
    if (new TextEncoder().encode(text).byteLength > MAX_GENERATION_RESPONSE_BYTES) return null
    const value: unknown = JSON.parse(text)
    const parsed = generationResponseSchema.safeParse(value)
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}
