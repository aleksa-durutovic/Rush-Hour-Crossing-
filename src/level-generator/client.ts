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
    if (!response.ok) {
      cancelBody(response.body)
      return null
    }
    const text = await readBoundedResponse(response, signal)
    if (text === null || signal.aborted) return null
    const value: unknown = JSON.parse(text)
    const parsed = generationResponseSchema.safeParse(value)
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

async function readBoundedResponse(response: Response, signal: AbortSignal): Promise<string | null> {
  const reader = response.body?.getReader()
  if (!reader) {
    cancelBody(response.body)
    return null
  }

  const chunks: Uint8Array[] = []
  let size = 0
  let completed = false
  let cancelRequested = false
  let resolveAborted!: () => void
  const aborted = new Promise<void>(resolve => { resolveAborted = resolve })
  const cancel = (): void => {
    if (cancelRequested) return
    cancelRequested = true
    requestCancel(reader)
    resolveAborted()
  }
  const onAbort = (): void => cancel()
  signal.addEventListener('abort', onAbort, { once: true })

  try {
    if (signal.aborted) return null
    while (true) {
      const next = await Promise.race([
        reader.read().then(result => ({ kind: 'read' as const, result })),
        aborted.then(() => ({ kind: 'aborted' as const })),
      ])
      if (next.kind === 'aborted' || signal.aborted) return null
      if (next.result.done) {
        completed = true
        break
      }
      const chunk = next.result.value
      if (chunk.byteLength > MAX_GENERATION_RESPONSE_BYTES - size) {
        cancel()
        return null
      }
      chunks.push(chunk)
      size += chunk.byteLength
    }

    const bytes = new Uint8Array(size)
    let offset = 0
    for (const chunk of chunks) {
      bytes.set(chunk, offset)
      offset += chunk.byteLength
    }
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    cancel()
    return null
  } finally {
    signal.removeEventListener('abort', onAbort)
    if (!completed) cancel()
    try {
      reader.releaseLock()
    } catch {
      // A cancelled stream can reject lock release; this must not mask the failed read.
    }
  }
}

function requestCancel(reader: ReadableStreamDefaultReader<Uint8Array>): void {
  try {
    void reader.cancel().catch(() => undefined)
  } catch {
    // Cancellation is best effort and never delays response handling.
  }
}

function cancelBody(body: ReadableStream<Uint8Array> | null): void {
  if (!body) return
  try {
    void body.cancel().catch(() => undefined)
  } catch {
    // Cancellation is best effort and never delays response handling.
  }
}
