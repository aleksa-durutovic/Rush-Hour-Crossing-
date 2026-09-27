# Evidence — Session 003

This document has two parts:

1. **Current state.** The only evidence that describes the project as it is now. Every result was produced on 2026-09-26 from the code at commit `2c1b3b1`. Later commits change documentation and evidence files only.
2. **Development history.** The process record the assignment requires: F0, baseline, controlled change, and later corrections. Numbers in that part were true on their own date and are superseded by part 1.

Feature 004 (difficulty selector, code at `18abd71`) was added after the Part 1 verification. Its own checks are in Part 2 → *Difficulty selector*; the Part 1 screenshots intentionally still show the board without the buttons.

---

# Part 1 — Current state (verified 2026-09-26, code at `2c1b3b1`)

## Environment

- Node.js `24.14.0`, npm `11.12.1` (pinned by `.nvmrc` and `package.json` `engines`)
- Vite `8.3.0`, TypeScript `7.0.2`, Vitest `5.0.1`, Playwright `1.63.0` with its bundled Chromium
- Windows 11

## Automated checks

All commands were run in sequence from a clean `npm ci` on `2c1b3b1`, with no dev server running.

| Command | Exit | Actual result |
|---|---:|---|
| `npm ci` | 0 | Installed from `package-lock.json`; `found 0 vulnerabilities` |
| `npm run typecheck` | 0 | `tsc --noEmit` completed without diagnostics |
| `npm run test:run` | 0 | 7 test files, 57 tests passed |
| `npm run build` | 0 | Vite 8.3.0, 14 modules transformed, production build completed |
| `npm audit --audit-level=high` | 0 | 0 vulnerabilities (info 0, low 0, moderate 0, high 0, critical 0) across 86 dependencies |
| `npm run test:e2e` | 0 | 10 passed (Chromium, 1 worker) |

## Browser checks

Method: `npm run test:e2e` (`e2e/smoke.pw.ts`) builds the game, serves the production build with `vite preview` on port 4173, and drives Playwright's Chromium with real key events. Viewport 1280×1000, device scale 1, `prefers-reduced-motion: reduce`. Game state is read from the Canvas accessible description, which `src/main.ts` rebuilds after every turn. Screenshots come from `npm run evidence:screenshots` (`e2e/evidence.pw.ts`) on the same code; each capture first asserts the state shown in the table.

| Check | Input | Observed result | Test / Screenshot |
|---|---|---|---|
| Startup (D1) | `/` | No console errors, warnings, or page errors; one `main` landmark; Canvas focused; no config alert; 3 lives, 0/3 crossings, score 0, tick 0, `active` | smoke 1; [`active-desktop.png`](evidence/active-desktop.png) |
| Keyboard focus | `/`, click the title, Tab | Canvas focused; `:focus-visible` matches | smoke 2; [`keyboard-focus.png`](evidence/keyboard-focus.png) |
| Wait (R2) | `/`, Space | Tick 0 → 1, status `active` | smoke 3 |
| Invalid configuration (D5) | `?lives=0&crossingsToWin=11&difficulty=insane` | Alert `Invalid configuration: lives, crossingsToWin, difficulty. All defaults are active.`; 3 lives, 0/3, tick 0, `active` | smoke 4; [`d5-invalid-config.png`](evidence/d5-invalid-config.png) |
| Win, lock, restart — easy (D6, R7) | `?crossingsToWin=1&difficulty=easy`, `W ×6`, then ↑ Space ←, then R | `won`, 3 lives, 1/1, score 100, tick 6; extra keys change nothing; R → 3 lives, 0/1, tick 0, `active` | smoke 5; [`d6-win.png`](evidence/d6-win.png) |
| Win, lock, restart — normal | `difficulty=normal`, ↑ → ↑ → ← ↑ ↑ Space Space ↑ ↑ | `won`, 3 lives, tick 11; lock and restart as above | smoke 7; [`d6-win-normal.png`](evidence/d6-win-normal.png) |
| Win, lock, restart — hard | `difficulty=hard`, ↑ ↓ Space Space Space ← ↑ ↑ ↑ ↑ ← ← ← ↑ ↑ | `won`, 3 lives, tick 15; lock and restart as above | smoke 9; [`d6-win-hard.png`](evidence/d6-win-hard.png) |
| Loss, lock, restart — easy | `difficulty=easy`, `W W D W W W`, then ↑ Space →, then R | `lost`, 0 lives, 0/1, tick 6; extra keys change nothing; R → tick 0, `active` | smoke 6; [`d6-loss.png`](evidence/d6-loss.png) |
| Loss, lock, restart — normal | `difficulty=normal`, `W ×6` | `lost`, 0 lives, tick 6; lock and restart as above | smoke 8 |
| Loss, lock, restart — hard | `difficulty=hard`, `W ×4` | `lost`, 0 lives, tick 4; lock and restart as above | smoke 10 |
| Narrow viewport | `/` at 320×800 | `scrollWidth − clientWidth = 0` (no horizontal overflow) | evidence script; [`active-narrow-320.png`](evidence/active-narrow-320.png) |
| E4 wrap case | `/`, Space ×4 (normal preset, tick 4) | Tick 4; the row-2 vehicle crossing columns 8 and 0 is drawn as two edge segments with one windshield; row 4 shows two separate vehicles | evidence script; [`e4-wrap-normal-tick4.png`](evidence/e4-wrap-normal-tick4.png) |

