import type { Difficulty, LaneDefinition } from '../game/state'

export const DIFFICULTY_PRESETS: Readonly<Record<Difficulty, readonly LaneDefinition[]>> = {
  easy: [
    lane(1, 'right', 2, 1, [0, 4]),
    lane(2, 'left', 3, 2, [1, 6]),
    lane(3, 'right', 2, 1, [2, 6]),
    lane(4, 'left', 3, 2, [0, 5]),
    lane(5, 'right', 2, 1, [1, 5]),
  ],
  normal: [
    lane(1, 'right', 1, 1, [0, 3, 6]),
    lane(2, 'left', 2, 2, [1, 6]),
    lane(3, 'right', 1, 1, [1, 4, 7]),
    lane(4, 'left', 2, 2, [0, 3, 6]),
    lane(5, 'right', 1, 1, [2, 5, 8]),
  ],
  hard: [
    lane(1, 'right', 1, 2, [0, 3, 6]),
    lane(2, 'left', 1, 2, [1, 4, 7]),
    lane(3, 'right', 2, 2, [0, 3, 6]),
    lane(4, 'left', 1, 2, [2, 5, 8]),
    lane(5, 'right', 1, 2, [1, 4, 7]),
  ],
}

function lane(
  row: number,
  direction: LaneDefinition['direction'],
  moveEveryTicks: number,
  vehicleLength: number,
  vehicleStarts: readonly number[],
): LaneDefinition {
  return { row, direction, moveEveryTicks, vehicleLength, vehicleStarts }
}
