# Evidence — Session 003

## Initial claim

The approved minimal stack is Vite with vanilla TypeScript, Canvas 2D, Vitest, npm, and explicit runtime validation without a validation library. No gameplay code existed before this starter setup.

## F0 — starter status

Environment observed on 2026-09-22:

- Node.js: `v24.14.0`
- npm: `11.12.1`
- Vitest installed by the lockfile: `5.0.1`

Initial commands and actual results:

| Command | Exit | Actual result |
|---|---:|---|
| `npm run test:run` | 0 | One starter test file and one test passed |
| `npm run typecheck` | 1 | TypeScript TS2882: missing declarations for the side-effect import `./style.css` |
| `npm run build` | 1 | Stopped at the same TS2882 error before Vite build |
| `npm audit --audit-level=high` | 1 | Audit endpoint/cache access failed in the sandbox; no vulnerability result was claimed |

The first visible problem is a starter TypeScript configuration omission: Vite client declarations were not loaded. The allowed correction is limited to adding the Vite client type declaration to `tsconfig.json`, after which the same commands must be repeated. Gameplay implementation remains paused until the repeated F0 checks are green.

### F0 repeated after the minimal correction

| Command | Exit | Actual result |
|---|---:|---|
| `npm run typecheck` | 0 | TypeScript completed without diagnostics |
| `npm run test:run` | 0 | One starter test file and one test passed |
| `npm run build` | 0 | Vite 8.3.0 built five modules successfully |
| `npm audit --audit-level=high` | 0 | Zero vulnerabilities reported |

F0 is green. The project may proceed to constitution and specification work.

## Functional baseline

The first complete implementation was produced from the reviewed constitution, specification, plan, tasks, and E1–E3 expectations. No Session 004 capability or network service was added.

### Automated commands

| Command | Exit | Actual result |
|---|---:|---|
| `npm run typecheck` | 0 | TypeScript completed without diagnostics |
| `npm run test:run` | 0 | Six test files and 40 tests passed |
| `npm run build` | 0 | Vite 8.3.0 transformed 13 modules and completed the production build |
| `npm audit --audit-level=high` | 0 | Zero vulnerabilities reported |
| `npm run dev -- --host 127.0.0.1` | running for QA | Vite 8.3.0 reported ready at `http://127.0.0.1:5173/` in 516 ms |

### Browser evidence

- Initial game board rendered the 9-by-7 grid, five directed traffic lanes, player, lives, crossings, score, tick, difficulty, and keyboard controls.
- The Canvas received visible keyboard focus and its accessible description reflected current lives, crossings, score, tick, and status.
- Space advanced tick from 0 to 1 without moving the player.
- W advanced one turn; the browser automation's `Up` key alias produced two injected events and was not treated as product evidence. Unit coverage verifies one non-repeated `ArrowUp` keydown maps to one action.
- Combined invalid query `?lives=0&crossingsToWin=11&difficulty=insane` displayed all three invalid field names and used the complete default configuration.
- With `crossingsToWin=1&difficulty=easy`, `up, up, up, up, up, up` reached `won` at tick 6 with one crossing and score 100.
- With the same preset, `up, up, right, up, up, up` reached `lost` at tick 6 with zero lives.
- An additional move after loss left the state unchanged; R restored three lives, zero crossings, zero score, tick 0, and active status.

Browser screenshots of the initial board and win overlay were captured in the Codex QA run. The accessible state text above is retained here so the evidence remains reviewable without the temporary browser tab.

### Accessibility and visual checks

- The UI uses no animation or timer.
- The focused Canvas has a visible 5 px outline.
- Relevant measured contrast ratios were 12.97:1 for primary text/background, 5.63:1 for secondary text/background, 9.42:1 for error text/background, and 6.79:1 for focus/surface.
- The layout was visually inspected in the in-app browser; a dedicated automated accessibility audit was not added because it would require new tooling outside the approved stack.

### Baseline eval status

E1, E2, and E3 passed with their original expectations unchanged. Full results are in `docs/EVALS.md`. After tag `s003-baseline-v1` was created, the reproducible vehicle-length presentation problem below was selected as E4.

## Controlled change hypothesis

**Claim:** Baseline traffic logic correctly occupies multiple cells, but the Canvas presentation does not make configured vehicle length visually legible.

**Signal:** In the baseline normal-preset screenshot, every occupied cell is drawn as an inset rounded rectangle with its own windshield. Adjacent cells belonging to one length-two vehicle look like separate cars.

**Hypothesis:** Rendering occupied cells independently discards the identity and configured length of each vehicle.

**Smallest change:** Keep game state, traffic timing, presets, config, input, and eval criteria unchanged. Change only the traffic rendering path so each configured vehicle is drawn as one contiguous body with one windshield, while preserving correct wrap-boundary segments.

**Check:** Repeat unchanged E1–E4, all automated checks, and visual inspection of normal-preset length-two vehicles.

**Result:** Supported. The post-change renderer displayed contiguous length-two bodies with one windshield while unchanged E1–E3 and the full automated suite remained green.

**Limitation:** The check assesses legibility of fixed geometric vehicles, not animation, sprites, or visual effects, which remain out of scope.

### Controlled change result

The renderer now groups each configured vehicle's cells into contiguous visible segments and places a single windshield on its directional front. Traffic calculation, turn rules, configuration, presets, input mapping, and eval expectations were unchanged.

Post-change results:

| Check | Result |
|---|---|
| E1 deterministic play | PASS — unchanged 100-run normal-preset test |
| E2 boundary turn | PASS — unchanged boundary test |
| E3 invalid configuration | PASS — unchanged automated suite and repeated browser fallback |
| E4 vehicle length legibility | PASS — contiguous length-two bodies with one windshield verified in browser |
| `npm run typecheck` | PASS |
| `npm run test:run` | PASS — six files, 40 tests |
| `npm run build` | PASS — 13 modules transformed |
| `npm audit --audit-level=high` | PASS — zero vulnerabilities |

