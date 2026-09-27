# Implementation Plan: 004 Difficulty Selector (EASY / NORMAL / HARD buttons)

This file is the whole feature package for a coding agent: specification, plan, tasks, exact code, expected results, and the prompts to paste into Codex. It is written so the agent **copies, not designs**.

- Written: 2026-09-27 by Claude Code (Opus 5.5), from a read of the code at `497f035` (`main`).
- Implemented by: OpenAI Codex (Luna 6), one prompt per session (see §P at the end).
- Verification status of this plan: the helper logic (§C1) and the three golden paths were executed in the running game on 2026-09-27; the button layout was measured in the browser at 1280 px and 320 px. **The full code was not run end to end** (the student chose "plan only"). Therefore every "Expected" block is a strict prediction. If real output differs, the agent must stop and report, never improvise a fix.

Conventions:

- `§X` = a section of this file.
- "Replace the whole content" means delete everything in the file and paste the block exactly, with a final newline.
- "Replace exactly" means: find the `Old` text (it occurs once), replace it with the `New` text, change nothing else.
- `{{NAME}}` is a placeholder the agent fills with a real value it saw in command output.
- Commands work in PowerShell and in Git Bash.

---

## §S Specification

### Problem

The player can change the difficulty only by editing the URL (`?difficulty=hard`). The student wants to switch difficulty with the mouse on the game screen.

### Decisions made by the student (2026-09-27)

| ID | Decision |
|---|---|
| DEC-1 | Three buttons: `EASY`, `NORMAL`, `HARD` (one per existing preset). |
| DEC-2 | Clicking a different difficulty immediately starts a new game on that preset (same as `R`: tick 0, lives from config, 0 crossings, 0 score). Clicking the already-active difficulty does nothing. |
| DEC-3 | Real HTML `<button>` elements placed over the Canvas HUD, on the same line as the `TICK` counter, to its right. |
| DEC-4 | The choice is written into the URL with `history.replaceState` (no reload), so a reload keeps it. Other URL parameters stay. |
| DEC-5 | Keep all existing screenshots in `docs/evidence/` unchanged; add one new screenshot `docs/evidence/difficulty-switch.png`. |

### Functional requirements

- **FR-1** The HUD shows three buttons `EASY`, `NORMAL`, `HARD`, in this order, on the second HUD line, right of `TICK n`.
- **FR-2** Exactly the active difficulty's button has `aria-pressed="true"`; the other two have `aria-pressed="false"`. The active button is visually filled (cyan background, dark text).
- **FR-3** Clicking a non-active button: `config.difficulty` becomes the chosen value, the lanes become that preset, the state is a fresh game (`restartGame`), the board re-renders, keyboard focus returns to the Canvas.
- **FR-4** Clicking the active button changes no game state; focus returns to the Canvas.
- **FR-5** After a switch the URL query has `difficulty=<chosen>`; all other parameters keep their order and values. If the page had used the fallback configuration, `lives` and `crossingsToWin` are removed from the URL and the red config alert is hidden, so the URL matches the configuration being played.
- **FR-6** Keyboard: the buttons are reachable with Tab after the Canvas. While a button has focus, Enter or Space activates the button and is **not** treated as a game move. (Measured 2026-09-27: without this guard, Space on a focused button plays a `wait` turn and never activates the button.)
- **FR-7** The Canvas HUD second line shows only `TICK n` (the old `  ·  NORMAL TRAFFIC` text is removed because the pressed button now shows the difficulty).
- **FR-8** Switching also works after a win or loss (it starts a new game, like `R`).

### Not changed

Rules R1–R6, `src/game/**`, `src/input/keyboard.ts`, `src/config/presets.ts`, `resolveGameConfig` behaviour, golden paths, all existing tests, all existing screenshots.

### Constitution check

| Principle | Result |
|---|---|
| I Locked scope | Difficulty already exists (R6). A mouse control for choosing it is a settings control, not a gameplay move. `GAME_SPEC.md` says "Samo tastatura" and R7 says only `R` works after the game ends, so both lines are amended in §C4 with the student's decision logged in `AI_USAGE_LOG.md`. Not in the OUT OF SCOPE list (that list names touch/mobile controls for play). |
| II Pure turn logic | `src/game/` untouched. The switch only calls the existing `restartGame`. |
| III Determinism | No randomness or timers. Same config + actions → same states. |
| IV Runtime validation | `data-difficulty` from the DOM is checked against `DIFFICULTIES` before use; the new URL is re-validated by `resolveGameConfig` on reload (unit test in §C1). |
| V Config outside logic | Difficulty list lives in `src/config/game-config.ts`. |
| VI Tests first | §C1 and §C2 each start with failing tests. |
| VII Smallest change | One helper, one wiring change, one HUD text change, CSS, tests, docs. |
| VIII Traceable | One commit per step, Conventional Commits, evidence and AI log updated. |
| Technical constraints ("Gameplay itself remains keyboard-only") | Clarified in §C4 as a PATCH amendment (1.1.0 → 1.1.1): moves stay keyboard-only; the difficulty selector may also use a mouse. |

---

## §PL Plan (files)

| File | Change | Step |
|---|---|---|
| `tests/difficulty-query.test.ts` | new, 12 unit tests | C1 |
| `src/config/difficulty-query.ts` | new, pure helper `buildDifficultySearch` | C1 |
| `src/config/game-config.ts` | `DIFFICULTIES` becomes exported (1 word) | C1 |
| `e2e/smoke.pw.ts` | 6 new browser tests appended | C2 |
| `src/main.ts` | whole file replaced: buttons, click handler, keyboard guard, `aria-pressed`, URL update | C2 |
| `src/render/canvas.ts` | HUD line 2 shows only `TICK n` (1 line) | C2 |
| `src/style.css` | 2 new lines of CSS | C2 |
| `e2e/evidence.pw.ts` | 1 new screenshot test | C3 |
| `docs/evidence/difficulty-switch.png` | new screenshot | C3 |
| `docs/GAME_SPEC.md`, `.specify/memory/constitution.md`, `AGENTS.md`, `README.md`, `docs/EVIDENCE_003.md`, `docs/AI_USAGE_LOG.md` | documentation | C4 |

