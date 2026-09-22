import { GRID_COLUMNS } from './constants'
import type { LaneDefinition, Position } from './state'

export function getOccupiedCells(lane: LaneDefinition, tick: number): Set<number> {
  const occupied = new Set<number>()
  const movementSteps = Math.floor(tick / lane.moveEveryTicks)
  const direction = lane.direction === 'right' ? 1 : -1

  for (const initialColumn of lane.vehicleStarts) {
    const vehicleStart = modulo(initialColumn + direction * movementSteps, GRID_COLUMNS)

    for (let offset = 0; offset < lane.vehicleLength; offset += 1) {
      occupied.add(modulo(vehicleStart + offset, GRID_COLUMNS))
    }
  }

  return occupied
}

export function hasTrafficAt(
  position: Position,
  lanes: readonly LaneDefinition[],
  tick: number,
): boolean {
  const lane = lanes.find((candidate) => candidate.row === position.y)
  return lane ? getOccupiedCells(lane, tick).has(position.x) : false
}

function modulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor
}
