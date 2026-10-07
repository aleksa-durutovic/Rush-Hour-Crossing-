import { describe, expect, it } from 'vitest'
import { DIFFICULTY_PRESETS } from '../src/config/presets'
import {
  canonicalCandidateKey,
  getGeneratedLevelTemplate,
  normalizeGeneratedLanes,
} from '../src/config/generated-level'
import type { LaneDefinition } from '../src/game/state'

const candidate = (overrides: Partial<LaneDefinition>[] = []): LaneDefinition[] =>
  Array.from({ length: 5 }, (_unused, index) => ({
    row: index + 1,
    direction: index % 2 ? 'left' : 'right',
    moveEveryTicks: 1,
    vehicleLength: 1,
    vehicleStarts: [index],
    ...overrides[index],
  }))

describe('generated level policy', () => {
  it('accepts exactly five unique rows and normalizes row/start ordering', () => {
    const input = candidate().reverse().map((lane) => ({ ...lane, vehicleStarts: [8, 2] }))
    const normalized = normalizeGeneratedLanes(input)

    expect(normalized).toHaveLength(5)
    expect(normalized?.map((lane) => lane.row)).toEqual([1, 2, 3, 4, 5])
    expect(normalized?.every((lane) => lane.vehicleStarts[0] === 2 && lane.vehicleStarts[1] === 8)).toBe(true)
    expect(normalizeGeneratedLanes(candidate().slice(1))).toBeNull()
    expect(normalizeGeneratedLanes([...candidate(), candidate()[0]!])).toBeNull()
  })

  it.each([
    ['direction', { direction: 'up' }],
    ['interval', { moveEveryTicks: 4 }],
    ['vehicle length', { vehicleLength: 3 }],
    ['start range', { vehicleStarts: [9] }],
    ['empty starts', { vehicleStarts: [] }],
    ['too many starts', { vehicleStarts: [0, 2, 4, 6, 8] }],
    ['duplicate starts', { vehicleStarts: [2, 2] }],
    ['extra lane property', { secret: true }],
  ])('rejects invalid %s without coercion', (_label, override) => {
    expect(normalizeGeneratedLanes(candidate([override as Partial<LaneDefinition>]))).toBeNull()
  })

  it('rejects circular overlap and full/overlapping traffic while allowing adjacent vehicles', () => {
    expect(normalizeGeneratedLanes(candidate([{ vehicleLength: 2, vehicleStarts: [8, 0] }]))).toBeNull()
    expect(normalizeGeneratedLanes(candidate([{ vehicleLength: 2, vehicleStarts: [0, 1] }]))).toBeNull()
    expect(normalizeGeneratedLanes(candidate([{ vehicleLength: 2, vehicleStarts: [0, 2, 4, 6] }]))).not.toBeNull()
  })

  it('uses normalized traffic, settings and rules version for repetition identity', () => {
    const lanes = candidate()
    const reversed = [...lanes].reverse().map((lane) => ({ ...lane, vehicleStarts: [...lane.vehicleStarts].reverse() }))
    const settings = { lives: 3, crossingsToWin: 3 }

    expect(canonicalCandidateKey(lanes, settings)).toBe(canonicalCandidateKey(reversed, settings))
    expect(canonicalCandidateKey(lanes, settings)).not.toBe(canonicalCandidateKey(lanes, { ...settings, lives: 2 }))
    expect(canonicalCandidateKey(lanes, settings, 'rules-v2')).not.toBe(canonicalCandidateKey(lanes, settings, 'rules-v1'))
  })

  it('provides five separately cloned templates with the approved row-one rotations', () => {
    const originals = structuredClone(DIFFICULTY_PRESETS)
    const templates = [1, 2, 3, 4, 5].map((rating) => getGeneratedLevelTemplate(rating as 1 | 2 | 3 | 4 | 5))

    expect(templates.map((lanes) => lanes[0]?.vehicleStarts)).toEqual([
      [0, 4], [2, 5, 8], [0, 3, 6], [1, 4], [0, 6],
    ])
    expect(templates.every((template) => normalizeGeneratedLanes(template) !== null)).toBe(true)
    expect(templates[0]).not.toBe(DIFFICULTY_PRESETS.easy)
    expect(templates[0]?.[0]).not.toBe(DIFFICULTY_PRESETS.easy[0])
    expect(DIFFICULTY_PRESETS).toEqual(originals)
  })
})
