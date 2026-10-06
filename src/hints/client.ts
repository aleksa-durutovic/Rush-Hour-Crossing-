import {
  HINT_RESPONSE_MAX_BYTES,
  isHintResponse,
  type HintResponse,
  type HintSnapshot,
} from '../../shared/hint-agent-contract'

export async function requestHint(snapshot: HintSnapshot, signal: AbortSignal): Promise<HintResponse | null> {
  try {
    const response = await fetch('/api/hint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(snapshot),
      signal,
      cache: 'no-store',
    })
    if (!response.ok) return null

    const declaredBytes = Number(response.headers.get('content-length') ?? 0)
    if (Number.isFinite(declaredBytes) && declaredBytes > HINT_RESPONSE_MAX_BYTES) return null
    const body = await response.text()
    if (new TextEncoder().encode(body).byteLength > HINT_RESPONSE_MAX_BYTES) return null

    const value: unknown = JSON.parse(body)
    return isHintResponse(value, snapshot) ? value : null
  } catch {
    return null
  }
}
