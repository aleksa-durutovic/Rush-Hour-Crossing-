# Mini Eval Set — Session 003

Expectations in E1–E3 were recorded on 2026-09-22 before gameplay implementation. Results must be appended without rewriting these expectations. **Current result** is the only result that describes the project now (2026-09-23, code at `d42607f`). Baseline and post-change results are the historical record.

## E1 — Typical deterministic play

**Input:** Use one validated normal configuration and the fixed sequence: up, wait, left, up, right, wait. Run the sequence from a fresh state 100 times.

**Expected before run:** All 100 runs produce exactly the same final state. Every accepted action, including waits, consumes one turn, so the final tick is 6 unless the game has already ended; this sequence is not allowed to depend on randomness or wall-clock time.

**Baseline result:** PASS. The Vitest determinism check replayed the sequence 100 times against the normal preset and all final states matched. The six accepted actions produced tick 6.

**Post-change result:** PASS. The unchanged 100-run determinism test passed against the normal preset and the final tick remained 6.

**Current result:** PASS. The unchanged 100-run determinism test in `tests/turn.test.ts` passes. The final state is tick 6, player `(5, 6)`, 1 life, 0 crossings, status `active`. The sequence only enters rows 5 and 6, so the row-4 preset correction in `7c172e7` does not affect this case.

## E2 — Grid boundary consumes a turn

**Input:** From the initial player position `(4, 6)`, attempt to move down beyond the grid.

**Expected before run:** The player remains at `(4, 6)`, tick changes from 0 to 1, traffic is evaluated at the new tick, lives remain unchanged because the start row has no vehicles, and the game remains active.

**Baseline result:** PASS. The boundary test kept the player at `(4, 6)`, advanced tick to 1, preserved three lives, and kept the game active.

**Post-change result:** PASS. The unchanged boundary test passed with position `(4, 6)`, tick 1, three lives, and active status.

**Current result:** PASS. The boundary test passes. In the browser, S at the start row advanced tick 0 → 1 with 3 lives and status `active`.

## E3 — Invalid configuration uses complete fallback

**Input:** Start with `?lives=0&crossingsToWin=11&difficulty=insane`.

**Expected before run:** The active configuration is exactly `lives=3`, `crossingsToWin=3`, and `difficulty=normal`; the invalid field list contains all three supported field names; the same names are visible to the player; the application remains playable. Separate automated tests also cover every invalid example mandated by `GAME_SPEC.md`.

**Baseline result:** PASS. Automated validation returned the complete default config and all three invalid field names. Browser verification displayed `Invalid configuration: lives, crossingsToWin, difficulty. All defaults are active.` and the game remained focused and playable.

**Post-change result:** PASS. The unchanged config suite passed and browser repetition displayed the same three invalid field names with complete fallback.

**Current result:** PASS. The config suite passes (valid example, all five required invalid examples, combined invalid query). The browser shows `Invalid configuration: lives, crossingsToWin, difficulty. All defaults are active.` with the default state ([`evidence/d5-invalid-config.png`](evidence/d5-invalid-config.png)).

## E4 — Baseline regression

**Input:** Render tick 0 of the normal preset and inspect a configured vehicle whose `vehicleLength` is 2, including one that crosses the horizontal board boundary.

**Baseline problem observed:** The renderer draws every occupied cell as a separate inset rectangle with its own windshield. A two-cell vehicle therefore appears as two independent one-cell cars rather than one longer vehicle.

**Expected before E4 run:** Each configured vehicle is visually one contiguous body spanning its configured number of cells with exactly one directional windshield. A vehicle crossing the wrap boundary may appear as two edge segments, but those segments must represent one vehicle and contain only one windshield in total.

**Baseline result:** FAIL. The initial normal-preset screenshot shows separated adjacent rectangles and a windshield per occupied cell for length-two vehicles.

**Post-change result:** PASS. Post-change browser inspection shows length-two vehicles as contiguous two-cell bodies with one directional windshield. The wrapped vehicle is split only by the physical board boundary and has one windshield across its two segments.

**Correction to the post-change result:** that inspection missed normal-preset row 4. Starts `[0, 4, 8]` with length 2 made the vehicle at 8 wrap into column 0 and overlap the vehicle at 0 in every tick, which hid one windshield. It is fixed in `7c172e7`, and a preset test now forbids overlapping vehicles.

**Current result:** PASS. At tick 0 of the normal preset every configured vehicle is one contiguous body with one directional windshield, including three separate length-two vehicles in row 4 ([`evidence/active-desktop.png`](evidence/active-desktop.png)). At tick 2 the row-4 vehicle crossing the board edge is drawn as two edge segments with one windshield in total ([`evidence/e4-wrap-normal-tick2.png`](evidence/e4-wrap-normal-tick2.png)). For comparison, the baseline failure is re-captured from the tag in [`evidence/baseline-active-normal.png`](evidence/baseline-active-normal.png).
