import { GRID_COLUMNS } from './constants'
import type { LaneDefinition, Position } from './state'

export function getOccupiedCells(lane: LaneDefinition, tick: number): Set<number> {
  const occupied = new Set<number>()

  for (const initialColumn of lane.vehicleStarts) {
    for (const column of getVehicleCells(lane, tick, initialColumn)) {
      occupied.add(column)
    }
  }

  return occupied
}

export function getVehicleCells(
  lane: LaneDefinition,
  tick: number,
  initialColumn: number,
): number[] {
  const movementSteps = Math.floor(tick / lane.moveEveryTicks)
  const direction = lane.direction === 'right' ? 1 : -1
  const vehicleStart = modulo(initialColumn + direction * movementSteps, GRID_COLUMNS)

  return Array.from({ length: lane.vehicleLength }, (_value, offset) =>
    modulo(vehicleStart + offset, GRID_COLUMNS),
  )
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