"Smoke N" is the N-th test in the order Playwright lists them (see `specs/003-review-fixes/contracts/browser-smoke.md`). Each screenshot was reviewed by the student (2026-09-26).

## Contrast

Ratios were computed with the WCAG 2 formula from the colours in `src/style.css` and `src/render/canvas.ts`.

| Pair | Ratio |
|---|---:|
| Body/title text `#f5f7ff` on page base `#07152d` | 17.01:1 |
| Title accent `#ffc83d` on `#07152d` | 11.77:1 |
| Brief `#d8e6ff` on `#07152d` | 14.45:1 |
| Eyebrow `#57d3e5` on `#07152d` | 10.27:1 |
| Controls `#e4efff` on `#07152d` | 15.67:1 |
| Invalid-config alert `#fff4f3` on `#3a1625` | 14.75:1 |
| Canvas HUD `#f5f7ff` on `#0d2345` | 14.61:1 |
| Canvas tick line `#57d3e5` on `#0d2345` | 8.82:1 |
| Focus outline `#ffc83d` against frame `#0d2345` (non-text) | 10.11:1 |
| End overlay: win title `#ffc83d`, lowest to highest across all board colours under the overlay | 7.23–10.29:1 |
| End overlay: loss title `#ff6b63` (42 px bold, large text) | 4.01–5.71:1 |
| End overlay: restart hint `#f5f7ff` | 10.45–14.87:1 |

Page text sits over the decorative backdrop and its darkening gradient. Those ratios use the base background `#07152d`, not every pixel of the bitmap.

`src/style.css`, `src/render/`, and `src/main.ts` are unchanged between `26ae68b` and `2c1b3b1` (`git diff` is empty), so these ratios still apply.

## Evals

E1–E4 were repeated against `2c1b3b1` and all pass, with no exception. The results are in [`EVALS.md`](EVALS.md) under **Current result**.

## Definition of Done

D1–D8 in `docs/GAME_SPEC.md` link to the rows above and to the tests that prove them. D4 and D6 were extended after the third review: D4 now includes the no-overlap invariant, and D6 covers all three presets.

## Visual asset

- File: `public/assets/voxel-night-city-backdrop.png`, PNG 1672×941, 1,361,897 bytes, added in `ddcb519`.
- Origin: an original bitmap generated with OpenAI Codex for this project during the Voxel Night City redesign, under the pair-approved scope exception recorded in `AI_USAGE_LOG.md`. It is decorative only. If it does not load, the board, HUD, and controls stay on the solid `#07152d` background.

## Known limitations

- Visual acceptance of the screenshots is a manual review by the student. There is no automated screenshot-comparison test.
- The browser smoke test runs locally in Playwright's Chromium only. There is no CI and no other browser.
- The reduced-motion and motion-allowed checks of the turn flash were last measured on 2026-09-23 (`26ae68b`) and were not repeated. The code they depend on (`src/style.css`, `src/main.ts`) has not changed since.
- Contrast over the bitmap backdrop is measured against its base colour, not per pixel.
- The recorded golden paths and shortest safe wins (6 / 11 / 15) are tied to the current rules and presets. Any preset change must re-measure them; see `specs/003-review-fixes/contracts/preset-invariants.md`.
- The hard preset is proven winnable by search, not play-tested for how hard it feels.

---

# Part 2 — Development history

The values in this part describe the project on their own date and are superseded by Part 1.

## F0 — starter status (2026-09-22)

The approved minimal stack is Vite with vanilla TypeScript, Canvas 2D, Vitest, npm, and explicit runtime validation without a validation library. No gameplay code existed before this starter setup.