The hypothesis was supported: preserving per-vehicle identity in the render path fixed the visible-length problem without changing game state or rule outcomes.

## Git preservation

- Initial project checkpoint: `11f731b`
- Constitution checkpoint: `434bd56`
- Functional baseline: `8091482`
- Immutable annotated baseline tag: `s003-baseline-v1`

## Partner contributions

### Block 1 — Specification and baseline (F1–F7, 15–19 September 2026)

- **Driver: Igor** — wrote prompts and code; specified `GAME_SPEC.md` rules R1–R7, ran the Spec Kit specification/plan/task workflow, and implemented the test-first baseline (`turn.ts`, `traffic.ts`, and presets).
- **Observer: Aleksa** — recorded E1–E3 expectations before implementation, reviewed each diff against R1–R7 and the `GAME_SPEC.md` boundaries, and guarded against scope expansion.

### Role switch — after baseline (F7 → F8, 19 September 2026)

### Block 2 — Eval and controlled change (F8–F10, 19–22 September 2026)

- **Driver: Aleksa** — implemented the E4 Canvas correction that groups vehicle cells into one vehicle body and ran typecheck, tests, build, audit, and E1–E4.
- **Observer: Igor** — wrote and reviewed the Claim/Signal/Hypothesis/Smallest change/Check record, verified that the diff was limited to the render path, and confirmed that E1–E3 did not change.

### Demonstration and known limitations

- **Demonstration lead**: Aleksa. He will explain scope and `GAME_SPEC.md`, baseline → hypothesis → controlled change, runtime configuration validation and evals, and remaining limitations.
- Visual motion is deliberately limited so the game remains turn-based.
- Visual review is manual; no automated screenshot-test suite was added.

## Voxel Night City redesign — in progress

The pair approved the original optional bitmap decoration and discrete non-essential motion as a visual-only scope exception; the decision is recorded in `AI_USAGE_LOG.md`. On 2026-09-23 the active desktop screen was checked in the browser: the Voxel Night City backdrop, title, HUD, board, traffic, player, and keyboard controls were visible; the accessible Canvas description reported the live game state. `npm run typecheck`, `npm run test:run` (40/40), and `npm run build` passed after the redesign. Narrow viewport, reduced-motion, invalid-configuration, and end-state redesign checks remain pending and must not be claimed as complete yet. The audit endpoint did not return a vulnerability result during the redesign validation.

### Final runtime checks — 2026-09-23

- At a 320×800 browser viewport, the full board and keyboard controls were visible with no horizontal page overflow.
- The invalid URL `?lives=0&crossingsToWin=11&difficulty=insane` displayed all three invalid field names and retained the default active game state.
- With `crossingsToWin=1&difficulty=easy`, six `W` actions produced `won`, one crossing, score 100, and tick 6.
- With the same configuration, `W, W, D, W, W, W` produced `lost`, zero lives, and tick 6.
- The CSS contains a `prefers-reduced-motion: reduce` branch that removes the non-essential visual transition and turn flash. This was source-inspected; an operating-system reduced-motion toggle was not available in this QA run.
- Measured color contrasts: primary text/background 17.01:1, secondary/focus treatment on surface 8.82:1, and accent/background 11.77:1.
- Repeated automated checks: typecheck PASS; Vitest PASS (6 files, 40 tests); production build PASS. `npm audit --audit-level=high` did not return a result because the npm advisory endpoint failed; no clean audit result is claimed.

## Saved screenshots and restart-hint fix — 2026-09-23

After the Session 003 review, the pair's GitHub `main` branch was fast-forwarded to the feature work (it had remained at the constitution commit), and D5/D6 screenshots were captured and saved in the repository. Screenshots were taken with headless Chrome at 1280×1000, with reduced motion enabled so that the turn flash does not affect the image.

**Problem found while capturing:** on the win and loss overlays, the `PRESS R TO RESTART` hint was practically invisible. The Voxel Night City redesign changed `COLORS.surface` to dark `#0d2345`, but the overlay hint still used it. Measured contrast against the overlay was 1.00–1.40:1. `GAME_SPEC.md` requires the win/loss message to include the restart hint. The earlier browser checks read state from the Canvas accessible description and did not catch this visual regression.

**Change:** only `src/render/canvas.ts` changed. The hint now uses the existing light `COLORS.playerDetail` (`#f5f7ff`). Measured contrast against the overlay is now 10.45–14.87:1 (across every lane and vehicle colour under the overlay). Game state, rules, configuration, and evals are unchanged.

| Check | Result |
|---|---|
| `npm run typecheck` | PASS |
| `npm run test:run` | PASS — six files, 40 tests |
| `npm run build` | PASS |

| Screenshot | Query and actions | Observed state |
|---|---|---|
| [`evidence/d5-invalid-config.png`](evidence/d5-invalid-config.png) | `?lives=0&crossingsToWin=11&difficulty=insane` | Alert names `lives, crossingsToWin, difficulty`; defaults active (3 lives, 0/3, tick 0) |
| [`evidence/d6-win.png`](evidence/d6-win.png) | `?crossingsToWin=1&difficulty=easy`, `W ×6` | `won`, 3 lives, 1/1, score 100, tick 6; restart hint visible |
| [`evidence/d6-loss.png`](evidence/d6-loss.png) | `?crossingsToWin=1&difficulty=easy`, `W W D W W W` | `lost`, 0 lives, 0/1, tick 6; restart hint visible |

The console showed no errors at startup.
