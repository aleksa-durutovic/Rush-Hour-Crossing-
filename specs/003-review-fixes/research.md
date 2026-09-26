# Research: Third-Review Corrections

All numbers below were measured on 2026-09-26 with a temporary exhaustive search script and a throwaway copy of the repository at `354295b`. The script was not committed; the committed tests in `tasks.md` reproduce every number that matters.

## R-1 Why normal row 4 overlaps

- Row 4: `left`, every 2 ticks, length 2, starts `[0, 4, 8]`.
- The vehicle starting at 8 covers cells 8 and 0 (wrap). The vehicle starting at 0 covers 0 and 1. Cell 0 is shared at tick 0, and because all vehicles in a lane move together, the overlap persists in every tick (200/200 checked).
- The renderer draws both vehicles; the second covers the first windshield. The cause is preset data, not the renderer (already recorded in `docs/EVALS.md` E4).

## R-2 Candidate fixes for normal row 4

Only `vehicleStarts` was varied (direction, speed, length kept). Every non-overlapping, non-blocking set with 2 or 3 vehicles was tested with a breadth-first search for the shortest win (1 life, `crossingsToWin=1`).

| Gaps between vehicles (cells) | Vehicles | Examples (starts → shortest win) | Verdict |
|---|---:|---|---|
| 1, 1, 1 | 3 | `[0,3,6]` → none, `[1,4,7]` → none, `[2,5,8]` → none | Unwinnable. This is the reverted `7c172e7`. |
| 0, 1, 2 | 3 | `[0,3,7]` → 11, `[0,2,5]` → 11, `[1,3,6]` → 13 | Winnable, but two vehicles touch (gap 0) and read as one four-cell body. |
| 0, 0, 3 | 3 | `[0,2,4]` → 11 | Two touching pairs; same visual problem. |
| 2, 3 | 2 | **`[0,4]` → 11**, `[0,5]` → 11, `[1,6]` → 8 | Winnable, every vehicle clearly separated. |
| 1, 4 | 2 | `[0,3]` → 11, `[0,6]` → 8 | Winnable, but uneven. |

**Decision (DEC-1)**: `[0, 4]`.
**Rationale**: It removes exactly the vehicle that causes the overlap, keeps the two original starts 0 and 4, keeps the shortest normal win at 11 actions (no difficulty drift), and leaves at least 2 empty cells between vehicles.
**Alternatives considered**: `[0, 3, 7]` keeps three vehicles but two touch; `[0, 3, 6]` is unwinnable.

## R-3 Why hard is unwinnable

- Rows 1, 2, 4, 5 move every tick and have three length-2 vehicles with one-cell gaps.
- A player who steps into a one-cell gap at tick `t` is hit at tick `t + 1` by the next vehicle (collision check B). No safe cell exists in those rows.
- Exhaustive search over (tick mod 18, x, y, lives) finds no winning state. Collision-free play never survives row 5.

## R-4 Candidate fixes for hard

Search space: for each lane, keep all three vehicles or drop exactly one (row 3 may also stay). 270 winnable combinations were found. Every winnable combination drops one vehicle from **all four** every-tick lanes; dropping fewer is never enough. Among those, the longest shortest-win (the hardest) is 15 actions.

**Decision (DEC-2)**: row 1 `[0, 6]`, row 2 `[1, 7]`, row 3 `[0, 3, 6]` (unchanged), row 4 `[5, 8]`, row 5 `[1, 7]`.
**Rationale**: Smallest possible change (one vehicle removed per blocking lane), hardest remaining variant (shortest safe win 15 > normal 11 > easy 6), 22 occupied cells at tick 0 versus 17 in normal, so hard stays visibly denser.
**Alternatives considered**: Declaring hard survival-only (rejected by the student); changing speeds or lengths (larger change, more to verify).

## R-5 Recorded golden paths (verified against the pure turn logic)

URL form: `?crossingsToWin=1&difficulty=<preset>`, lives default 3.

| Preset | Winning actions | Final | Losing actions | Final |
|---|---|---|---|---|
| easy | `up ×6` | won, tick 6, 3 lives | `up, up, right, up, up, up` | lost, tick 6, 0 lives |
| normal | `up, right, up, right, left, up, up, wait, wait, up, up` | won, tick 11, 3 lives | `up ×6` | lost, tick 6, 0 lives |
| hard | `up, down, wait, wait, wait, left, up, up, up, up, left, left, left, up, up` | won, tick 15, 3 lives | `up ×4` | lost, tick 4, 0 lives |

Test-first signal: on the current code, the new normal winning path ends `lost` at tick 4, and the hard winning path ends `lost` at tick 1. Both therefore fail before the preset change.

The normal path differs from the one the old preset allowed (`up, right, up, wait, wait, up, up, wait, wait, up, up`); both are 11 actions.

## R-6 Eval E1 is unaffected

E1 replays `up, wait, left, up, right, wait` on normal. It only enters rows 5 and 6. Final state before and after the fix: tick 6, player `(5, 6)`, 1 life, 0 crossings, `active`. Row 4 is never reached, so E1 cannot change.

## R-7 Browser test tool

**Decision (DEC-3)**: `@playwright/test` `^1.63.0` (latest on 2026-09-26), bundled Chromium.

Verified in a throwaway copy:

- `npm install --save-dev @playwright/test@^1.63.0` added 3 packages; `npm audit` reported 0 vulnerabilities.
- `npm run typecheck` passes with `e2e` and `playwright.config.ts` added to `tsconfig.json` `include`. No `@types/node` is needed because the config does not use `process`.
- Vitest still finds exactly 7 test files; the `*.pw.ts` suffix keeps Playwright files out of Vitest.
- All 10 smoke scenarios and all 9 evidence captures passed against `npm run build && npm run preview`.
- Keyboard focus: calling `canvas.blur()` and then pressing Tab moves focus **off** the page in Chromium (focus navigation continues after the canvas). Clicking the non-focusable `h1` and then pressing Tab reliably focuses the canvas and matches `:focus-visible`. The tests use the `h1` click.
- Board state is read from the canvas `aria-label`, which `src/main.ts` rewrites after every render: `Rush Hour Crossing. {lives} lives, {crossings} of {crossingsToWin} crossings, score {score}, tick {tick}, status {status}.`
- Playwright's own Chromium was not installed on the planning machine; the throwaway run used the locally installed Google Chrome through `channel: 'chrome'`. The committed config uses the bundled Chromium (no `channel`), which needs `npx playwright install chromium` once.

**Alternatives considered**: Vitest + jsdom (no real browser, Canvas context unavailable); manual checklist only (what the reviewer asked to replace).

## R-8 Expected unit test counts per commit

| After | Test files | Tests | Why |
|---|---:|---:|---|
| Today (`26ae68b` code) | 7 | 43 | — |
| US1 tests written, before preset fix | 7 | 52 (2 fail) | +3 non-overlap, reachability 2 → 8 |
| US1 preset fix | 7 | 52 (0 fail) | — |
| US2 tests written, before preset fix | 7 | 57 (3 fail) | reachability 8 → 13 |
| US2 preset fix | 7 | 57 (0 fail) | — |
