import { describe, expect, it } from 'vitest'
import type { LaneDefinition } from '../src/game/state'
import { getOccupiedCells, getVehicleCells } from '../src/game/traffic'

describe('traffic occupancy', () => {
  it('wraps a right-moving multi-cell vehicle', () => {
    const lane: LaneDefinition = {
      row: 1,
      direction: 'right',
      moveEveryTicks: 1,
      vehicleLength: 2,
      vehicleStarts: [8],
    }

    expect(getOccupiedCells(lane, 0)).toEqual(new Set([8, 0]))
    expect(getOccupiedCells(lane, 1)).toEqual(new Set([0, 1]))
    expect(getVehicleCells(lane, 0, 8)).toEqual([8, 0])
  })

  it('wraps a left-moving vehicle', () => {
    const lane: LaneDefinition = {
      row: 2,
      direction: 'left',
      moveEveryTicks: 1,
      vehicleLength: 2,
      vehicleStarts: [0],
    }

    expect(getOccupiedCells(lane, 1)).toEqual(new Set([8, 0]))
  })

  it('moves only on the configured interval', () => {
    const lane: LaneDefinition = {
      row: 3,
      direction: 'right',
      moveEveryTicks: 2,
      vehicleLength: 1,
      vehicleStarts: [2],
    }

    expect(getOccupiedCells(lane, 0)).toEqual(new Set([2]))
    expect(getOccupiedCells(lane, 1)).toEqual(new Set([2]))
    expect(getOccupiedCells(lane, 2)).toEqual(new Set([3]))
  })
})
