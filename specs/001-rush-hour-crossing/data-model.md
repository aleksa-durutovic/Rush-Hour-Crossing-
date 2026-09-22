# Data Model: Rush Hour Crossing Core Game

## GameConfig

Validated session configuration.

| Field | Type | Constraint | Default |
|---|---|---|---|
| lives | integer | 1 through 5 | 3 |
| crossingsToWin | integer | 1 through 10 | 3 |
| difficulty | enum | easy, normal, or hard | normal |

Validation is atomic: one invalid present supported field rejects all supplied values and activates every default. Missing fields receive only their own defaults when no present field is invalid.

## ConfigResolution

| Field | Meaning |
|---|---|
| config | The validated supplied configuration or complete default configuration |
| invalidFields | Unique supported field names that failed parsing or validation |
| usedFallback | True only when at least one present supported field was invalid |

## Position

An integer grid coordinate with column `x` from 0 through 8 and row `y` from 0 through 6.

## GameState

| Field | Constraint |
|---|---|
| tick | Integer beginning at 0; increases once per accepted gameplay action |
| player | Valid Position; resets to (4, 6) after collision or crossing |
| lives | Integer from 0 through configured starting lives; never negative |
| crossings | Non-negative integer that never decreases |
| score | Crossings multiplied by 100 |
| status | active, won, or lost |

State transitions are initialization, gameplay action, and restart. Gameplay input is ignored when status is won or lost. Restart returns every state field to its configured initial value.

## PlayerAction

One of move up, move down, move left, move right, or wait. Restart is handled as a session reset request because it does not advance traffic.

## LaneDefinition

| Field | Constraint |
|---|---|
| row | Unique traffic row from 1 through 5 |
| direction | left or right |
| moveEveryTicks | Positive integer; movement is never more than one cell per movement tick |
| vehicleLength | Positive integer smaller than grid width |
| vehicleStarts | Fixed list of starting columns |

Occupied cells are derived, not stored in GameState. Vehicle bodies wrap horizontally and a preset is invalid if any lane occupies all nine columns during ticks 0 through 199.

## DifficultyPreset

A fixed set of exactly five LaneDefinitions, one for each traffic row. The easy, normal, and hard presets differ only in density and movement interval.
