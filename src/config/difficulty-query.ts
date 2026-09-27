import type { Difficulty } from '../game/state'

/**
 * Returns the query string for the current URL with `difficulty` selected.
 * After a configuration fallback the rejected `lives` and `crossingsToWin`
 * values are removed, so a reload plays the configuration that is on screen.
 */
export function buildDifficultySearch(
  search: string,
  difficulty: Difficulty,
  usedFallback: boolean,
): string {
  const params = new URLSearchParams(search)

  if (usedFallback) {
    params.delete('lives')
    params.delete('crossingsToWin')
  }

  params.set('difficulty', difficulty)
  return `?${params.toString()}`
}