Commits, in order, on branch `004-difficulty-switch`:

| Commit | Message |
|---|---|
| C0 | `docs(spec): add 004 difficulty selector plan` |
| C1 | `feat(config): add difficulty query helper` |
| C2 | `feat(ui): add difficulty buttons next to the tick counter` |
| C3 | `test(e2e): add difficulty selector evidence screenshot` |
| C4 | `docs: record the difficulty selector` |

### Layout facts (measured 2026-09-27, used by the CSS in §C2)

- Canvas is 576 × 520 internal px (`9 × 64` wide, `7 × 64 + 72` high). HUD line 2 text baseline-middle is at y = 54; `TICK 9999` ends at x ≈ 79.
- `left: 19.1%` puts the buttons at canvas x ≈ 110; `top: 10.4%` + `translateY(-50%)` centres them on y ≈ 54.
- At 1280 × 1000: button group 164 × 21 px, inside the HUD. At 320 px wide: group 115 × 16 px, bottom edge 35 px below the canvas top while the HUD ends at 37 px; no horizontal scroll.

---

## §T Tasks and hard rules

### Hard rules (apply to every task)

1. Work only on branch `004-difficulty-switch`. Never `checkout main`, `merge`, `rebase`, `push`, `tag`, `commit --amend`, `reset`, or `stash`. Never touch tag `s003-baseline-v1`.
2. Copy code blocks exactly. Do not reformat, rename, reorder, add comments, or "improve".
3. Stage files only by explicit path (`git add <path> <path>`). Never `git add -A` / `git add .`. Never stage `docs/WEEK_03_REPORT_ALEKSA_DURUTOVIC.md`.
4. Never write a number, SHA, or result you did not see in real command output.
5. If any output differs from the Expected text, stop immediately, paste the actual output, and report. Do not try a second fix.
6. Do not edit any file not listed in the step you are executing.
7. Do not run `npm install <package>`; no new dependencies.

### Task list

| ID | Step | Task |
|---|---|---|
| T001 | §C0 | Check start state, create branch, commit this plan (C0) |
| T002 | §C0 | Run the baseline checks |
| T003 | §C1 | Add the unit test file; see it fail |
| T004 | §C1 | Add the helper and the export; see tests pass; commit C1 |
| T005 | §C2 | Add the 6 browser tests; see exactly 6 fail |
| T006 | §C2 | Replace `main.ts`, edit `canvas.ts` and `style.css`; see all pass; commit C2 |
| T007 | §C3 | Add the screenshot test, capture the image, student checks it; commit C3 |
| T008 | §C4 | Update the six documents; commit C4 |
| T009 | §C5 | Final check and report |

---

## §C0 Start (T001, T002)

T001:

```bash
git branch --show-current
git status --short
git log --oneline -1
```

Expected:

```text
main
?? docs/WEEK_03_REPORT_ALEKSA_DURUTOVIC.md
?? specs/004-difficulty-switch/
497f035 docs: record final review commit SHA
```

If the SHA is not `497f035` or other files are modified, stop and report.

```bash
git switch -c 004-difficulty-switch
git add specs/004-difficulty-switch/implementation-plan.md
git commit -m "docs(spec): add 004 difficulty selector plan" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git branch --show-current
```

Expected last line: `004-difficulty-switch`. From now on you are never on `main`.

T002 (Node 24+, npm 11+):

```bash
node -v
npm -v
npm ci
npm run typecheck
npm run test:run
npm run build
```

Expected: every command exits 0. `npm run test:run` ends with:

```text
 Test Files  7 passed (7)
      Tests  57 passed (57)
```

(Measured on `main` 2026-09-27.) If Playwright's Chromium is not installed yet, run `npx playwright install chromium` once, then:

```bash
npm run test:e2e
```

Expected: `10 passed`.

---

## §C1 Difficulty query helper (T003, T004)

### T003 — failing unit tests first

Create `tests/difficulty-query.test.ts` with exactly this content:

```ts
import { describe, expect, it } from 'vitest'
import { buildDifficultySearch } from '../src/config/difficulty-query'
import { DIFFICULTIES, resolveGameConfig } from '../src/config/game-config'
import { DIFFICULTY_PRESETS } from '../src/config/presets'
import type { Difficulty } from '../src/game/state'

const VALID_QUERY_CASES: [string, Difficulty, string][] = [
  ['', 'hard', '?difficulty=hard'],
  ['?difficulty=easy', 'normal', '?difficulty=normal'],
  ['?lives=2&crossingsToWin=5&difficulty=easy', 'hard', '?lives=2&crossingsToWin=5&difficulty=hard'],
  ['?difficulty=hard&lives=2', 'normal', '?difficulty=normal&lives=2'],
  ['?foo=bar', 'easy', '?foo=bar&difficulty=easy'],
]

const FALLBACK_QUERY_CASES: [string, Difficulty, string][] = [
  ['?lives=0&crossingsToWin=11&difficulty=insane', 'hard', '?difficulty=hard'],
  ['?lives=2&difficulty=insane', 'easy', '?difficulty=easy'],
  ['?lives=0&crossingsToWin=4&foo=bar', 'normal', '?foo=bar&difficulty=normal'],
]

describe('difficulty selector query', () => {
  it('offers every preset in easy, normal, hard order', () => {
    expect(DIFFICULTIES).toEqual(['easy', 'normal', 'hard'])
    expect(Object.keys(DIFFICULTY_PRESETS)).toEqual([...DIFFICULTIES])
  })

  it.each(VALID_QUERY_CASES)('keeps the valid query "%s" and selects %s', (search, difficulty, expected) => {
    expect(buildDifficultySearch(search, difficulty, false)).toBe(expected)
  })

  it.each(FALLBACK_QUERY_CASES)('drops rejected values from the fallback query "%s" and selects %s', (search, difficulty, expected) => {
    expect(buildDifficultySearch(search, difficulty, true)).toBe(expected)
  })

  it.each(DIFFICULTIES)('a reload of the new query plays %s without a fallback', (difficulty) => {
    const search = buildDifficultySearch('?lives=2&crossingsToWin=4', difficulty, false)

    expect(resolveGameConfig(new URLSearchParams(search))).toEqual({
      config: { lives: 2, crossingsToWin: 4, difficulty },
      invalidFields: [],
      usedFallback: false,
    })
  })
})
```

