# Contract: Browser Smoke Test and Evidence Capture

## Commands

| Command | Runs | Writes files? |
|---|---|---|
| `npx playwright install chromium` | One-time browser download (per machine) | Browser cache outside the repo |
| `npm run test:e2e` | `playwright test e2e/smoke.pw.ts` | Only `test-results/` (git-ignored) |
| `npm run evidence:screenshots` | `playwright test e2e/evidence.pw.ts` | Overwrites PNGs in `docs/evidence/` |

Both Playwright commands build the game (`npm run build`) and serve it with `npm run preview -- --port 4173 --strictPort`. They fail if port 4173 is already in use; stop any other preview server first.

## Browser settings

Chromium (Playwright bundled), viewport 1280×1000, device scale factor 1, `prefers-reduced-motion: reduce`, one worker, no retries.

## Smoke scenarios (`e2e/smoke.pw.ts`, exactly 10 tests)

`label(...)` means the canvas `aria-label` equals `Rush Hour Crossing. {lives} lives, {crossings} of {ctw} crossings, score {score}, tick {tick}, status {status}.`

| # | Test title (exact) | URL | Steps | Expected |
|---|---|---|---|---|
| 1 | `starts without console problems and focuses the board` | `/` | load | no console `error`/`warning`, no page error; canvas focused; exactly 1 `main`; `#config-alert` hidden; label(3, 0, 3, 0, 0, active) |
| 2 | `Tab moves visible keyboard focus to the board` | `/` | click `h1`, press Tab | canvas focused and matches `:focus-visible` |
| 3 | `Space waits one turn` | `/` | Space | label(3, 0, 3, 0, 1, active) |
| 4 | `an invalid configuration names every invalid field and uses defaults` | `/?lives=0&crossingsToWin=11&difficulty=insane` | load | alert visible with text `Invalid configuration: lives, crossingsToWin, difficulty. All defaults are active.`; label(3, 0, 3, 0, 0, active) |
| 5, 7, 9 | `{preset}: a win locks input until R restarts` | `/?crossingsToWin=1&difficulty={preset}` | type `WINNING_PATHS[preset]`, then Up, Space, Left, then R | after path: label(finalLives, 1, 1, 100, finalTick, won); after extra keys: unchanged; after R: label(3, 0, 1, 0, 0, active) |
| 6, 8, 10 | `{preset}: a loss locks input until R restarts` | same | type `LOSING_PATHS[preset]`, then Up, Space, Right, then R | after path: label(0, 0, 1, 0, finalTick, lost); after extra keys: unchanged; after R: label(3, 0, 1, 0, 0, active) |

Order: Playwright lists the tests as 1–4, then easy win (5), easy loss (6), normal win (7), normal loss (8), hard win (9), hard loss (10).

Key mapping used by the tests: up → `ArrowUp`, down → `ArrowDown`, left → `ArrowLeft`, right → `ArrowRight`, wait → `Space`, restart → `r`.

## Evidence captures (`e2e/evidence.pw.ts`, exactly 9 tests)

All are full-page PNG screenshots in `docs/evidence/`.

| File | URL and steps | Asserted before capture |
|---|---|---|
| `active-desktop.png` | `/` | label(3, 0, 3, 0, 0, active) |
| `active-narrow-320.png` | `/` at 320×800 | `scrollWidth - clientWidth === 0` |
| `keyboard-focus.png` | `/`, click `h1`, Tab | canvas focused |
| `d5-invalid-config.png` | `/?lives=0&crossingsToWin=11&difficulty=insane` | alert visible |
| `e4-wrap-normal-tick4.png` | `/`, Space ×4 | label(3, 0, 3, 0, 4, active) |
| `d6-win.png` | easy winning path | label(3, 1, 1, 100, 6, won) |
| `d6-win-normal.png` (new) | normal winning path | label(3, 1, 1, 100, 11, won) |
| `d6-win-hard.png` (new) | hard winning path | label(3, 1, 1, 100, 15, won) |
| `d6-loss.png` | easy losing path | label(0, 0, 1, 0, 6, lost) |

`docs/evidence/baseline-active-normal.png` is historical and is **not** captured by this script. Never delete or overwrite it.