Environment: Node.js `v24.14.0`, npm `11.12.1`, Vitest `5.0.1`.

| Command | Exit | Actual result |
|---|---:|---|
| `npm run test:run` | 0 | One starter test file and one test passed |
| `npm run typecheck` | 1 | TypeScript TS2882: missing declarations for the side-effect import `./style.css` |
| `npm run build` | 1 | Stopped at the same TS2882 error before Vite build |
| `npm audit --audit-level=high` | 1 | Audit endpoint/cache access failed in the sandbox; no vulnerability result was claimed |

The first visible problem was a starter configuration omission: Vite client declarations were not loaded. The only correction was to add the Vite client type declaration to `tsconfig.json`. The same commands were then repeated:

| Command | Exit | Actual result |
|---|---:|---|
| `npm run typecheck` | 0 | TypeScript completed without diagnostics |
| `npm run test:run` | 0 | One starter test file and one test passed |
| `npm run build` | 0 | Vite 8.3.0 built five modules successfully |
| `npm audit --audit-level=high` | 0 | Zero vulnerabilities reported |

## Functional baseline (2026-09-22, `8091482`, tag `s003-baseline-v1`)

The first complete implementation was produced from the reviewed constitution, specification, plan, tasks, and E1–E3 expectations. No Session 004 capability or network service was added.

| Command | Exit | Result at that time |
|---|---:|---|
| `npm run typecheck` | 0 | No diagnostics |
| `npm run test:run` | 0 | 6 test files, 40 tests passed |
| `npm run build` | 0 | 13 modules transformed |
| `npm audit --audit-level=high` | 0 | Zero vulnerabilities reported |

Browser checks at that time, recorded from the Canvas accessible description:

- The 9×7 board, five directed lanes, player, HUD, and keyboard controls rendered.
- Space advanced the tick without moving the player.
- The combined invalid query showed all three invalid field names and used the default configuration.
- With `crossingsToWin=1&difficulty=easy`, six up moves reached `won` at tick 6, and `up, up, right, up, up, up` reached `lost` at tick 6.
- A move after the loss changed nothing. R restored the initial state.

Screenshots from that run were not saved. On 2026-09-23 the baseline board was re-captured from tag `s003-baseline-v1` in a separate worktree, with the same method as Part 1: [`baseline-active-normal.png`](evidence/baseline-active-normal.png). It shows the light baseline theme and the E4 problem below. That run also logged the favicon 404 that was later fixed in `d42607f`.

E1–E3 passed on the baseline with their expectations unchanged. After the tag was created, the vehicle-length presentation problem below was selected as E4.

## Controlled change — E4 vehicle length (2026-09-22, `c154822`)

**Claim:** Baseline traffic logic correctly occupies multiple cells, but the Canvas presentation does not make configured vehicle length visually legible.

**Signal:** In the baseline normal preset, every occupied cell is drawn as a separate rounded rectangle with its own windshield, so one length-two vehicle looks like two cars ([`baseline-active-normal.png`](evidence/baseline-active-normal.png), rows 2 and 4).

**Hypothesis:** Rendering occupied cells independently discards the identity and configured length of each vehicle.

**Smallest change:** Game state, traffic timing, presets, config, input, and eval criteria stay unchanged. Only the traffic rendering path changes, so each configured vehicle is drawn as one contiguous body with one windshield while wrap-boundary segments stay correct.

**Check:** Repeat unchanged E1–E4, all automated checks, and visual inspection of normal-preset length-two vehicles.

**Result at that time:** Supported. Length-two vehicles became contiguous bodies with one windshield, E1–E3 stayed green, and 6 files / 40 tests passed.

**Later correction:** That visual check missed that normal-preset row 4 had two permanently overlapping vehicles, which hid one windshield. It is still open (Part 1, Known limitations).

**Limitation:** The check assesses the legibility of fixed geometric vehicles, not animation, sprites, or visual effects.

## Voxel Night City redesign (2026-09-23, `ddcb519`)

The pair approved original generated bitmap decoration and discrete non-essential motion as a visual-only scope exception, recorded in `AI_USAGE_LOG.md` and specified in `specs/002-voxel-night-city/`. At that time typecheck, 6 files / 40 tests, and build passed. `npm audit` returned no result because the npm advisory endpoint failed, so no clean audit was claimed. Its current visual acceptance is covered by Part 1.

## Corrections after the first review (2026-09-23)