Run:

```bash
npm run test:run
```

Expected: exit code is **not** 0. The output names `tests/difficulty-query.test.ts` as failed because the module `../src/config/difficulty-query` cannot be found/resolved. The 7 old files still pass. The summary is expected to be:

```text
 Test Files  1 failed | 7 passed (8)
      Tests  57 passed (57)
```

If the old 57 tests do not all pass, stop. Do not commit yet.

### T004 — make them pass

1. Create `src/config/difficulty-query.ts` with exactly this content:

```ts
import type { Difficulty } from '../game/state'

/**
 * Returns the query string for the current URL with `difficulty` selected.
 * After a configuration fallback the rejected `lives` and `crossingsToWin`
 * values are removed, so a reload plays the configuration that is on screen.
 */
export function buildDifficultySearch(
  search: string,
  difficulty: Difficulty,
  usedFallback: boolean,
): string {
  const params = new URLSearchParams(search)

  if (usedFallback) {
    params.delete('lives')
    params.delete('crossingsToWin')
  }

  params.set('difficulty', difficulty)
  return `?${params.toString()}`
}
```

2. In `src/config/game-config.ts`, replace exactly:

Old:

```ts
const DIFFICULTIES: readonly Difficulty[] = ['easy', 'normal', 'hard']
```

New:

```ts
export const DIFFICULTIES: readonly Difficulty[] = ['easy', 'normal', 'hard']
```

3. Run:

```bash
npm run typecheck
npm run test:run
npm run build
```

Expected: all exit 0; the test summary is:

```text
 Test Files  8 passed (8)
      Tests  69 passed (69)
```

(57 old + 12 new: 1 order test, 5 valid-query cases, 3 fallback cases, 3 reload cases.)

4. Commit C1:

```bash
git add tests/difficulty-query.test.ts src/config/difficulty-query.ts src/config/game-config.ts
git commit -m "feat(config): add difficulty query helper" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git show --stat HEAD
```

Expected: exactly those 3 files in the commit.

---

## §C2 Buttons in the HUD (T005, T006)

### T005 — failing browser tests first

In `e2e/smoke.pw.ts` make two edits.

Edit 1 — replace exactly:

Old:

```ts
import { expect, test } from '@playwright/test'
import type { Difficulty } from '../src/game/state'
```

New:

```ts
import { expect, test, type Page } from '@playwright/test'
import type { Difficulty } from '../src/game/state'
```

Edit 2 — append this block at the very end of the file (after the last `})` of `test.describe('browser smoke', ...)`), leaving one empty line before it:

```ts
async function expectPressed(page: Page, active: Difficulty): Promise<void> {
  for (const difficulty of difficulties) {
    await expect(page.locator(`[data-difficulty="${difficulty}"]`)).toHaveAttribute(
      'aria-pressed',
      String(difficulty === active),
    )
  }
}

function currentSearch(page: Page): string {
  return new URL(page.url()).search
}

test.describe('difficulty selector', () => {
  test('marks the active difficulty as pressed', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('#difficulty-switch button')).toHaveText(['EASY', 'NORMAL', 'HARD'])
    await expectPressed(page, 'normal')

    await page.goto('/?difficulty=hard')
    await expectPressed(page, 'hard')
  })

  test('a click on another difficulty restarts on that preset and updates the URL', async ({ page }) => {
    await page.goto('/?crossingsToWin=1')
    await page.keyboard.press('Space')
    await page.keyboard.press('Space')
    await expectBoard(page, {
      lives: 3,
      crossings: 0,
      crossingsToWin: 1,
      score: 0,
      tick: 2,
      status: 'active',
    })

    await page.locator('[data-difficulty="hard"]').click()

    await expectBoard(page, {
      lives: 3,
      crossings: 0,
      crossingsToWin: 1,
      score: 0,
      tick: 0,
      status: 'active',
    })
    await expectPressed(page, 'hard')
    await expect(page.locator('#game-canvas')).toBeFocused()
    expect(currentSearch(page)).toBe('?crossingsToWin=1&difficulty=hard')

    const golden = WINNING_PATHS.hard
    await playActions(page, golden.actions)
    await expectBoard(page, {
      lives: golden.finalLives,
      crossings: 1,
      crossingsToWin: 1,
      score: 100,
      tick: golden.finalTick,
      status: 'won',
    })
  })

  test('a click on the active difficulty keeps the current game', async ({ page }) => {
    await page.goto('/')
    await page.keyboard.press('Space')

    await page.locator('[data-difficulty="normal"]').click()

    await expectBoard(page, {
      lives: 3,
      crossings: 0,
      crossingsToWin: 3,
      score: 0,
      tick: 1,
      status: 'active',
    })
    await expectPressed(page, 'normal')
    await expect(page.locator('#game-canvas')).toBeFocused()
    expect(currentSearch(page)).toBe('')
  })

  test('a reload keeps the chosen difficulty', async ({ page }) => {
    await page.goto('/')
    await page.locator('[data-difficulty="easy"]').click()
    await expectPressed(page, 'easy')

    await page.reload()

    await expectPressed(page, 'easy')
    expect(currentSearch(page)).toBe('?difficulty=easy')
    await playActions(page, WINNING_PATHS.easy.actions)
    await expectBoard(page, {
      lives: 3,
      crossings: 1,
      crossingsToWin: 3,
      score: 100,
      tick: 6,
      status: 'active',
    })
  })

  test('choosing a difficulty after an invalid configuration clears the alert', async ({ page }) => {
    await page.goto('/?lives=0&crossingsToWin=11&difficulty=insane')
    await expect(page.locator('#config-alert')).toBeVisible()

    await page.locator('[data-difficulty="hard"]').click()

    await expect(page.locator('#config-alert')).toBeHidden()
    await expectPressed(page, 'hard')
    expect(currentSearch(page)).toBe('?difficulty=hard')
    await expectBoard(page, {
      lives: 3,
      crossings: 0,
      crossingsToWin: 3,
      score: 0,
      tick: 0,
      status: 'active',
    })
  })

  test('Tab reaches the buttons and Space selects without playing a turn', async ({ page }) => {
    await page.goto('/')
    await page.keyboard.press('Space')
    await expectBoard(page, {
      lives: 3,
      crossings: 0,
      crossingsToWin: 3,
      score: 0,
      tick: 1,
      status: 'active',
    })

    await page.keyboard.press('Tab')
    await expect(page.locator('[data-difficulty="easy"]')).toBeFocused()
    await page.keyboard.press('Space')

    await expectPressed(page, 'easy')
    await expectBoard(page, {
      lives: 3,
      crossings: 0,
      crossingsToWin: 3,
      score: 0,
      tick: 0,
      status: 'active',
    })
    await expect(page.locator('#game-canvas')).toBeFocused()
  })
})
```

Why these tests prove the preset really changed: on 2026-09-27 each recorded winning path was replayed against every preset. `WINNING_PATHS.hard` wins only on hard (on normal it ends `lost` at tick 9); `WINNING_PATHS.easy` wins only on easy (on normal it ends `lost` at tick 6).

Run:

```bash
npm run typecheck
npm run test:e2e
```

Expected: typecheck exits 0. `test:e2e` exits non-zero with **exactly 6 failed and 10 passed**; the 6 failures are the 6 tests inside `difficulty selector` (they cannot find `#difficulty-switch` / `[data-difficulty=...]`). Some failures wait for the 30 s test timeout; that is normal. If any of the 10 old tests fails, stop. Do not commit yet.

### T006 — implement

1. `src/main.ts` — replace the whole content with:

```ts
import './style.css'
import { buildDifficultySearch } from './config/difficulty-query'
import { DIFFICULTIES, resolveGameConfig } from './config/game-config'
import { DIFFICULTY_PRESETS } from './config/presets'
import { restartGame } from './game/state'
import { applyAction } from './game/turn'
import { mapKeyboardEvent } from './input/keyboard'
import { configureCanvas, renderGame } from './render/canvas'

const app = document.querySelector<HTMLElement>('#app')

if (!app) {
  throw new Error('Application root #app was not found.')
}

app.innerHTML = `
  <main class="game-shell">
    <header class="game-header">
      <div>
        <p class="game-header__eyebrow">Turn-based night crossing</p>
        <h1>Rush Hour <span>Crossing</span></h1>
      </div>
      <p class="game-header__brief">Read the lane. Make one move. Every choice advances the rush.</p>
    </header>

    <p id="config-alert" class="config-alert" role="status" hidden></p>

    <div class="board-frame">
      <div class="board-stage">
        <canvas
          id="game-canvas"
          tabindex="0"
          aria-label="Rush Hour Crossing game board. Use arrow keys or W A S D to move, Space to wait, and R to restart."
        ></canvas>
        <div id="difficulty-switch" class="difficulty-switch" role="group" aria-label="Traffic difficulty">
          ${DIFFICULTIES.map(
            (difficulty) =>
              `<button type="button" class="difficulty-switch__button" data-difficulty="${difficulty}" aria-pressed="false">${difficulty.toUpperCase()}</button>`,
          ).join('')}
        </div>
      </div>
    </div>

    <footer class="controls" aria-label="Controls">
      <span><kbd>↑ ↓ ← →</kbd> or <kbd>W A S D</kbd> move</span>
      <span><kbd>Space</kbd> wait</span>
      <span><kbd>R</kbd> restart</span>
      <span><kbd>Click</kbd> EASY / NORMAL / HARD traffic</span>
    </footer>
  </main>
