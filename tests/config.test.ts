import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG, resolveGameConfig } from '../src/config/game-config'

describe('game configuration', () => {
  it('accepts the valid example', () => {
    const result = resolveGameConfig(new URLSearchParams('lives=2&crossingsToWin=3&difficulty=hard'))

    expect(result).toEqual({
      config: { lives: 2, crossingsToWin: 3, difficulty: 'hard' },
      invalidFields: [],
      usedFallback: false,
    })
  })

  it('defaults only missing fields and ignores unknown fields', () => {
    const result = resolveGameConfig(new URLSearchParams('lives=2&unknown=value'))

    expect(result.config).toEqual({ ...DEFAULT_CONFIG, lives: 2 })
    expect(result.invalidFields).toEqual([])
    expect(result.usedFallback).toBe(false)
  })

  it.each([
    ['lives=0', ['lives']],
    ['lives=2.5', ['lives']],
    ['lives=abc', ['lives']],
    ['crossingsToWin=11', ['crossingsToWin']],
    ['difficulty=insane', ['difficulty']],
  ])('rejects required invalid example %s', (query, invalidFields) => {
    expect(resolveGameConfig(new URLSearchParams(query))).toEqual({
      config: DEFAULT_CONFIG,
      invalidFields,
      usedFallback: true,
    })
  })

  it('rejects the whole configuration and reports every invalid field', () => {
    const result = resolveGameConfig(
      new URLSearchParams('lives=0&crossingsToWin=11&difficulty=insane'),
    )

    expect(result.config).toEqual(DEFAULT_CONFIG)
    expect(result.invalidFields).toEqual(['lives', 'crossingsToWin', 'difficulty'])
    expect(result.usedFallback).toBe(true)
  })
})
