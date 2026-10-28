import { isAdviceResponse, type AdviceResponse, type CompletedRunSummary } from '../../shared/advice-contract'

const MAX_ADVICE_RESPONSE_BYTES = 4096

export async function requestAdvice(
  summary: CompletedRunSummary,
  signal: AbortSignal,
): Promise<AdviceResponse | null> {
  try {
    const response = await fetch('/api/advice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(summary),
      signal,
      cache: 'no-store',
    })
    if (!response.ok) return null
    const reader = response.body?.getReader()
    if (!reader) return null

    const chunks: Uint8Array[] = []
    let size = 0
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        size += value.byteLength
        if (size > MAX_ADVICE_RESPONSE_BYTES) {
          await reader.cancel()
          return null
        }
        chunks.push(value)
      }
    } finally {
      reader.releaseLock()
    }

    const bytes = new Uint8Array(size)
    let offset = 0
    for (const chunk of chunks) {
      bytes.set(chunk, offset)
      offset += chunk.byteLength
    }
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    const value: unknown = JSON.parse(text) as unknown
    return isAdviceResponse(value) ? value : null
  } catch {
    return null
  }
}