`

const canvas = requireElement<HTMLCanvasElement>('#game-canvas')
const configAlert = requireElement<HTMLParagraphElement>('#config-alert')
const difficultyButtons = Array.from(
  document.querySelectorAll<HTMLButtonElement>('#difficulty-switch button[data-difficulty]'),
)
const context = configureCanvas(canvas)
const configResolution = resolveGameConfig(new URLSearchParams(window.location.search))
let config = configResolution.config
let lanes = DIFFICULTY_PRESETS[config.difficulty]
let usedFallback = configResolution.usedFallback
let state = restartGame(config)

if (usedFallback) {
  configAlert.hidden = false
  configAlert.textContent = `Invalid configuration: ${configResolution.invalidFields.join(', ')}. All defaults are active.`
}

for (const button of difficultyButtons) {
  button.addEventListener('click', () => selectDifficulty(button.dataset.difficulty))
}

render()
canvas.focus()

window.addEventListener('keydown', (event) => {
  if (event.target instanceof Element && event.target.closest('#difficulty-switch')) {
    return
  }

  const command = mapKeyboardEvent(event)
  if (!command) {
    return
  }

  event.preventDefault()
  state = command === 'restart' ? restartGame(config) : applyAction(state, command, lanes)
  render()
})

function selectDifficulty(value: string | undefined): void {
  const difficulty = DIFFICULTIES.find((candidate) => candidate === value)

  if (difficulty && difficulty !== config.difficulty) {
    config = { ...config, difficulty }
    lanes = DIFFICULTY_PRESETS[difficulty]
    state = restartGame(config)
    window.history.replaceState(null, '', buildDifficultySearch(window.location.search, difficulty, usedFallback))
    usedFallback = false
    configAlert.hidden = true
    configAlert.textContent = ''
    render()
  }

  canvas.focus()
}

function render(): void {
  renderGame(context, state, config, lanes)
  for (const button of difficultyButtons) {
    button.setAttribute('aria-pressed', String(button.dataset.difficulty === config.difficulty))
  }
  const frame = canvas.closest<HTMLElement>('.board-frame')
  frame?.classList.remove('turn-flash')
  if (window.matchMedia('(prefers-reduced-motion: no-preference)').matches) {
    requestAnimationFrame(() => frame?.classList.add('turn-flash'))
  }
  canvas.setAttribute(
    'aria-label',
    `Rush Hour Crossing. ${state.lives} lives, ${state.crossings} of ${config.crossingsToWin} crossings, score ${state.score}, tick ${state.tick}, status ${state.status}.`,
  )
}

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector)
  if (!element) {
    throw new Error(`Required element ${selector} was not found.`)
  }
  return element
}
```

What changed compared with the old file (for the reviewer, not for copying): the Canvas is wrapped in `.board-stage` with the button group after it (so Tab reaches the Canvas first, keeping the old focus test valid); footer label; `config`, `lanes` become `let`; `usedFallback`; click handlers; keyboard guard for the button group; `selectDifficulty`; `aria-pressed` update in `render()`. The Canvas `aria-label` text is unchanged, so `e2e/support.ts` stays valid.

2. `src/render/canvas.ts` — replace exactly:

Old:

```ts
  context.fillText(`TICK ${state.tick}  ·  ${config.difficulty.toUpperCase()} TRAFFIC`, 20, 54)
```

New:

```ts
  context.fillText(`TICK ${state.tick}`, 20, 54)
```

(`config` is still used two lines above in `drawHud`, so no unused-parameter error.)

3. `src/style.css` — replace exactly (this is the `@media(prefers-reduced-motion:reduce)` line inside `@layer components`; it occurs once):

Old:

```css
  @media(prefers-reduced-motion:reduce){.board-frame{transition:none}.board-frame.turn-flash{filter:none;transform:none}}
```

New:

```css
  .board-stage{position:relative}.difficulty-switch{position:absolute;left:19.1%;top:10.4%;transform:translateY(-50%);display:flex;gap:6px}.difficulty-switch__button{padding:2px 8px;border:1px solid #57d3e5;border-radius:5px;background:#07152d;color:#57d3e5;font:700 .72rem/1.3 Consolas,monospace;letter-spacing:.06em;cursor:pointer}.difficulty-switch__button:hover{background:#12305a;color:#f5f7ff}.difficulty-switch__button[aria-pressed="true"]{background:#57d3e5;color:#031027}.difficulty-switch__button:focus-visible{outline:3px solid #ffc83d;outline-offset:2px}
  @media(max-width:520px){.difficulty-switch{gap:3px}.difficulty-switch__button{padding:1px 4px;font-size:.58rem}}
  @media(prefers-reduced-motion:reduce){.board-frame{transition:none}.board-frame.turn-flash{filter:none;transform:none}}
```

4. Run all checks:

```bash
npm run typecheck
npm run test:run
npm run build
npm audit --audit-level=high
npm run test:e2e
```

Expected: all exit 0. Unit tests `Test Files  8 passed (8)` / `Tests  69 passed (69)`. Audit `found 0 vulnerabilities`. E2E: `16 passed`.

5. Student manual check (ask the student, do not skip): `npm run dev`, open the printed local URL, and confirm:
   - three buttons sit on the `TICK` line, right of `TICK 0`, inside the dark HUD band, `NORMAL` filled;
   - click `HARD` → board resets, `HARD` filled, URL ends with `?difficulty=hard`;
   - arrow keys still move the player right after the click (focus returned to the board);
   - at a narrow browser window (about 320 px) the buttons still fit in the HUD and there is no horizontal scroll.
   Record "confirmed" or the student's exact remark. If the student reports a problem, stop.

6. Commit C2:

```bash
git add e2e/smoke.pw.ts src/main.ts src/render/canvas.ts src/style.css
git commit -m "feat(ui): add difficulty buttons next to the tick counter" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git show --stat HEAD
git rev-parse --short HEAD
```

Expected: exactly those 4 files. Save the short SHA as `{{C2_SHA}}`.

---

## §C3 Evidence screenshot (T007)

In `e2e/evidence.pw.ts` replace exactly:

Old:

```ts
  test('loss (D6), easy', async ({ page }) => {
```

New:

```ts
  test('difficulty selector, hard chosen', async ({ page }) => {
    await open(page, '/')
    await page.locator('[data-difficulty="hard"]').click()
    await expect(page.locator('[data-difficulty="hard"]')).toHaveAttribute('aria-pressed', 'true')
    await expectBoard(page, {
      lives: 3,
      crossings: 0,
      crossingsToWin: 3,
      score: 0,
      tick: 0,
      status: 'active',
    })
    await capture(page, 'difficulty-switch.png')
  })

  test('loss (D6), easy', async ({ page }) => {
```

