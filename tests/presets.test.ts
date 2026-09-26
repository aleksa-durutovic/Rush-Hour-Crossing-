import { describe, expect, it } from 'vitest'
import { GRID_COLUMNS } from '../src/game/constants'
import { DIFFICULTY_PRESETS } from '../src/config/presets'
import { getOccupiedCells, getVehicleCells } from '../src/game/traffic'

describe('difficulty presets', () => {
  it.each(Object.entries(DIFFICULTY_PRESETS))(
    '%s has five unique, never-blocked traffic lanes through tick 199',
    (_difficulty, lanes) => {
      expect(lanes.map((lane) => lane.row)).toEqual([1, 2, 3, 4, 5])

      for (const lane of lanes) {
        for (let tick = 0; tick <= 199; tick += 1) {
          expect(getOccupiedCells(lane, tick).size).toBeLessThan(GRID_COLUMNS)
        }
      }
    },
  )

  it.each(Object.entries(DIFFICULTY_PRESETS))(
    '%s never places two vehicles of one lane on the same cell through tick 199',
    (_difficulty, lanes) => {
      for (const lane of lanes) {
        for (let tick = 0; tick <= 199; tick += 1) {
          const cells = lane.vehicleStarts.flatMap((start) => getVehicleCells(lane, tick, start))
          expect(new Set(cells).size, `row ${lane.row}, tick ${tick}`).toBe(cells.length)
        }
      }
    },
  )
})
