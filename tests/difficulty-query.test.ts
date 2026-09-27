import { describe, expect, it } from 'vitest'
import { buildDifficultySearch } from '../src/config/difficulty-query'
import { DIFFICULTIES, resolveGameConfig } from '../src/config/game-config'
import { DIFFICULTY_PRESETS } from '../src/config/presets'
import type { Difficulty } from '../src/game/state'

const VALID_QUERY_CASES: [string, Difficulty, string][] = [
  ['', 'hard', '?difficulty=hard'],
  ['?difficulty=easy', 'normal', '?difficulty=normal'],
  ['?lives=2&crossingsToWin=5&difficulty=easy', 'hard', '?lives=2&crossingsToWin=5&difficulty=hard'],
  ['?difficulty=hard&lives=2', 'normal', '?difficulty=normal&lives=2'],
  ['?foo=bar', 'easy', '?foo=bar&difficulty=easy'],
]

const FALLBACK_QUERY_CASES: [string, Difficulty, string][] = [
  ['?lives=0&crossingsToWin=11&difficulty=insane', 'hard', '?difficulty=hard'],
  ['?lives=2&difficulty=insane', 'easy', '?difficulty=easy'],
  ['?lives=0&crossingsToWin=4&foo=bar', 'normal', '?foo=bar&difficulty=normal'],
]

describe('difficulty selector query', () => {
  it('offers every preset in easy, normal, hard order', () => {
    expect(DIFFICULTIES).toEqual(['easy', 'normal', 'hard'])
    expect(Object.keys(DIFFICULTY_PRESETS)).toEqual([...DIFFICULTIES])
  })

  it.each(VALID_QUERY_CASES)('keeps the valid query "%s" and selects %s', (search, difficulty, expected) => {
    expect(buildDifficultySearch(search, difficulty, false)).toBe(expected)
  })

  it.each(FALLBACK_QUERY_CASES)('drops rejected values from the fallback query "%s" and selects %s', (search, difficulty, expected) => {
    expect(buildDifficultySearch(search, difficulty, true)).toBe(expected)
  })

  it.each(DIFFICULTIES)('a reload of the new query plays %s without a fallback', (difficulty) => {
    const search = buildDifficultySearch('?lives=2&crossingsToWin=4', difficulty, false)

    expect(resolveGameConfig(new URLSearchParams(search))).toEqual({
      config: { lives: 2, crossingsToWin: 4, difficulty },
      invalidFields: [],
      usedFallback: false,
    })
  })
})