Run **only** the new test (running the whole evidence file would overwrite the old 003 screenshots, which DEC-5 forbids):

```bash
npx playwright test e2e/evidence.pw.ts -g "difficulty selector"
git status --short
```

Expected: `1 passed`. `git status --short` shows ` M e2e/evidence.pw.ts`, `?? docs/evidence/difficulty-switch.png`, and the untracked week report — **no other `docs/evidence/*.png` changed**. If an old PNG shows as modified, stop and report (do not restore it yourself).

Ask the student to open `docs/evidence/difficulty-switch.png` and confirm `HARD` is filled and the board shows hard traffic. Then:

```bash
npm run typecheck
git add e2e/evidence.pw.ts docs/evidence/difficulty-switch.png
git commit -m "test(e2e): add difficulty selector evidence screenshot" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## §C4 Documentation (T008)

Use today's real date for `{{DATE}}` (format `2026-MM-DD`). Fill `{{C2_SHA}}` from T006.

### 1. `docs/GAME_SPEC.md` (student-approved amendment)

Replace exactly:

Old:

```md
| R | restart igre |
```

New:

```md
| R | restart igre |
| Klik mišem na `EASY` / `NORMAL` / `HARD` (HUD, desno od `TICK`) | izbor težine; nova igra na izabranom presetu |
```

Replace exactly:

Old:

```md
- Samo tastatura.
```

New:

```md
- Potezi igre se igraju samo tastaturom. Težina se bira i mišem (vidi *Izbor težine*).
```

Replace exactly:

Old:

```md
- Posle pobede ili poraza svi inputi osim `R` se ignorišu.
```

New:

```md
- Posle pobede ili poraza svi inputi osim `R` i izbora težine se ignorišu.
```

Replace exactly:

Old:

```md
| **R7** | Posle kraja igre input se ignoriše osim `R`, koji resetuje stanje (tick 0, životi iz konfiguracije, 0 prelazaka, 0 poena). |
```

New:

```md
| **R7** | Posle kraja igre input se ignoriše osim `R`, koji resetuje stanje (tick 0, životi iz konfiguracije, 0 prelazaka, 0 poena), i izbora težine, koji resetuje stanje isto kao `R`, ali na izabranom presetu. |
```

Replace exactly:

Old:

```md
**Nevalidni primeri:** `?lives=0`, `?lives=2.5`, `?lives=abc`, `?crossingsToWin=11`, `?difficulty=insane`
```

New:

```md
**Nevalidni primeri:** `?lives=0`, `?lives=2.5`, `?lives=abc`, `?crossingsToWin=11`, `?difficulty=insane`

## Izbor težine (feature 004)

- HUD ima tri dugmeta, `EASY`, `NORMAL` i `HARD`, desno od brojača `TICK`. Aktivna težina je istaknuta (`aria-pressed="true"`).
- Klik (ili Enter/Space dok je dugme fokusirano) na neaktivnu težinu počinje novu igru kao `R` (tick 0, životi iz konfiguracije, 0 prelazaka, 0 poena), ali sa izabranim presetom; `lives` i `crossingsToWin` ostaju. Fokus se vraća na tablu.
- Klik na već aktivnu težinu ne menja igru.
- URL se menja bez ponovnog učitavanja (`history.replaceState`): postavlja se `difficulty`, ostali parametri ostaju. Ako je igra radila na fallback konfiguraciji, `lives` i `crossingsToWin` se uklanjaju iz URL-a i poruka o pogrešnoj konfiguraciji se sakriva, pa reload daje istu konfiguraciju koja se igra.
- Pravila R1–R6, preseti i determinizam se ne menjaju.
- Dokaz: `tests/difficulty-query.test.ts`, `e2e/smoke.pw.ts` → *difficulty selector*, screenshot `docs/evidence/difficulty-switch.png`.
```

### 2. `.specify/memory/constitution.md` (PATCH 1.1.0 → 1.1.1)

Replace exactly:

Old:

```md
- Version change: 1.0.0 -> 1.1.0
- Modified principles: V. Configuration Outside Logic (adds the no-overlap and
  winnable-preset invariants after the third review)
```

New:

```md
- Version change: 1.1.0 -> 1.1.1
- Modified principles: none (Technical Constraints clarification: gameplay moves
  stay keyboard-only; the difficulty selector may also be used with a mouse)
```

Replace exactly:

Old:

```md
  motion. Gameplay itself remains keyboard-only as specified.
```

New:

```md
  motion. Gameplay moves remain keyboard-only as specified; the difficulty selector
  may also be operated with a mouse.
```

Replace exactly:

Old:

```md
**Version**: 1.1.0 | **Ratified**: 2026-09-22 | **Last Amended**: 2026-09-26
```

New:

```md
**Version**: 1.1.1 | **Ratified**: 2026-09-22 | **Last Amended**: {{DATE}}
```

### 3. `AGENTS.md`

Replace exactly:

Old:

```md
6. `docs/CONTEXT_MANIFEST.md` — which context is included and which is deliberately excluded.
```

New:

```md
6. `specs/004-difficulty-switch/` — accepted UI addendum: `EASY` / `NORMAL` / `HARD` buttons next to the tick counter. It adds a mouse-operated difficulty selector and changes no rule R1–R6.
7. `docs/CONTEXT_MANIFEST.md` — which context is included and which is deliberately excluded.
```

### 4. `README.md`

Replace exactly:

Old:

```md
- `npm run test:e2e` — build the game and run the browser smoke test (startup, focus, invalid configuration, win/loss input lock, restart)
```

New:

```md
- `npm run test:e2e` — build the game and run the browser smoke test (startup, focus, invalid configuration, win/loss input lock, restart, difficulty selector)
```

Replace exactly:

Old:

```md
- R to restart
```

New:

```md
- R to restart
- Click `EASY`, `NORMAL`, or `HARD` next to the tick counter (or Tab to a button and press Enter or Space) to start a new game on that traffic preset; the choice is saved in the URL
```

### 5. `docs/EVIDENCE_003.md`

Replace exactly:

Old:

```md
2. **Development history.** The process record the assignment requires: F0, baseline, controlled change, and later corrections. Numbers in that part were true on their own date and are superseded by part 1.
```

New:

```md
2. **Development history.** The process record the assignment requires: F0, baseline, controlled change, and later corrections. Numbers in that part were true on their own date and are superseded by part 1.

