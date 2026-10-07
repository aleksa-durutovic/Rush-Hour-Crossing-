import { laneSetSchema } from '../../shared/level-generator-contract'
import { DIFFICULTY_PRESETS } from './presets'
import type { Difficulty, LaneDefinition } from '../game/state'

export type GeneratedDifficulty = 1 | 2 | 3 | 4 | 5

export interface GeneratedLevelSettings {
  lives: number
  crossingsToWin: number
}

export interface GeneratedRatingBand {
  minimumMoves: number
  maximumMoves: number | null
}

export const GENERATED_RATING_BANDS: Readonly<Record<GeneratedDifficulty, GeneratedRatingBand>> = {
  1: { minimumMoves: 6, maximumMoves: 8 },
  2: { minimumMoves: 9, maximumMoves: 10 },
  3: { minimumMoves: 11, maximumMoves: 12 },
  4: { minimumMoves: 13, maximumMoves: 14 },
  5: { minimumMoves: 15, maximumMoves: null },
}

const TEMPLATE_PRESETS: Readonly<Record<GeneratedDifficulty, Difficulty>> = {
  1: 'easy',
  2: 'normal',
  3: 'normal',
  4: 'hard',
  5: 'hard',
}

const TEMPLATE_ROTATIONS: Readonly<Partial<Record<GeneratedDifficulty, number>>> = {
  2: 2,
  4: 4,
}

export function normalizeGeneratedLanes(value: unknown): LaneDefinition[] | null {
  const parsed = laneSetSchema.safeParse(value)
  if (!parsed.success) return null

  return parsed.data
    .map((lane) => ({
      row: lane.row,
      direction: lane.direction,
      moveEveryTicks: lane.moveEveryTicks,
      vehicleLength: lane.vehicleLength,
      vehicleStarts: [...lane.vehicleStarts].sort((left, right) => left - right),
    }))
    .sort((left, right) => left.row - right.row)
}

export function canonicalCandidateKey(
  lanes: readonly LaneDefinition[],
  settings: GeneratedLevelSettings,
  rulesVersion = 'rules-v1',
): string {
  const normalized = normalizeGeneratedLanes(lanes)
  if (!normalized) throw new TypeError('Candidate lanes are invalid.')
  return JSON.stringify({ rulesVersion, settings, lanes: normalized })
}

export function getGeneratedLevelTemplate(rating: GeneratedDifficulty): LaneDefinition[] {
  const preset = TEMPLATE_PRESETS[rating]
  const rotation = TEMPLATE_ROTATIONS[rating] ?? 0
  const lanes = DIFFICULTY_PRESETS[preset].map((lane) => ({
    ...lane,
    vehicleStarts: [...lane.vehicleStarts],
  }))

  if (rotation > 0) {
    const firstLane = lanes.find((lane) => lane.row === 1)
    if (firstLane) {
      firstLane.vehicleStarts = firstLane.vehicleStarts
        .map((start) => (start + rotation) % 9)
        .sort((left, right) => left - right)
    }
  }

  const normalized = normalizeGeneratedLanes(lanes)
  if (!normalized) throw new Error('Configured generated template violates lane invariants.')
  return normalized
}

export function ratingForFirstCrossingMoves(moves: number): GeneratedDifficulty | null {
  if (!Number.isSafeInteger(moves) || moves < 6) return null
  for (const rating of [1, 2, 3, 4, 5] as const) {
    const band = GENERATED_RATING_BANDS[rating]
    if (moves >= band.minimumMoves && (band.maximumMoves === null || moves <= band.maximumMoves)) return rating
  }
  return null
}
