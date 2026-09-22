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

**Result:** Pending controlled change.

**Limitation:** The check assesses legibility of fixed geometric vehicles, not animation, sprites, or visual effects, which remain out of scope.