- **Delivery:** `main` still pointed to `434bd56`, so the reviewer saw only the starter. The feature work was fast-forwarded into `main`, and D1–D8 were ticked with evidence references (`de1ae5e`).
- **Restart hint contrast (`6ecab87`):** the redesign made `COLORS.surface` dark, which left `PRESS R TO RESTART` at 1.00–1.40:1 on the end overlay. It now uses `#f5f7ff`. Screenshots for D5/D6 were first saved in this commit.
- **Runtime pin (`327eefe`):** `.nvmrc` and `engines` for Node 24 / npm 11.

## Corrections after the second review (2026-09-23)

| Review item | Commit | Change and check |
|---|---|---|
| Loss overlay said `RUSH HOUR WINS` | `2fa8f25` | Test written first; it failed because the module did not exist. Overlay text now comes from the Canvas-free `getEndStateMessage(status)`: `won` → `CITY CROSSED!`, `lost` → `GAME OVER`, `active` → none. |
| README said Node 22.12 | `73482f5` | README requires Node 24+ / npm 11+ and uses `npm ci`. |
| `002` spec marked Draft | `ddbf546` | `001` Accepted — core game; `002` Accepted — visual addendum. |
| Audit results out of date | `3dd2de1` | Audit re-run; historical and current results separated in `security.md`. |
| No root instruction file | `fb3de4e` | `AGENTS.md` added. |

## Consistency pass (2026-09-23)

Re-running every check against the current code found two more defects:

- **Overlapping vehicles — attempted fix reverted (`7c172e7`, reverted in `26ae68b`):** in the normal preset, row 4 (length 2, starts `[0, 4, 8]`) had the vehicle at 8 wrap into column 0 in all 200 checked ticks, hiding one windshield. A test requiring that no two vehicles of a lane share a cell failed for normal row 4, and the starts were changed to `[0, 3, 6]`. The check covered only the non-blocking invariant, not passability. Three vehicles of length 2 leave one-cell gaps, and an exhaustive search later showed that no winning path existed for `normal`. The student noticed the denser lane in play. The change and its test were reverted, which restores the winnable `[0, 4, 8]` and the overlap limitation.
- **Startup console error and landmarks (`d42607f`):** every page load logged `404 /favicon.ico`, which contradicted D1. `index.html` now declares an empty icon. The `#app` root was a `<main>` that received a second `<main>`; it is now a `<div>`.

## Corrections after the third review (2026-09-26)

The plan, measured alternatives, and exact tasks are in `specs/003-review-fixes/`. Each correction is one commit on branch `003-review-fixes`.

### Normal row 4 overlap (`7ae37c5`)

- **Claim:** Normal row 4 can be made overlap-free without making the normal preset harder to win.
- **Signal:** In every tick 0–199, the vehicle starting at 8 wrapped into column 0 and shared that cell with the vehicle starting at 0 (E4 FAIL for this row).
- **Hypothesis:** Removing only the overlapping vehicle (starts `[0, 4, 8]` → `[0, 4]`) removes the overlap and keeps a two-cell or wider gap, so collision check B does not block the lane.
- **Smallest change:** One line in `src/config/presets.ts`. Direction, speed, and length unchanged.
- **Check:** New tests first: no-overlap for all presets, reachability and recorded paths for easy and normal. Before the change: `Tests  2 failed | 50 passed (52)` (normal overlap and the new normal winning path). After: 52/52.
- **Result:** Supported. No overlap in any lane; the shortest safe normal win is still 11 actions.
- **Limitation:** Row 4 now has two vehicles instead of three visible bodies; its occupied cells per tick drop from five to four.

### Hard preset unwinnable (`6e5edbb`)

- **Claim:** Hard can be made winnable while staying the hardest preset.
- **Signal:** An exhaustive search found no winning path; rows 1, 2, 4, 5 move every tick with one-cell gaps, so collision check B always hits.
- **Hypothesis:** Removing one vehicle from each of those four rows creates gaps that a player can use; row 3 (every two ticks) can stay.
- **Smallest change:** Four lines in `src/config/presets.ts`: `[0, 6]`, `[1, 7]`, `[5, 8]`, `[1, 7]`. A search over all one-vehicle removals showed that every winnable variant needs all four removals; this variant has the longest shortest win.
- **Check:** Reachability and recorded-path tests extended to hard, plus an order test (easy < normal < hard). Before the change: `Tests  3 failed | 54 passed (57)`. After: 57/57.
- **Result:** Supported. Shortest safe wins are 6 / 11 / 15 actions.
- **Limitation:** Difficulty is measured by the shortest path length, not by play-testing.

