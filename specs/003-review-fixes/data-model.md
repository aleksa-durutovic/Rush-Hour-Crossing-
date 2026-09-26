# Data Model: Third-Review Corrections

No type in `src/` changes. This feature changes preset **values** and adds one **test fixture** type.

## LaneDefinition (existing, `src/game/state.ts` — unchanged)

| Field | Type | Rule |
|---|---|---|
| `row` | number | 1..5, unique per preset |
| `direction` | `'left' \| 'right'` | unchanged in this feature |
| `moveEveryTicks` | number | unchanged in this feature |
| `vehicleLength` | number | unchanged in this feature |
| `vehicleStarts` | readonly number[] | **the only field whose values change** |

### New invariants on every preset (tested in `tests/presets.test.ts` and `tests/reachability.test.ts`)

1. **Never blocked** (existing): for ticks 0–199, occupied cells per lane < 9.
2. **No overlap** (new): for ticks 0–199, the list of cells produced by `getVehicleCells(lane, tick, start)` for every `start` in `vehicleStarts` has no duplicates.
3. **Winnable** (new for all presets): from `createInitialState({ lives: 1, crossingsToWin: 1, difficulty })`, a breadth-first search over the five actions reaches `status: 'won'` within 80 actions.
4. **Losable** (existing for easy, now all presets): from `lives: 3`, the search reaches `status: 'lost'`.

## Preset values: before → after

Format: `lane(row, direction, moveEveryTicks, vehicleLength, vehicleStarts)` as in `src/config/presets.ts`.

### easy — unchanged

### normal

| Row | Before | After |
|---|---|---|
| 1 | `lane(1, 'right', 1, 1, [0, 3, 6])` | unchanged |
| 2 | `lane(2, 'left', 2, 2, [1, 6])` | unchanged |
| 3 | `lane(3, 'right', 1, 1, [1, 4, 7])` | unchanged |
| 4 | `lane(4, 'left', 2, 2, [0, 4, 8])` | **`lane(4, 'left', 2, 2, [0, 4])`** |
| 5 | `lane(5, 'right', 1, 1, [2, 5, 8])` | unchanged |

### hard

| Row | Before | After |
|---|---|---|
| 1 | `lane(1, 'right', 1, 2, [0, 3, 6])` | **`lane(1, 'right', 1, 2, [0, 6])`** |
| 2 | `lane(2, 'left', 1, 2, [1, 4, 7])` | **`lane(2, 'left', 1, 2, [1, 7])`** |
| 3 | `lane(3, 'right', 2, 2, [0, 3, 6])` | unchanged |
| 4 | `lane(4, 'left', 1, 2, [2, 5, 8])` | **`lane(4, 'left', 1, 2, [5, 8])`** |
| 5 | `lane(5, 'right', 1, 2, [1, 4, 7])` | **`lane(5, 'right', 1, 2, [1, 7])`** |

## GoldenPath (new, `tests/fixtures/golden-paths.ts`)

| Field | Type | Meaning |
|---|---|---|
| `actions` | `readonly PlayerAction[]` | Actions typed from a fresh game at `?crossingsToWin=1&difficulty=<preset>` (lives 3) |
| `finalTick` | number | Tick after the last action |
| `finalLives` | number | Lives after the last action |

Exports:

- `WINNING_PATHS: Record<Difficulty, GoldenPath>` — final status `won`, crossings 1, score 100.
- `LOSING_PATHS: Record<Difficulty, GoldenPath>` — final status `lost`, crossings 0, lives 0.
- `SHORTEST_SAFE_WIN: Record<Difficulty, number>` — `{ easy: 6, normal: 11, hard: 15 }`.

During US1 only, the fixture is typed with `CoveredDifficulty = 'easy' | 'normal'`; US2 widens it to `Difficulty` and adds `hard`. Values are listed in `research.md` R-5.

## Board state as seen by the browser test

The browser cannot read game state directly. It reads the canvas `aria-label`:

```
Rush Hour Crossing. {lives} lives, {crossings} of {crossingsToWin} crossings, score {score}, tick {tick}, status {status}.
```

This string comes from `src/main.ts` `render()` and MUST NOT be changed by this feature.
