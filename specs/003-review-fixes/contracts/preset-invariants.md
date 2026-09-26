# Contract: Preset Invariants

Applies to every entry of `DIFFICULTY_PRESETS` in `src/config/presets.ts`. A future preset change that breaks any row below MUST be rejected by the unit tests.

| ID | Invariant | Checked by | Test name (exact) |
|---|---|---|---|
| PI-1 | Five lanes, rows `[1, 2, 3, 4, 5]` in order | `tests/presets.test.ts` | `%s has five unique, never-blocked traffic lanes through tick 199` |
| PI-2 | Every lane has at least one free cell in every tick 0–199 | `tests/presets.test.ts` | same as PI-1 |
| PI-3 | No two vehicles of one lane share a cell in any tick 0–199 | `tests/presets.test.ts` | `%s never places two vehicles of one lane on the same cell through tick 199` |
| PI-4 | A win without losing a life exists, and its length equals `SHORTEST_SAFE_WIN[preset]` | `tests/reachability.test.ts` | `%s can be won without losing a life` |
| PI-5 | A loss is reachable | `tests/reachability.test.ts` | `%s can be lost through player actions` |
| PI-6 | Shortest safe win grows with difficulty: easy < normal < hard | `tests/reachability.test.ts` | `orders presets by the fewest actions needed for a safe win` |
| PI-7 | The recorded winning path wins with the recorded tick and lives | `tests/reachability.test.ts` | `the recorded winning path wins %s` |
| PI-8 | The recorded losing path loses with the recorded tick | `tests/reachability.test.ts` | `the recorded losing path loses %s` |

`%s` is replaced by `easy`, `normal`, `hard` through `it.each`.

## Required values

| Preset | `SHORTEST_SAFE_WIN` | Winning path final tick / lives | Losing path final tick |
|---|---:|---|---:|
| easy | 6 | 6 / 3 | 6 |
| normal | 11 | 11 / 3 | 6 |
| hard | 15 | 15 / 3 | 4 |

## If a future preset change breaks PI-4 or PI-6

Do not edit `SHORTEST_SAFE_WIN` to make the test pass. A changed shortest win means the difficulty changed; that is a gameplay decision for the student pair and must be recorded in `docs/AI_USAGE_LOG.md` first.