Feature 004 (difficulty selector, code at `{{C2_SHA}}`) was added after the Part 1 verification. Its own checks are in Part 2 → *Difficulty selector*; the Part 1 screenshots intentionally still show the board without the buttons.
```

Then replace exactly:

Old:

```md
## Git preservation
```

New (fill every `{{...}}` from real output; `{{UNIT}}` e.g. `8 files / 69 tests`, `{{E2E}}` e.g. `16 passed`):

```md
## Difficulty selector ({{DATE}}, `{{C2_SHA}}`)

- **Claim:** The player can switch between easy, normal, and hard on the game screen with the mouse, without editing the URL.
- **Signal:** Difficulty could only be chosen with `?difficulty=` in the URL.
- **Change:** `EASY` / `NORMAL` / `HARD` buttons over the Canvas HUD next to `TICK` (`src/main.ts`, `src/style.css`); HUD line shows only `TICK n` (`src/render/canvas.ts`); pure helper `buildDifficultySearch` (`src/config/difficulty-query.ts`). A switch restarts the game on the chosen preset and updates the URL with `history.replaceState`. Plan: `specs/004-difficulty-switch/implementation-plan.md`.
- **Tests first:** the new unit file failed before the helper existed; the 6 new browser tests failed (6 failed, 10 passed) before the buttons existed.
- **Result:** typecheck, {{UNIT}}, build, audit (0 vulnerabilities), and `npm run test:e2e` {{E2E}} pass on `{{C2_SHA}}`. Screenshot [`difficulty-switch.png`](evidence/difficulty-switch.png). Student visual check: {{STUDENT_CHECK}}.
- **Limitation:** The button position is set in CSS percentages that match the current HUD geometry (576 × 520 Canvas, HUD line at y = 54). A change of `CELL_SIZE`, `HUD_HEIGHT`, or the HUD text must re-check the position. While a button has keyboard focus, game keys are ignored until focus returns to the board.

## Git preservation
```

Add a row at the end of the *Git preservation* table. Replace exactly:

Old:

```md
| Browser smoke test; code verified in Part 1 | `2c1b3b1` |
```

New:

```md
| Browser smoke test; code verified in Part 1 | `2c1b3b1` |
| Difficulty selector (feature 004) | `{{C2_SHA}}` |
```

### 6. `docs/AI_USAGE_LOG.md`

Append at the end of the file (one empty line before it):

```md
## Difficulty selector (feature 004) — {{DATE}}

