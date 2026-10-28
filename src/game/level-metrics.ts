import { GRID_COLUMNS, GRID_ROWS } from './constants'
import type { LaneDefinition } from './state'

export interface TrafficMetrics {
  tightestGap: number
  averageGap: number
  trafficDensity: number
}

export function measureTraffic(lanes: readonly LaneDefinition[]): TrafficMetrics {
  let vehicleCount = 0
  let occupiedCellCount = 0
  let gapTotal = 0
  let tightestGap = GRID_COLUMNS

  for (const lane of lanes) {
    const starts = [...lane.vehicleStarts].sort((left, right) => left - right)
    const count = starts.length
    if (count === 0) continue

    vehicleCount += count
    occupiedCellCount += count * lane.vehicleLength

    for (let index = 0; index < count; index += 1) {
      const start = starts[index]!
      const nextStart = index === count - 1 ? starts[0]! + GRID_COLUMNS : starts[index + 1]!
      const emptyCells = nextStart - start - lane.vehicleLength
      gapTotal += emptyCells
      tightestGap = Math.min(tightestGap, emptyCells)
    }
  }

  return {
    tightestGap: vehicleCount === 0 ? 0 : tightestGap,
    averageGap: vehicleCount === 0 ? 0 : gapTotal / vehicleCount,
    trafficDensity: occupiedCellCount / (GRID_COLUMNS * (GRID_ROWS - 2)),
  }
}
