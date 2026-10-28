import { describe, expect, it } from 'vitest'
import { ratingForFirstCrossingMoves } from '../src/config/generated-level'
import { measureTraffic } from '../src/game/level-metrics'
import type { LaneDefinition } from '../src/game/state'

function lanesWith(firstRow: LaneDefinition): LaneDefinition[] {
  return [
    firstRow,
    { row: 2, direction: 'left', moveEveryTicks: 1, vehicleLength: 1, vehicleStarts: [0] },
    { row: 3, direction: 'right', moveEveryTicks: 1, vehicleLength: 1, vehicleStarts: [0] },
    { row: 4, direction: 'left', moveEveryTicks: 1, vehicleLength: 1, vehicleStarts: [0] },
    { row: 5, direction: 'right', moveEveryTicks: 1, vehicleLength: 1, vehicleStarts: [0] },
  ]
}

describe('generated level measurements', () => {
  it('measures one vehicle with the full circular empty gap', () => {
    const result = measureTraffic(lanesWith({
      row: 1, direction: 'right', moveEveryTicks: 1, vehicleLength: 1, vehicleStarts: [4],
    }))

    expect(result).toMatchObject({ tightestGap: 8, averageGap: 8, trafficDensity: 5 / 45 })
  })

  it('measures adjacent cars as a zero empty gap and wraps the last gap', () => {
    const result = measureTraffic(lanesWith({
      row: 1, direction: 'right', moveEveryTicks: 1, vehicleLength: 2, vehicleStarts: [2, 0],
    }))

    expect(result.tightestGap).toBe(0)
    expect(result.averageGap).toBe(37 / 6)
    expect(result.trafficDensity).toBe(8 / 45)
  })

  it('weights average gap by vehicle count across lanes', () => {
    const result = measureTraffic([
      { row: 1, direction: 'right', moveEveryTicks: 1, vehicleLength: 1, vehicleStarts: [4] },
      { row: 2, direction: 'left', moveEveryTicks: 1, vehicleLength: 1, vehicleStarts: [0, 4] },
      { row: 3, direction: 'right', moveEveryTicks: 1, vehicleLength: 1, vehicleStarts: [0] },
      { row: 4, direction: 'left', moveEveryTicks: 1, vehicleLength: 1, vehicleStarts: [0] },
      { row: 5, direction: 'right', moveEveryTicks: 1, vehicleLength: 1, vehicleStarts: [0] },
    ])

    expect(result.averageGap).toBe(6.5)
    expect(result.tightestGap).toBe(3)
    expect(result.trafficDensity).toBe(6 / 45)
  })

  it.each([
    [6, 1], [8, 1], [9, 2], [10, 2], [11, 3], [12, 3], [13, 4], [14, 4], [15, 5], [40, 5],
  ])('maps first-crossing minimum %i to rating %i', (moves, rating) => {
    expect(ratingForFirstCrossingMoves(moves)).toBe(rating)
  })

  it('rejects a below-minimum measurement instead of assigning a rating', () => {
    expect(ratingForFirstCrossingMoves(5)).toBeNull()
  })
})
