import { isAdviceResponse, type AdviceResponse, type CompletedRunSummary } from '../../shared/advice-contract'

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
    const value: unknown = await response.json()
    return isAdviceResponse(value) ? value : null
  } catch {
    return null
  }
}
