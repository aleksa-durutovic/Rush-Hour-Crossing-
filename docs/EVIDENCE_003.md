# Evidence — Session 003

This document has two parts:

1. **Current state.** The only evidence that describes the project as it is now. Every result was produced on 2026-09-23 from the code at commit `d42607f`. Later commits change documentation and evidence files only.
2. **Development history.** The process record the assignment requires: F0, baseline, controlled change, and later corrections. Numbers in that part were true on their own date and are superseded by part 1.

---

# Part 1 — Current state (verified 2026-09-23, code at `d42607f`)

## Environment

- Node.js `v24.14.0`, npm `11.12.1` (pinned by `.nvmrc` and `package.json` `engines`)
- Vite `8.3.0`, TypeScript `7.0.2`, Vitest `5.0.1`
- Windows 11, Google Chrome (headless, driven through the DevTools protocol) and the Claude desktop in-app browser

## Automated checks

All commands were run in sequence from a clean `npm ci`, with no dev server running.

| Command | Exit | Actual result |
|---|---:|---|
| `npm ci` | 0 | Installed from `package-lock.json`; `found 0 vulnerabilities` |
| `npm run typecheck` | 0 | `tsc --noEmit` completed without diagnostics |
| `npm run test:run` | 0 | 7 test files, 46 tests passed |
| `npm run build` | 0 | Vite 8.3.0, 14 modules transformed, production build completed |
| `npm audit --audit-level=high` | 0 | 0 vulnerabilities (info 0, low 0, moderate 0, high 0, critical 0) across 83 dependencies |

## Browser checks

Method: a Vite dev server served the current `main`, and a scripted headless Chrome session loaded each URL in a fresh page, sent real key events, and read the page state. The viewport was 1280×1000 at device scale 1 with `prefers-reduced-motion: reduce`, unless a row says otherwise. Game state was read from the Canvas accessible description, which `src/main.ts` rebuilds after every turn.

| Check | Input | Observed result | Screenshot |
|---|---|---|---|
| Startup | `/` | No console errors or warnings; one `main` landmark; backdrop image loaded | — |
| Active board, desktop | `/` | 3 lives, 0/3 crossings, score 0, tick 0, `active`; title, HUD, 9×7 board, five directed lanes, player, and keyboard controls visible | [`active-desktop.png`](evidence/active-desktop.png) |
| Wait | `/`, Space | Tick 0 → 1, status `active` | — |
| Out-of-grid move | `/`, S at the start row | Tick 0 → 1, 3 lives, status `active` (the position is covered by eval E2) | — |
| Narrow viewport | `/` at 320×800 | `scrollWidth` 320 = `clientWidth` 320 (no horizontal overflow); board 286 px wide; controls fit within 320 px | [`active-narrow-320.png`](evidence/active-narrow-320.png) |
| Keyboard focus | In-app browser: blur, then Tab | Tab focuses the Canvas; `:focus-visible` matches; outline `4px solid #ffc83d`, offset 6 px | [`keyboard-focus.png`](evidence/keyboard-focus.png) (headless capture with `focus({ focusVisible: true })`, which applies the same CSS rule) |
| Valid configuration | `?lives=2&crossingsToWin=3&difficulty=hard` | 2 lives, 0/3, no alert | — |
| Invalid configuration (D5) | `?lives=0&crossingsToWin=11&difficulty=insane` | Alert: `Invalid configuration: lives, crossingsToWin, difficulty. All defaults are active.`; state uses defaults (3 lives, 0/3, tick 0, `active`) | [`d5-invalid-config.png`](evidence/d5-invalid-config.png) |
| Win (D6) | `?crossingsToWin=1&difficulty=easy`, `W ×6` | `won`, 3 lives, 1/1, score 100, tick 6; overlay `CITY CROSSED!` + `PRESS R TO RESTART` | [`d6-win.png`](evidence/d6-win.png) |
| Loss (D6) | same URL, `W W D W W W` | `lost`, 0 lives, 0/1, score 0, tick 6; overlay `GAME OVER` + `PRESS R TO RESTART` | [`d6-loss.png`](evidence/d6-loss.png) |
| Input after loss (R7) | after the loss, W | State unchanged: `lost`, 0 lives, tick 6 | — |
| Restart (R7) | after the loss, R | 3 lives, 0/1, score 0, tick 0, `active` | — |
| Reduced motion | `/`, Space, reduce | `.board-frame` has no `turn-flash` class; transition 0 s; filter and transform `none` | — |
| Motion allowed | `/`, Space, no-preference | `turn-flash` applied: 0.18 s transition, `brightness(1.13)`, 2 px lift; turn state is identical | — |
| E4 wrap case | `/`, Space ×2 (normal preset, tick 2) | Row-4 vehicle wrapping across columns 8 and 0 is drawn as two edge segments with one windshield in total | [`e4-wrap-normal-tick2.png`](evidence/e4-wrap-normal-tick2.png) |

The operating-system reduced-motion setting was not toggled. The media feature was emulated through the DevTools protocol, which is what the CSS query reads.

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

## Evals

E1–E4 were repeated against the current code and passed. The results are in [`EVALS.md`](EVALS.md) under **Current result**.

## Definition of Done

D1–D8 in `docs/GAME_SPEC.md` link to the rows above and to the tests that prove them.

## Visual asset

- File: `public/assets/voxel-night-city-backdrop.png`, PNG 1672×941, 1,361,897 bytes, added in `ddcb519`.
- Origin: an original generated bitmap created for this project during the Voxel Night City redesign, under the pair-approved scope exception recorded in `AI_USAGE_LOG.md`. It is decorative only. If it does not load, the board, HUD, and controls stay on the solid `#07152d` background.
- The name of the generation tool was not recorded in the repository.

## Known limitations

- Visual acceptance uses scripted screenshots and manual review. There is no automated screenshot-comparison test.
- Keyboard-focus behaviour was verified in the in-app browser. The saved focus image was produced headlessly with `focus({ focusVisible: true })`.
- Contrast over the bitmap backdrop is measured against its base colour, not per pixel.

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

**Later correction:** That visual check missed that normal-preset row 4 had two permanently overlapping vehicles, which hid one windshield. This is fixed in `7c172e7` (see below).

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

Re-running every check against the current code found two more defects. Each was fixed as its own small change before this evidence was recorded:

- **Overlapping vehicles (`7c172e7`):** in the normal preset, row 4 (length 2, starts `[0, 4, 8]`) had the vehicle at 8 wrap into column 0 in all 200 checked ticks. It overlapped the vehicle at 0 and hid its windshield. A new test in `tests/presets.test.ts` requires that no two vehicles of a lane share a cell in any preset through tick 199. It failed for normal row 4 (`expected 5 to be 6`). The starts became `[0, 3, 6]`, which occupy 6 of 9 columns, so the lane is never blocked. E1 does not enter row 4 and is unaffected.
- **Startup console error and landmarks (`d42607f`):** every page load logged `404 /favicon.ico`, which contradicted D1. `index.html` now declares an empty icon. The `#app` root was a `<main>` that received a second `<main>`; it is now a `<div>`.

## Git preservation

| Point | Commit |
|---|---|
| Initial project | `11f731b` |
| Constitution | `434bd56` |
| Functional baseline, annotated tag `s003-baseline-v1` | `8091482` |
| E4 controlled change | `c154822` |
| Voxel Night City redesign | `ddcb519` |
| Code verified in Part 1 | `d42607f` |

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

### Demonstration

- **Demonstration lead:** Aleksa. He will explain scope and `GAME_SPEC.md`, baseline → hypothesis → controlled change, runtime configuration validation and evals, and the remaining limitations.