- **Why AI was involved**: The student asked for mouse buttons next to the tick counter to switch difficulty. Claude Code (Opus 5.5) read the code, measured the button layout in the running game, replayed the golden paths against every preset, and wrote `specs/004-difficulty-switch/implementation-plan.md` on 2026-09-27. OpenAI Codex (Luna 6) implemented it step by step.
- **Decisions recorded (student)**: three buttons EASY / NORMAL / HARD (DEC-1); a switch restarts the game on the new preset, the active button does nothing (DEC-2); real HTML buttons over the Canvas HUD (DEC-3); the choice is written to the URL (DEC-4); the old screenshots stay, one new screenshot is added (DEC-5). `GAME_SPEC.md` (controls, R7, new *Izbor težine* section) and the constitution (1.1.0 → 1.1.1, mouse allowed for the difficulty selector only) were amended accordingly.
- **Deviation noted**: The feature was specified in one combined plan file instead of the separate Spec Kit spec/plan/tasks files, at the student's request.
- **Verification signal**: new unit tests failed before the helper and pass after; 6 new browser tests failed before the buttons and pass after; on `{{C2_SHA}}`: typecheck, {{UNIT}}, build, audit, and `npm run test:e2e` {{E2E}} pass.
```

### Commit C4

```bash
git status --short
```

Check no `{{` remains in the six files:

```bash
git grep -n "{{" -- docs/GAME_SPEC.md .specify/memory/constitution.md AGENTS.md README.md docs/EVIDENCE_003.md docs/AI_USAGE_LOG.md
```

Expected: no output (exit code 1). Then:

```bash
git add docs/GAME_SPEC.md .specify/memory/constitution.md AGENTS.md README.md docs/EVIDENCE_003.md docs/AI_USAGE_LOG.md
git commit -m "docs: record the difficulty selector" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## §C5 Final check (T009)

```bash
git branch --show-current
git log --oneline -6
git status --short
npm run typecheck
npm run test:run
npm run build
npm audit --audit-level=high
npm run test:e2e
```

Expected: branch `004-difficulty-switch`; the top five commits are C4, C3, C2, C1, C0 on top of `497f035`; only the week report is untracked; all checks exit 0 with `69 passed` and `16 passed`.

Report to the student: the five SHAs, the check results, and "not pushed, not merged". The student merges into `main` themselves (reviewers read `main`).

---

## §P Prompts for Codex

Start a **new** Codex session for each prompt. After each one, do the student check before sending the next.

### Prompt 0 — Read and confirm (no changes)

```text
Pre implementacije:
1. Sažmi razumevanje zadatka.
2. Navedi plan u nekoliko koraka.
3. Navedi nejasnoće ili pretpostavke.
4. Ne proširuj scope bez eksplicitnog razloga.

Role: You are a coding agent in the Rush Hour Crossing repository. In this session you only READ. Do not edit, create, delete, stage, or commit any file. Do not run npm install.

Read, in this order: AGENTS.md, .specify/memory/constitution.md, docs/GAME_SPEC.md, specs/004-difficulty-switch/implementation-plan.md, src/main.ts, src/render/canvas.ts, src/style.css, src/config/game-config.ts, e2e/smoke.pw.ts, e2e/support.ts.

Then answer:
1. Which branch must all work happen on, and which git commands are forbidden?
2. Which files change in step C1 and in step C2?
3. How many unit tests exist after C1, and how many browser tests fail in T005 and pass after T006?
4. Why must the keydown listener ignore events from #difficulty-switch?
5. Why must the evidence screenshot be captured with -g "difficulty selector" only?
6. List any contradiction between the plan and the real files (for example an "Old" text that does not exist exactly once). If none, say "none".

Stop after answering.
```

**Student check**: branch `004-difficulty-switch`; forbidden include checkout main, merge, push, `git add -A`; C1 = test file, `difficulty-query.ts`, `game-config.ts`; C2 = `smoke.pw.ts`, `main.ts`, `canvas.ts`, `style.css`; 69 unit tests; 6 fail / 16 pass; answer 4 = Space on a focused button would otherwise play a wait turn instead of pressing the button; answer 5 = protect the old screenshots. Any contradiction → bring it back to Claude before continuing.

### Prompt 1 — Start and C1 (T001–T004)

```text
Pre implementacije:
1. Sažmi razumevanje zadatka.
2. Navedi plan u nekoliko koraka.
3. Navedi nejasnoće ili pretpostavke.
4. Ne proširuj scope bez eksplicitnog razloga.

Role: You are a coding agent in the Rush Hour Crossing repository. Implement tasks T001 to T004 from specs/004-difficulty-switch/implementation-plan.md (sections §T, §C0, §C1) and nothing else.

Rules:
- Follow the hard rules in §T exactly.
- Copy code blocks exactly; do not reformat or improve them.
- T003 must fail (the new test file cannot resolve src/config/difficulty-query) before you create the helper. If it does not fail, stop.
- If any output differs from the Expected text, stop immediately, paste the actual output, and report. Do not try another fix.

Finish with: completed task IDs, the T003 failing summary lines, the T004 passing summary lines, and the C0 and C1 short SHAs. Then stop.
```

**Student check**: `git log --oneline -3` shows C1, C0, `497f035`; `git show --stat HEAD` lists only the 3 files.

### Prompt 2 — C2 (T005–T006)

```text
Pre implementacije:
1. Sažmi razumevanje zadatka.
2. Navedi plan u nekoliko koraka.
3. Navedi nejasnoće ili pretpostavke.
4. Ne proširuj scope bez eksplicitnog razloga.

Role: You are a coding agent in the Rush Hour Crossing repository, on branch 004-difficulty-switch. Implement tasks T005 and T006 from specs/004-difficulty-switch/implementation-plan.md (section §C2) and nothing else.

Rules:
- Follow the hard rules in §T exactly.
- T005 must end with exactly 6 failed and 10 passed browser tests before you touch src/main.ts. If not, stop.
- Replace src/main.ts with the exact block from §C2 T006 step 1. Make the canvas.ts and style.css replacements exactly as written.
- Before committing, ask me (the student) to do the manual check in T006 step 5 and wait for my answer. Record my answer word for word in your final report.
- If any output differs from the Expected text, stop, paste the actual output, and report.

Finish with: the T005 failing summary, the T006 check results (typecheck, unit summary, build, audit, e2e summary), my manual-check answer, and the C2 short SHA. Then stop.
```

**Student check**: run `npm run dev` yourself and play: click each button, move with arrows, try Tab + Space. `git show --stat HEAD` lists only the 4 files.

### Prompt 3 — C3 and C4 (T007–T009)

```text
Pre implementacije:
1. Sažmi razumevanje zadatka.
2. Navedi plan u nekoliko koraka.
3. Navedi nejasnoće ili pretpostavke.
4. Ne proširuj scope bez eksplicitnog razloga.

Role: You are a coding agent in the Rush Hour Crossing repository, on branch 004-difficulty-switch. Implement tasks T007, T008 and T009 from specs/004-difficulty-switch/implementation-plan.md (sections §C3, §C4, §C5) and nothing else.

Rules:
- Follow the hard rules in §T exactly.
- Capture the screenshot only with: npx playwright test e2e/evidence.pw.ts -g "difficulty selector". Never run npm run evidence:screenshots. If any old docs/evidence/*.png is modified, stop.
- Ask me to confirm the new screenshot before committing C3.
- Fill every {{...}} placeholder only with values you saw in real output in this repository (C2_SHA from `git log`, test summaries from re-running the checks). My manual-check answer from the previous session is: <PASTE THE ANSWER HERE>.
- If any output differs from the Expected text, stop, paste the actual output, and report.
- Do not push and do not merge.

Finish with: the five commit SHAs (C0–C4), the §C5 check results, and the sentence "not pushed, not merged". Then stop.
```

**Student check**: `git log --oneline -6`; open `docs/EVIDENCE_003.md` and `docs/AI_USAGE_LOG.md` and read the new sections; `git grep -n "{{" -- docs README.md AGENTS.md .specify/memory` returns nothing. Then merge into `main` yourself when satisfied.