### Automated browser smoke test (`2c1b3b1`)

- **Claim:** Startup, focus, configuration fallback, and win/loss lock with restart can be verified automatically in a real browser.
- **Signal:** These checks were scripted by hand for each review and were not repeatable by the reviewer.
- **Change:** Playwright dev dependency; `npm run test:e2e` with 10 scenarios that replay the same golden paths as the unit tests; `npm run evidence:screenshots` regenerates the images in this document.
- **Result:** 10/10 pass on `2c1b3b1`.
- **Limitation:** Chromium only, local only.

## Difficulty selector (2026-09-27, `18abd71`)

- **Claim:** The player can switch between easy, normal, and hard on the game screen with the mouse, without editing the URL.
- **Signal:** Difficulty could only be chosen with `?difficulty=` in the URL.
- **Change:** `EASY` / `NORMAL` / `HARD` buttons over the Canvas HUD next to `TICK` (`src/main.ts`, `src/style.css`); HUD line shows only `TICK n` (`src/render/canvas.ts`); pure helper `buildDifficultySearch` (`src/config/difficulty-query.ts`). A switch restarts the game on the chosen preset and updates the URL with `history.replaceState`. Plan: `specs/004-difficulty-switch/implementation-plan.md`.
- **Tests first:** the new unit file failed before the helper existed; the 6 new browser tests failed (6 failed, 10 passed) before the buttons existed.
- **Result:** typecheck, 8 files / 69 tests, build, audit (0 vulnerabilities), and `npm run test:e2e` 16 passed on `18abd71`. Screenshot [`difficulty-switch.png`](evidence/difficulty-switch.png). Student visual check: i did the check and everything works fine, you can continue.
- **Limitation:** The button position is set in CSS percentages that match the current HUD geometry (576 × 520 Canvas, HUD line at y = 54). A change of `CELL_SIZE`, `HUD_HEIGHT`, or the HUD text must re-check the position. While a button has keyboard focus, game keys are ignored until focus returns to the board.

## Git preservation

| Point | Commit |
|---|---|
| Initial project | `11f731b` |
| Constitution | `434bd56` |
| Functional baseline, annotated tag `s003-baseline-v1` | `8091482` |
| E4 controlled change | `c154822` |
| Voxel Night City redesign | `ddcb519` |
| Revert of the preset change | `26ae68b` |
| Code verified on 2026-09-23 | `26ae68b` |
| Normal row 4 fix | `7ae37c5` |
| Hard preset fix | `6e5edbb` |
| Browser smoke test; code verified in Part 1 | `2c1b3b1` |
| Difficulty selector (feature 004) | `18abd71` |

## Partner contributions

### Block 1 — Specification and baseline (F1–F7, 15–19 September 2026)

- **Driver: Igor** — wrote prompts and code; specified `GAME_SPEC.md` rules R1–R7, ran the Spec Kit specification/plan/task workflow, and implemented the test-first baseline (`turn.ts`, `traffic.ts`, and presets).
- **Observer: Aleksa** — recorded E1–E3 expectations before implementation, reviewed each diff against R1–R7 and the `GAME_SPEC.md` boundaries, and guarded against scope expansion.

### Role switch — after baseline (F7 → F8, 19 September 2026)

### Block 2 — Eval and controlled change (F8–F10, 19–22 September 2026)

- **Driver: Aleksa** — implemented the E4 Canvas correction that groups vehicle cells into one vehicle body and ran typecheck, tests, build, audit, and E1–E4.
- **Observer: Igor** — wrote and reviewed the Claim/Signal/Hypothesis/Smallest change/Check record, verified that the diff was limited to the render path, and confirmed that E1–E3 did not change.

### After the reviews (23 September 2026)

- **Aleksa** — decided on and approved each post-review correction listed above, carried out with an AI coding assistant, as recorded in `AI_USAGE_LOG.md`.

### After the third review (2026-09-26)

- **Aleksa** — reviewed the third review, chose the fixes (normal row 4 `[0, 4]`, a winnable hard preset, Playwright), reviewed the Spec Kit plan in `specs/003-review-fixes/` before implementation, and confirmed the regenerated screenshots. The implementation followed that plan with OpenAI Codex (GPT-6), as recorded in `AI_USAGE_LOG.md`.

### Demonstration

- **Demonstration lead:** Aleksa. He will explain scope and `GAME_SPEC.md`, baseline → hypothesis → controlled change, runtime configuration validation and evals, and the remaining limitations.
