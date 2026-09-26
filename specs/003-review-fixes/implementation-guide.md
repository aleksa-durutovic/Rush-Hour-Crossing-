# Implementation Guide: Third-Review Corrections

This guide is written for a coding agent that must **copy, not design**. Every code block below was run on 2026-09-26 in a throwaway copy of this repository and produced the "Expected" output shown. If your output differs, stop and report (see the hard rules in `tasks.md`).

Conventions:

- `§X` = a section of this file. Tasks in `tasks.md` point to these sections.
- "Replace the whole content" means: delete everything in the file and paste the block exactly, including the final newline.
- Commands work in PowerShell and in Git Bash unless marked otherwise.
- `{{NAME}}` is a placeholder. Replace it with the real value recorded in `specs/003-review-fixes/run-log.md`. No `{{` may remain in any committed file except this guide and `run-log.md`'s template headings.

---

## §0 Starting point (T001)

```bash
git branch --show-current
git log --oneline -1
git status --short
```

Expected:

```text
003-review-fixes
<sha> docs(spec): add 003 review-fixes specification
?? docs/WEEK_03_REPORT_ALEKSA_DURUTOVIC.md
```

If the branch is `main`, stop. If the spec commit is missing, stop and ask the student to commit `specs/003-review-fixes/` first.

---

## §1 Run log (T002, T003)

Create `specs/003-review-fixes/run-log.md` with this content, then fill it as you go. Paste real output lines; never type numbers from memory.

````markdown
# Run Log — 003 Review Fixes

Real command output recorded during implementation. Source for `EVIDENCE_003.md`, `EVALS.md`, and `AI_USAGE_LOG.md`.

## Environment

- Date: {{DATE}}
- Implementing agent / model: {{CODEX_MODEL}}
- `node -v`:
- `npm -v`:
- Start commit (`git rev-parse --short HEAD`):

## Before any change

| Command | Exit | Key output |
|---|---:|---|
| `npm ci` | | |
| `npm run typecheck` | | |
| `npm run test:run` | | |
| `npm run build` | | |

## US1 — failing before change

```text
(paste the "Test Files" and "Tests" summary lines and the FAIL lines)
```

## US1 — after change

| Command | Exit | Key output |
|---|---:|---|

- C1_SHA:

## US2 — failing before change

```text
```

## US2 — after change

| Command | Exit | Key output |
|---|---:|---|

- C2_SHA:

## US3

| Command | Exit | Key output |
|---|---:|---|

- CODE_SHA (commit C3):

## Current state (CODE_SHA)

| Command | Exit | Key output |
|---|---:|---|

- Versions (`npm ls vite typescript vitest @playwright/test --depth=0`):
- `npx playwright --version`:
- `npm audit --json` metadata:

## Evidence screenshots

- `npm run evidence:screenshots` summary:
- Files changed:
- Student visual confirmation (T031):
````

For T003 run, in order:

```bash
npm ci
npm run typecheck
npm run test:run
npm run build
```

Expected: every command exits 0; test summary contains `Test Files  7 passed (7)` and `Tests  43 passed (43)`.

---

## §US1-A `tests/presets.test.ts` — replace the whole content (T004)

```ts
import { describe, expect, it } from 'vitest'
import { GRID_COLUMNS } from '../src/game/constants'
import { DIFFICULTY_PRESETS } from '../src/config/presets'
import { getOccupiedCells, getVehicleCells } from '../src/game/traffic'

describe('difficulty presets', () => {
  it.each(Object.entries(DIFFICULTY_PRESETS))(
    '%s has five unique, never-blocked traffic lanes through tick 199',
    (_difficulty, lanes) => {
      expect(lanes.map((lane) => lane.row)).toEqual([1, 2, 3, 4, 5])

      for (const lane of lanes) {
        for (let tick = 0; tick <= 199; tick += 1) {
          expect(getOccupiedCells(lane, tick).size).toBeLessThan(GRID_COLUMNS)
        }
      }
    },
  )

  it.each(Object.entries(DIFFICULTY_PRESETS))(
    '%s never places two vehicles of one lane on the same cell through tick 199',
    (_difficulty, lanes) => {
      for (const lane of lanes) {
        for (let tick = 0; tick <= 199; tick += 1) {
          const cells = lane.vehicleStarts.flatMap((start) => getVehicleCells(lane, tick, start))
          expect(new Set(cells).size, `row ${lane.row}, tick ${tick}`).toBe(cells.length)
        }
      }
    },
  )
})
```

This file is final after US1; US2 does not change it.

---

## §US1-B `tests/fixtures/golden-paths.ts` — create (T005, US1 version)

Create the folder `tests/fixtures/` if it does not exist.

```ts
import type { Difficulty, PlayerAction } from '../../src/game/state'

/**
 * Recorded action sequences for the URL `?crossingsToWin=1&difficulty=<preset>`
 * (lives defaults to 3). Unit tests replay them against the pure turn logic.
 */
export interface GoldenPath {
  actions: readonly PlayerAction[]
  finalTick: number
  finalLives: number
}

/** Presets that currently have recorded golden paths. */
export type CoveredDifficulty = Extract<Difficulty, 'easy' | 'normal'>

export const WINNING_PATHS: Readonly<Record<CoveredDifficulty, GoldenPath>> = {
  easy: {
    actions: ['up', 'up', 'up', 'up', 'up', 'up'],
    finalTick: 6,
    finalLives: 3,
  },
  normal: {
    actions: ['up', 'right', 'up', 'right', 'left', 'up', 'up', 'wait', 'wait', 'up', 'up'],
    finalTick: 11,
    finalLives: 3,
  },
}

export const LOSING_PATHS: Readonly<Record<CoveredDifficulty, GoldenPath>> = {
  easy: {
    actions: ['up', 'up', 'right', 'up', 'up', 'up'],
    finalTick: 6,
    finalLives: 0,
  },
  normal: {
    actions: ['up', 'up', 'up', 'up', 'up', 'up'],
    finalTick: 6,
    finalLives: 0,
  },
}

/** Fewest actions needed to win once without losing a life (breadth-first search). */
export const SHORTEST_SAFE_WIN: Readonly<Record<CoveredDifficulty, number>> = {
  easy: 6,
  normal: 11,
}
```

The file name has no `.test.` part, so Vitest does not run it as a test file.

---

## §US1-C `tests/reachability.test.ts` — replace the whole content (T005, US1 version)

```ts
import { describe, expect, it } from 'vitest'
import { DIFFICULTY_PRESETS } from '../src/config/presets'
import type {
  GameConfig,
  GameState,
  GameStatus,
  LaneDefinition,
  PlayerAction,
} from '../src/game/state'
import { createInitialState } from '../src/game/state'
import { applyAction } from '../src/game/turn'
import type { CoveredDifficulty } from './fixtures/golden-paths'
import { LOSING_PATHS, SHORTEST_SAFE_WIN, WINNING_PATHS } from './fixtures/golden-paths'

const actions: readonly PlayerAction[] = ['up', 'down', 'left', 'right', 'wait']
const difficulties: readonly CoveredDifficulty[] = ['easy', 'normal']
const MAX_PATH_LENGTH = 80

describe('real preset reachability', () => {
  it.each(difficulties)('%s can be won without losing a life', (difficulty) => {
    const path = findPath(difficulty, 1, 'won')

    expect(path).not.toBeNull()
    expect(path?.length).toBe(SHORTEST_SAFE_WIN[difficulty])
  })

  it.each(difficulties)('%s can be lost through player actions', (difficulty) => {
    expect(findPath(difficulty, 3, 'lost')).not.toBeNull()
  })
})

describe('recorded golden paths', () => {
  it.each(difficulties)('the recorded winning path wins %s', (difficulty) => {
    const golden = WINNING_PATHS[difficulty]
    const state = replay(difficulty, golden.actions)

    expect(state.status).toBe('won')
    expect(state.tick).toBe(golden.finalTick)
    expect(state.lives).toBe(golden.finalLives)
    expect(state.crossings).toBe(1)
    expect(state.score).toBe(100)
  })

  it.each(difficulties)('the recorded losing path loses %s', (difficulty) => {
    const golden = LOSING_PATHS[difficulty]
    const state = replay(difficulty, golden.actions)

    expect(state.status).toBe('lost')
    expect(state.tick).toBe(golden.finalTick)
    expect(state.lives).toBe(golden.finalLives)
    expect(state.crossings).toBe(0)
  })
})

function replay(difficulty: CoveredDifficulty, path: readonly PlayerAction[]): GameState {
  const config: GameConfig = { lives: 3, crossingsToWin: 1, difficulty }
  const lanes = DIFFICULTY_PRESETS[difficulty]
  return path.reduce(
    (state, action) => applyAction(state, action, lanes),
    createInitialState(config),
  )
}

function findPath(
  difficulty: CoveredDifficulty,
  lives: number,
  target: Extract<GameStatus, 'won' | 'lost'>,
): PlayerAction[] | null {
  const config: GameConfig = { lives, crossingsToWin: 1, difficulty }
  const lanes: readonly LaneDefinition[] = DIFFICULTY_PRESETS[difficulty]
  const queue: { state: GameState; path: PlayerAction[] }[] = [
    { state: createInitialState(config), path: [] },
  ]
  const visited = new Set<string>()

  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const current = queue[cursor]
    if (!current) {
      continue
    }
    if (current.state.status === target) {
      return current.path
    }
    if (current.path.length >= MAX_PATH_LENGTH || current.state.status !== 'active') {
      continue
    }

    for (const action of actions) {
      const state = applyAction(current.state, action, lanes)
      const key = stateKey(state)
      if (!visited.has(key)) {
        visited.add(key)
        queue.push({ state, path: [...current.path, action] })
      }
    }
  }

  return null
}

function stateKey(state: GameState): string {
  return [
    state.tick,
    state.player.x,
    state.player.y,
    state.lives,
    state.crossings,
    state.status,
  ].join(':')
}
```

---

## §US1-D Expected failure before the preset change (T006)

```bash
npm run typecheck
npm run test:run
```

Expected: typecheck exits 0. The test run exits non-zero and ends with:

```text
 FAIL  tests/presets.test.ts > difficulty presets > normal never places two vehicles of one lane on the same cell through tick 199
 FAIL  tests/reachability.test.ts > recorded golden paths > the recorded winning path wins normal
 Test Files  2 failed | 5 passed (7)
      Tests  2 failed | 50 passed (52)
```

(The order of the two FAIL lines may differ.) Why they fail: normal row 4 overlaps in cell 0, and on the old preset the new normal path ends `lost` at tick 4. Any other failing test means something was copied wrongly: stop.

---

## §US1-E `src/config/presets.ts` — one line (T007)

Find this exact line (inside `normal:`):

```ts
    lane(4, 'left', 2, 2, [0, 4, 8]),
```

Replace it with:

```ts
    lane(4, 'left', 2, 2, [0, 4]),
```

Nothing else in the file changes. `git diff src/config/presets.ts` must show exactly one removed and one added line.

---

## §US1-F Expected after the change (T008)

```bash
npm run typecheck
npm run test:run
npm run build
```

Expected: all exit 0; test summary `Test Files  7 passed (7)` and `Tests  52 passed (52)`; build ends with `built in`.

---

## §US1-G Commit C1 (T009)

```bash
git diff --stat
git add tests/presets.test.ts tests/fixtures/golden-paths.ts tests/reachability.test.ts src/config/presets.ts specs/003-review-fixes/run-log.md
git status --short
git commit -m "fix(presets): remove the overlapping vehicle in normal row 4" -m "Normal row 4 starts change from [0, 4, 8] to [0, 4]. The vehicle at 8 wrapped into column 0 and overlapped the vehicle at 0 in every tick. Adds a no-overlap test for all presets and reachability plus golden-path tests for easy and normal; the shortest safe normal win stays 11 actions."
git rev-parse --short HEAD
```

`git status --short` before the commit must show only the five staged paths (`M`/`A`) plus `?? docs/WEEK_03_REPORT_ALEKSA_DURUTOVIC.md`. Write the last output into `run-log.md` as `C1_SHA` (this edit is committed with C2).

---

## §US2-A `tests/fixtures/golden-paths.ts` — replace the whole content (T010, final version)

```ts
import type { Difficulty, PlayerAction } from '../../src/game/state'

/**
 * Recorded action sequences for the URL `?crossingsToWin=1&difficulty=<preset>`
 * (lives defaults to 3). Unit tests replay them against the pure turn logic and the
 * browser smoke test replays them as key presses.
 */
export interface GoldenPath {
  actions: readonly PlayerAction[]
  finalTick: number
  finalLives: number
}

export const WINNING_PATHS: Readonly<Record<Difficulty, GoldenPath>> = {
  easy: {
    actions: ['up', 'up', 'up', 'up', 'up', 'up'],
    finalTick: 6,
    finalLives: 3,
  },
  normal: {
    actions: ['up', 'right', 'up', 'right', 'left', 'up', 'up', 'wait', 'wait', 'up', 'up'],
    finalTick: 11,
    finalLives: 3,
  },
  hard: {
    actions: [
      'up', 'down', 'wait', 'wait', 'wait', 'left', 'up', 'up',
      'up', 'up', 'left', 'left', 'left', 'up', 'up',
    ],
    finalTick: 15,
    finalLives: 3,
  },
}

export const LOSING_PATHS: Readonly<Record<Difficulty, GoldenPath>> = {
  easy: {
    actions: ['up', 'up', 'right', 'up', 'up', 'up'],
    finalTick: 6,
    finalLives: 0,
  },
  normal: {
    actions: ['up', 'up', 'up', 'up', 'up', 'up'],
    finalTick: 6,
    finalLives: 0,
  },
  hard: {
    actions: ['up', 'up', 'up', 'up'],
    finalTick: 4,
    finalLives: 0,
  },
}

/** Fewest actions needed to win once without losing a life (breadth-first search). */
export const SHORTEST_SAFE_WIN: Readonly<Record<Difficulty, number>> = {
  easy: 6,
  normal: 11,
  hard: 15,
}
```

---

## §US2-B `tests/reachability.test.ts` — replace the whole content (T011, final version)

```ts
import { describe, expect, it } from 'vitest'
import { DIFFICULTY_PRESETS } from '../src/config/presets'
import type {
  Difficulty,
  GameConfig,
  GameState,
  GameStatus,
  LaneDefinition,
  PlayerAction,
} from '../src/game/state'
import { createInitialState } from '../src/game/state'
import { applyAction } from '../src/game/turn'
import { LOSING_PATHS, SHORTEST_SAFE_WIN, WINNING_PATHS } from './fixtures/golden-paths'

const actions: readonly PlayerAction[] = ['up', 'down', 'left', 'right', 'wait']
const difficulties: readonly Difficulty[] = ['easy', 'normal', 'hard']
const MAX_PATH_LENGTH = 80

describe('real preset reachability', () => {
  it.each(difficulties)('%s can be won without losing a life', (difficulty) => {
    const path = findPath(difficulty, 1, 'won')

    expect(path).not.toBeNull()
    expect(path?.length).toBe(SHORTEST_SAFE_WIN[difficulty])
  })

  it.each(difficulties)('%s can be lost through player actions', (difficulty) => {
    expect(findPath(difficulty, 3, 'lost')).not.toBeNull()
  })

  it('orders presets by the fewest actions needed for a safe win', () => {
    expect(SHORTEST_SAFE_WIN.easy).toBeLessThan(SHORTEST_SAFE_WIN.normal)
    expect(SHORTEST_SAFE_WIN.normal).toBeLessThan(SHORTEST_SAFE_WIN.hard)
  })
})

describe('recorded golden paths', () => {
  it.each(difficulties)('the recorded winning path wins %s', (difficulty) => {
    const golden = WINNING_PATHS[difficulty]
    const state = replay(difficulty, golden.actions)

    expect(state.status).toBe('won')
    expect(state.tick).toBe(golden.finalTick)
    expect(state.lives).toBe(golden.finalLives)
    expect(state.crossings).toBe(1)
    expect(state.score).toBe(100)
  })

  it.each(difficulties)('the recorded losing path loses %s', (difficulty) => {
    const golden = LOSING_PATHS[difficulty]
    const state = replay(difficulty, golden.actions)

    expect(state.status).toBe('lost')
    expect(state.tick).toBe(golden.finalTick)
    expect(state.lives).toBe(golden.finalLives)
    expect(state.crossings).toBe(0)
  })
})

function replay(difficulty: Difficulty, path: readonly PlayerAction[]): GameState {
  const config: GameConfig = { lives: 3, crossingsToWin: 1, difficulty }
  const lanes = DIFFICULTY_PRESETS[difficulty]
  return path.reduce(
    (state, action) => applyAction(state, action, lanes),
    createInitialState(config),
  )
}

function findPath(
  difficulty: Difficulty,
  lives: number,
  target: Extract<GameStatus, 'won' | 'lost'>,
): PlayerAction[] | null {
  const config: GameConfig = { lives, crossingsToWin: 1, difficulty }
  const lanes: readonly LaneDefinition[] = DIFFICULTY_PRESETS[difficulty]
  const queue: { state: GameState; path: PlayerAction[] }[] = [
    { state: createInitialState(config), path: [] },
  ]
  const visited = new Set<string>()

  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const current = queue[cursor]
    if (!current) {
      continue
    }
    if (current.state.status === target) {
      return current.path
    }
    if (current.path.length >= MAX_PATH_LENGTH || current.state.status !== 'active') {
      continue
    }

    for (const action of actions) {
      const state = applyAction(current.state, action, lanes)
      const key = stateKey(state)
      if (!visited.has(key)) {
        visited.add(key)
        queue.push({ state, path: [...current.path, action] })
      }
    }
  }

  return null
}

function stateKey(state: GameState): string {
  return [
    state.tick,
    state.player.x,
    state.player.y,
    state.lives,
    state.crossings,
    state.status,
  ].join(':')
}
```

---

## §US2-C Expected failure before the preset change (T012, T013)

`npm run typecheck` exits 0. `npm run test:run` exits non-zero and ends with:

```text
 FAIL  tests/reachability.test.ts > real preset reachability > hard can be won without losing a life
 FAIL  tests/reachability.test.ts > recorded golden paths > the recorded winning path wins hard
 FAIL  tests/reachability.test.ts > recorded golden paths > the recorded losing path loses hard
 Test Files  1 failed | 6 passed (7)
      Tests  3 failed | 54 passed (57)
```

Why: the old hard preset has no winning path, and the four-Up losing path ends earlier (tick 1) than recorded (tick 4).

---

## §US2-D `src/config/presets.ts` — four lines in `hard:` (T014)

| Find exactly | Replace with |
|---|---|
| `    lane(1, 'right', 1, 2, [0, 3, 6]),` | `    lane(1, 'right', 1, 2, [0, 6]),` |
| `    lane(2, 'left', 1, 2, [1, 4, 7]),` | `    lane(2, 'left', 1, 2, [1, 7]),` |
| `    lane(4, 'left', 1, 2, [2, 5, 8]),` | `    lane(4, 'left', 1, 2, [5, 8]),` |
| `    lane(5, 'right', 1, 2, [1, 4, 7]),` | `    lane(5, 'right', 1, 2, [1, 7]),` |

Careful: `lane(3, 'right', 2, 2, [0, 3, 6]),` in `hard:` also contains `[0, 3, 6]` and must **not** change. Only the row-1 line (which starts with `lane(1,`) changes.

After the edit the `hard:` block must read exactly:

```ts
  hard: [
    lane(1, 'right', 1, 2, [0, 6]),
    lane(2, 'left', 1, 2, [1, 7]),
    lane(3, 'right', 2, 2, [0, 3, 6]),
    lane(4, 'left', 1, 2, [5, 8]),
    lane(5, 'right', 1, 2, [1, 7]),
  ],
```

---

## §US2-E Expected after the change (T015)

All exit 0; `Test Files  7 passed (7)`, `Tests  57 passed (57)`; build ends with `built in`.

---

## §US2-F Commit C2 (T016)

```bash
git diff --stat
git add tests/fixtures/golden-paths.ts tests/reachability.test.ts src/config/presets.ts specs/003-review-fixes/run-log.md
git status --short
git commit -m "fix(presets): make the hard preset winnable" -m "Hard rows 1, 2, 4 and 5 move every tick and had one-cell gaps, so collision check B always hit and no winning path existed. Each of those rows loses one vehicle: [0, 6], [1, 7], [5, 8], [1, 7]. Row 3 is unchanged. Reachability and golden-path tests now cover all presets; shortest safe wins are 6, 11 and 15 actions."
git rev-parse --short HEAD
```

Record the SHA as `C2_SHA`.

---

## §US3-A Install Playwright (T017)

```bash
npm install --save-dev @playwright/test@^1.63.0
```

Expected: exit 0, `added 3 packages` (the number may differ by one or two if npm resolves a newer patch), `found 0 vulnerabilities`. `package.json` `devDependencies` gains `"@playwright/test": "^1.63.0"`; other versions stay the same. If `found N vulnerabilities` with high or critical, stop.

## §US3-B Install the browser (T018)

```bash
npx playwright install chromium
```

This downloads Chromium into the user's Playwright cache (outside the repository). Expected: exit 0. Do not add `channel: 'chrome'` or any other workaround if it fails.

## §US3-C npm scripts (T019)

```bash
npm pkg set "scripts.test:e2e=playwright test e2e/smoke.pw.ts"
npm pkg set "scripts.evidence:screenshots=playwright test e2e/evidence.pw.ts"
```

The `scripts` block of `package.json` must then be exactly:

```json
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "test": "vitest",
    "test:run": "vitest run",
    "typecheck": "tsc --noEmit",
    "preview": "vite preview",
    "test:e2e": "playwright test e2e/smoke.pw.ts",
    "evidence:screenshots": "playwright test e2e/evidence.pw.ts"
  },
```

If `npm pkg set` is unavailable or quoting fails in your shell, edit `package.json` by hand to match the block above.

## §US3-D `tsconfig.json` (T020)

Change the line

```json
  "include": ["src", "tests"]
```

to

```json
  "include": ["src", "tests", "e2e", "playwright.config.ts"]
```

No other change. `@types/node` is **not** needed.

## §US3-E `.gitignore` (T021)

Append these lines at the end of the file:

```text
test-results/
playwright-report/
blob-report/
playwright/.cache/
```

## §US3-F `playwright.config.ts` — create at the repository root (T022)

```ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.pw.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://localhost:4173',
    viewport: { width: 1280, height: 1000 },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
  },
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
```

Why `*.pw.ts`: Vitest runs every `*.test.ts` and `*.spec.ts`; the `.pw.ts` suffix keeps browser tests out of `npm run test:run`.

## §US3-G `e2e/support.ts` — create (T023)

```ts
import { expect, type Page } from '@playwright/test'
import type { GameStatus, PlayerAction } from '../src/game/state'

export const ACTION_KEYS: Readonly<Record<PlayerAction, string>> = {
  up: 'ArrowUp',
  down: 'ArrowDown',
  left: 'ArrowLeft',
  right: 'ArrowRight',
  wait: 'Space',
}

export interface BoardState {
  lives: number
  crossings: number
  crossingsToWin: number
  score: number
  tick: number
  status: GameStatus
}

/** Mirrors the accessible description that `src/main.ts` writes after every render. */
export function boardLabel(state: BoardState): string {
  return `Rush Hour Crossing. ${state.lives} lives, ${state.crossings} of ${state.crossingsToWin} crossings, score ${state.score}, tick ${state.tick}, status ${state.status}.`
}

export async function playActions(page: Page, actions: readonly PlayerAction[]): Promise<void> {
  for (const action of actions) {
    await page.keyboard.press(ACTION_KEYS[action])
  }
}

export async function expectBoard(page: Page, state: BoardState): Promise<void> {
  await expect(page.locator('#game-canvas')).toHaveAttribute('aria-label', boardLabel(state))
}
```

## §US3-H `e2e/smoke.pw.ts` — create (T024)

```ts
import { expect, test } from '@playwright/test'
import type { Difficulty } from '../src/game/state'
import { LOSING_PATHS, WINNING_PATHS } from '../tests/fixtures/golden-paths'
import { expectBoard, playActions } from './support'

const difficulties: readonly Difficulty[] = ['easy', 'normal', 'hard']

test.describe('browser smoke', () => {
  test('starts without console problems and focuses the board', async ({ page }) => {
    const problems: string[] = []
    page.on('console', (message) => {
      if (message.type() === 'error' || message.type() === 'warning') {
        problems.push(`${message.type()}: ${message.text()}`)
      }
    })
    page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`))

    await page.goto('/')

    await expect(page.locator('#game-canvas')).toBeFocused()
    await expect(page.locator('main')).toHaveCount(1)
    await expect(page.locator('#config-alert')).toBeHidden()
    await expectBoard(page, {
      lives: 3,
      crossings: 0,
      crossingsToWin: 3,
      score: 0,
      tick: 0,
      status: 'active',
    })
    expect(problems).toEqual([])
  })

  test('Tab moves visible keyboard focus to the board', async ({ page }) => {
    await page.goto('/')
    const board = page.locator('#game-canvas')
    await page.locator('h1').click()
    await expect(board).not.toBeFocused()

    await page.keyboard.press('Tab')

    await expect(board).toBeFocused()
    expect(await board.evaluate((canvas) => canvas.matches(':focus-visible'))).toBe(true)
  })

  test('Space waits one turn', async ({ page }) => {
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
  })

  test('an invalid configuration names every invalid field and uses defaults', async ({ page }) => {
    await page.goto('/?lives=0&crossingsToWin=11&difficulty=insane')

    await expect(page.locator('#config-alert')).toBeVisible()
    await expect(page.locator('#config-alert')).toHaveText(
      'Invalid configuration: lives, crossingsToWin, difficulty. All defaults are active.',
    )
    await expectBoard(page, {
      lives: 3,
      crossings: 0,
      crossingsToWin: 3,
      score: 0,
      tick: 0,
      status: 'active',
    })
  })

  for (const difficulty of difficulties) {
    test(`${difficulty}: a win locks input until R restarts`, async ({ page }) => {
      const golden = WINNING_PATHS[difficulty]
      const won = {
        lives: golden.finalLives,
        crossings: 1,
        crossingsToWin: 1,
        score: 100,
        tick: golden.finalTick,
        status: 'won',
      } as const
      await page.goto(`/?crossingsToWin=1&difficulty=${difficulty}`)

      await playActions(page, golden.actions)
      await expectBoard(page, won)

      await playActions(page, ['up', 'wait', 'left'])
      await expectBoard(page, won)

      await page.keyboard.press('r')
      await expectBoard(page, {
        lives: 3,
        crossings: 0,
        crossingsToWin: 1,
        score: 0,
        tick: 0,
        status: 'active',
      })
    })

    test(`${difficulty}: a loss locks input until R restarts`, async ({ page }) => {
      const golden = LOSING_PATHS[difficulty]
      const lost = {
        lives: golden.finalLives,
        crossings: 0,
        crossingsToWin: 1,
        score: 0,
        tick: golden.finalTick,
        status: 'lost',
      } as const
      await page.goto(`/?crossingsToWin=1&difficulty=${difficulty}`)

      await playActions(page, golden.actions)
      await expectBoard(page, lost)

      await playActions(page, ['up', 'wait', 'right'])
      await expectBoard(page, lost)

      await page.keyboard.press('r')
      await expectBoard(page, {
        lives: 3,
        crossings: 0,
        crossingsToWin: 1,
        score: 0,
        tick: 0,
        status: 'active',
      })
    })
  }
})
```

Why the focus test clicks `h1` first: in Chromium, `canvas.blur()` followed by Tab moves focus off the page, because focus navigation continues from the blurred canvas. Clicking the non-focusable title puts the starting point before the canvas. Do not "fix" this by using `blur()`.

## §US3-I `e2e/evidence.pw.ts` — create (T025)

```ts
import { expect, test, type Page } from '@playwright/test'
import { LOSING_PATHS, WINNING_PATHS } from '../tests/fixtures/golden-paths'
import { expectBoard, playActions } from './support'

const EVIDENCE_DIR = 'docs/evidence'

async function open(page: Page, url: string): Promise<void> {
  await page.goto(url)
  await page.waitForLoadState('networkidle')
}

async function capture(page: Page, file: string): Promise<void> {
  await page.screenshot({ path: `${EVIDENCE_DIR}/${file}`, fullPage: true })
}

test.describe('evidence screenshots', () => {
  test('active board, desktop', async ({ page }) => {
    await open(page, '/')
    await expectBoard(page, {
      lives: 3,
      crossings: 0,
      crossingsToWin: 3,
      score: 0,
      tick: 0,
      status: 'active',
    })
    await capture(page, 'active-desktop.png')
  })

  test('active board, 320 px wide', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 })
    await open(page, '/')
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBe(0)
    await capture(page, 'active-narrow-320.png')
  })

  test('keyboard focus', async ({ page }) => {
    await open(page, '/')
    const board = page.locator('#game-canvas')
    await page.locator('h1').click()
    await page.keyboard.press('Tab')
    await expect(board).toBeFocused()
    await capture(page, 'keyboard-focus.png')
  })

  test('invalid configuration (D5)', async ({ page }) => {
    await open(page, '/?lives=0&crossingsToWin=11&difficulty=insane')
    await expect(page.locator('#config-alert')).toBeVisible()
    await capture(page, 'd5-invalid-config.png')
  })

  test('E4 wrap case, normal preset at tick 4', async ({ page }) => {
    await open(page, '/')
    await playActions(page, ['wait', 'wait', 'wait', 'wait'])
    await expectBoard(page, {
      lives: 3,
      crossings: 0,
      crossingsToWin: 3,
      score: 0,
      tick: 4,
      status: 'active',
    })
    await capture(page, 'e4-wrap-normal-tick4.png')
  })

  const wins = [
    ['easy', 'd6-win.png'],
    ['normal', 'd6-win-normal.png'],
    ['hard', 'd6-win-hard.png'],
  ] as const

  for (const [difficulty, file] of wins) {
    test(`win (D6), ${difficulty}`, async ({ page }) => {
      const golden = WINNING_PATHS[difficulty]
      await open(page, `/?crossingsToWin=1&difficulty=${difficulty}`)
      await playActions(page, golden.actions)
      await expectBoard(page, {
        lives: golden.finalLives,
        crossings: 1,
        crossingsToWin: 1,
        score: 100,
        tick: golden.finalTick,
        status: 'won',
      })
      await capture(page, file)
    })
  }

  test('loss (D6), easy', async ({ page }) => {
    const golden = LOSING_PATHS.easy
    await open(page, '/?crossingsToWin=1&difficulty=easy')
    await playActions(page, golden.actions)
    await expectBoard(page, {
      lives: golden.finalLives,
      crossings: 0,
      crossingsToWin: 1,
      score: 0,
      tick: golden.finalTick,
      status: 'lost',
    })
    await capture(page, 'd6-loss.png')
  })
})
```

## §US3-J Expected checks (T026, T027)

```bash
npm run typecheck
npm run test:run
npm run build
npm run test:e2e
```

Expected:

- typecheck exit 0
- `Test Files  7 passed (7)`, `Tests  57 passed (57)` (still 7 files: Vitest ignored `e2e/`)
- build exit 0
- test:e2e prints `Running 10 tests using 1 worker`, ten `ok` lines, and `10 passed`. The ten titles are:

```text
browser smoke › starts without console problems and focuses the board
browser smoke › Tab moves visible keyboard focus to the board
browser smoke › Space waits one turn
browser smoke › an invalid configuration names every invalid field and uses defaults
browser smoke › easy: a win locks input until R restarts
browser smoke › easy: a loss locks input until R restarts
browser smoke › normal: a win locks input until R restarts
browser smoke › normal: a loss locks input until R restarts
browser smoke › hard: a win locks input until R restarts
browser smoke › hard: a loss locks input until R restarts
```

If a port error appears (`4173 is already in use`), stop other preview servers and re-run. Never change `src/` to make a smoke test pass.

## §US3-K Commit C3 (T028)

```bash
git status --short
git add package.json package-lock.json tsconfig.json .gitignore playwright.config.ts e2e/support.ts e2e/smoke.pw.ts e2e/evidence.pw.ts specs/003-review-fixes/run-log.md
git status --short
git commit -m "test(e2e): add a Playwright browser smoke test" -m "Adds @playwright/test as a dev dependency. npm run test:e2e builds the game, serves the production build and checks startup without console problems, keyboard focus, the invalid-config fallback, and win/loss input lock plus restart for every preset by replaying the shared golden paths. npm run evidence:screenshots regenerates the evidence images."
git rev-parse --short HEAD
```

Before the commit, `git status --short` must not list `docs/evidence/`, `test-results/`, or `dist/`. Record the SHA as **CODE_SHA** in `run-log.md`.

---

## §US4-A Current-state measurement on CODE_SHA (T029)

`git status --short` must show only `?? docs/WEEK_03_REPORT_ALEKSA_DURUTOVIC.md` and possibly ` M specs/003-review-fixes/run-log.md`. Then run, in order:

```bash
git rev-parse --short HEAD
npm ci
npm run typecheck
npm run test:run
npm run build
npm audit --audit-level=high
npm audit --json
npm run test:e2e
npx playwright --version
npm ls vite typescript vitest @playwright/test --depth=0
git diff --stat 26ae68b HEAD -- src
git diff 26ae68b HEAD -- src/style.css src/render src/main.ts index.html
```

Record for each: exit code and the key line. From `npm audit --json` record only the `metadata` object (vulnerability counts and `dependencies.total`; on 2026-09-26 the throwaway copy showed `total` 86).

Expected: every command exit 0; tests `57 passed (57)`; e2e `10 passed`; `git diff --stat 26ae68b HEAD -- src` lists only `src/config/presets.ts`; the last `git diff` prints nothing (render, styles, and main unchanged since `26ae68b`, which keeps the contrast table valid).

## §US4-B Evidence screenshots (T030)

```bash
npm run evidence:screenshots
git status --short docs/evidence
```

Expected: `9 passed`, and:

```text
 M docs/evidence/active-desktop.png
 M docs/evidence/active-narrow-320.png
 M docs/evidence/d5-invalid-config.png
 M docs/evidence/d6-loss.png
 M docs/evidence/d6-win.png
 M docs/evidence/e4-wrap-normal-tick4.png
 M docs/evidence/keyboard-focus.png
?? docs/evidence/d6-win-hard.png
?? docs/evidence/d6-win-normal.png
```

`baseline-active-normal.png` must not appear. If a PNG is byte-identical to before, git may not list it as modified; that is acceptable, record it.

## §US4-C Question for the student (T031)

Ask exactly:

> Please open these three files and answer yes/no for each:
> 1. `docs/evidence/active-desktop.png` — row 4 (purple, 4th row from the top) shows two separate two-cell vehicles, each with one dark windshield, and no three-cell shape.
> 2. `docs/evidence/e4-wrap-normal-tick4.png` — the header shows TICK 4; the row-2 (blue) vehicle is split across the left and right board edges with one windshield in total.
> 3. `docs/evidence/d6-win-hard.png` — the overlay says `CITY CROSSED!` and the header says HARD TRAFFIC.
> 4. Did both partners (Aleksa and Igor) agree to decisions DEC-1 to DEC-4 in `specs/003-review-fixes/spec.md` and to the constitution amendment 1.0.0 → 1.1.0?

Continue only if all four answers are "yes". Record the answers in `run-log.md`. If question 4 is "no", stop: the constitution and GAME_SPEC changes (C5) require the pair's agreement.

## §US4-D Commit C4 (T032)

```bash
git add docs/evidence/active-desktop.png docs/evidence/active-narrow-320.png docs/evidence/d5-invalid-config.png docs/evidence/d6-loss.png docs/evidence/d6-win.png docs/evidence/e4-wrap-normal-tick4.png docs/evidence/keyboard-focus.png docs/evidence/d6-win-hard.png docs/evidence/d6-win-normal.png specs/003-review-fixes/run-log.md
git commit -m "docs(evidence): regenerate screenshots from {{CODE_SHA}}" -m "Captured with npm run evidence:screenshots (Playwright, Chromium, 1280x1000, reduced motion) from the code at {{CODE_SHA}}. Adds D6 win screenshots for the normal and hard presets. The historical baseline-active-normal.png is unchanged."
```

Replace `{{CODE_SHA}}` in the command with the real short SHA before running it.

---

## §US4-E Constitution 1.0.0 → 1.1.0 (T033) — `.specify/memory/constitution.md`

**Edit 1.** Replace the whole comment block at the top (from `<!--` to `-->`, lines 1–11) with:

```markdown
<!--
Sync Impact Report
- Version change: 1.0.0 -> 1.1.0
- Modified principles: V. Configuration Outside Logic (adds the no-overlap and
  winnable-preset invariants after the third review)
- Added sections: none
- Removed sections: none
- Templates requiring updates: none
- Follow-up TODOs: none
-->
```

**Edit 2.** Replace this exact paragraph under `### V. Configuration Outside Logic`:

```markdown
Grid dimensions, starting values, difficulty presets, lane directions, speeds, vehicle
lengths, and placements MUST live in typed constants or configuration modules rather than
inside transition logic. Every preset MUST satisfy the non-blocking-lane invariant over
ticks 0 through 199.
```

with:

```markdown
Grid dimensions, starting values, difficulty presets, lane directions, speeds, vehicle
lengths, and placements MUST live in typed constants or configuration modules rather than
inside transition logic. Over ticks 0 through 199, every preset MUST satisfy the
non-blocking-lane invariant and the no-overlap invariant (no two vehicles of one lane share
a cell). Every preset MUST also allow a win from a fresh game without losing a life, and
an automated search MUST prove it.
```

**Edit 3.** Replace the last line:

```markdown
**Version**: 1.0.0 | **Ratified**: 2026-09-22 | **Last Amended**: 2026-09-22
```

with (use the real date, format `YYYY-MM-DD`):

```markdown
**Version**: 1.1.0 | **Ratified**: 2026-09-22 | **Last Amended**: {{DATE}}
```

No other line changes.

## §US4-F `docs/GAME_SPEC.md` (T034)

This file is in Serbian. Keep Serbian. Four edits, nothing else.

**Edit 1 — R3 row.** Replace:

```markdown
| **R3** | Saobraćaj je potpuno deterministički (bez RNG-a). Svaka traka ima smer, brzinu (pomera se jednom na `N` tickova, najviše 1 polje po pomeranju) i vozila jedne dužine. Vozilo koje izađe sa jedne ivice ulazi sa suprotne (wrap-around). Nijedna traka ni u jednom tick-u nije potpuno blokirana. |
```

with:

```markdown
| **R3** | Saobraćaj je potpuno deterministički (bez RNG-a). Svaka traka ima smer, brzinu (pomera se jednom na `N` tickova, najviše 1 polje po pomeranju) i vozila jedne dužine. Vozilo koje izađe sa jedne ivice ulazi sa suprotne (wrap-around). Nijedna traka ni u jednom tick-u nije potpuno blokirana. Dva vozila iste trake nikada ne dele isto polje. |
```

**Edit 2 — invariants line.** Replace:

```markdown
**Invarijante:** isti config + isti niz akcija daje identičan ishod; `lives` nikad ne pada ispod 0; broj prelazaka nikad ne opada.
```

with:

```markdown
**Invarijante:** isti config + isti niz akcija daje identičan ishod; `lives` nikad ne pada ispod 0; broj prelazaka nikad ne opada; u svakom difficulty presetu pobeda je dostižna bez gubitka života, a poraz je dostižan.
```

**Edit 3 — D4.** Replace the two D4 lines:

```markdown
- [x] **D4** Za sva tri difficulty preseta nijedna traka nije potpuno blokirana ni u jednom tick-u 0..199 (test).
  - Dokaz: `tests/presets.test.ts` → *never-blocked traffic lanes through tick 199* za `easy`, `normal` i `hard`.
```

with:

```markdown
- [x] **D4** Za sva tri difficulty preseta nijedna traka nije potpuno blokirana i nijedna dva vozila iste trake ne dele polje ni u jednom tick-u 0..199 (test).
  - Dokaz: `tests/presets.test.ts` → *never-blocked traffic lanes through tick 199* i *never places two vehicles of one lane on the same cell through tick 199* za `easy`, `normal` i `hard`.
```

**Edit 4 — D6.** Replace the two D6 lines (the line starting `- [x] **D6**` and the following `  - Dokaz:` line, which ends with `→ *Known limitations*).`) with:

```markdown
- [x] **D6** Pobeda i poraz su dostižni odigravanjem u sva tri difficulty preseta (test, automatizovani browser test i screenshot).
  - Dokaz: `tests/reachability.test.ts` (pretraga nalazi pobedu bez gubitka života — najkraće 6 / 11 / 15 poteza za `easy` / `normal` / `hard` — i poraz; snimljene putanje iz `tests/fixtures/golden-paths.ts` pobeđuju i gube), `e2e/smoke.pw.ts` (iste putanje u pravom browseru, zaključan input posle kraja i restart sa `R`; `npm run test:e2e`), `tests/end-message.test.ts` (tekst poruke odgovara statusu); screenshotovi `docs/evidence/d6-win.png`, `docs/evidence/d6-win-normal.png`, `docs/evidence/d6-win-hard.png` i `docs/evidence/d6-loss.png`; zapis u `EVIDENCE_003.md` → *Part 1 — Current state* → *Browser checks*.
```

Leave D1–D3, D5, D7, D8 unchanged.

## §US4-G `docs/AI_USAGE_LOG.md` — append at the end (T035)

```markdown

## Third review corrections — {{DATE}}

- **Why AI was involved**: The third review asked for a winnable fix of the normal row-4 overlap, a fix of the unwinnable hard preset, Definition of Done alignment, an automated browser smoke test, and evidence regenerated from one commit. Claude Code (Opus 5.5) measured the presets and wrote the Spec Kit plan in `specs/003-review-fixes/` on 2026-09-26; OpenAI Codex ({{CODEX_MODEL}}) implemented it task by task.
- **Measured before planning**: a temporary exhaustive search (not committed) confirmed shortest safe wins of 6 / 11 / none for easy / normal / hard and scored every non-overlapping row-4 alternative (`specs/003-review-fixes/research.md`).
- **Decisions recorded (student pair)**: normal row 4 starts `[0, 4]` (DEC-1); hard rows 1, 2, 4, 5 each lose one vehicle so hard is winnable (DEC-2); Playwright as a new dev dependency for the browser smoke test (DEC-3); one Spec Kit feature, one commit per correction on branch `003-review-fixes`, merged into `main` only by the student (DEC-4); `GAME_SPEC.md` R3, D4, D6 and constitution principle V (1.0.0 → 1.1.0) extended with the no-overlap and winnable-preset invariants.
- **Verification signal**: before each preset change the new tests failed (`{{US1_FAIL_SUMMARY}}`; `{{US2_FAIL_SUMMARY}}`) and passed after it. On `{{CODE_SHA}}`: typecheck, 7 files / 57 tests, build, audit (0 vulnerabilities across {{AUDIT_DEPS}} dependencies), and 10/10 Playwright smoke scenarios pass. Screenshots were regenerated from `{{CODE_SHA}}` and confirmed by the student.
```

`{{US1_FAIL_SUMMARY}}` is the line `Tests  2 failed | 50 passed (52)` from `run-log.md`, `{{US2_FAIL_SUMMARY}}` is `Tests  3 failed | 54 passed (57)`, trimmed of leading spaces.

## §US4-H Commit C5 (T036)

```bash
git add .specify/memory/constitution.md docs/GAME_SPEC.md docs/AI_USAGE_LOG.md
git commit -m "docs: record the review fixes in the spec and constitution" -m "GAME_SPEC R3, D4 and D6 and constitution principle V (1.0.0 -> 1.1.0) now require non-overlapping vehicles and a reachable win in every preset. The pair decision is recorded in AI_USAGE_LOG."
```

---

## §US4-I `docs/EVALS.md` (T037)

**Edit 1.** Replace the second paragraph (the one that starts `Expectations in E1–E3 were recorded on 2026-09-22`) with:

```markdown
Expectations in E1–E3 were recorded on 2026-09-22 before gameplay implementation. Results must be appended without rewriting these expectations. **Current result** is the only result that describes the project now ({{DATE}}, code at `{{CODE_SHA}}`). All earlier results, including the one dated 2026-09-23, are the historical record.
```

**Edit 2.** In each of E1, E2, E3, E4, change the label of the existing current result from `**Current result:**` to `**Result on 2026-09-23 (code at `26ae68b`):**`. Do not change the text after the label.

**Edit 3.** Directly after that relabelled paragraph, add a new paragraph in each eval:

E1:

```markdown
**Current result:** PASS. The unchanged 100-run determinism test in `tests/turn.test.ts` passes on `{{CODE_SHA}}`. The final state is still tick 6, player `(5, 6)`, 1 life, 0 crossings, status `active`: the sequence only enters rows 5 and 6, and neither row changed in the normal preset.
```

E2:

```markdown
**Current result:** PASS. The unchanged boundary test in `tests/turn.test.ts` passes on `{{CODE_SHA}}`: position `(4, 6)`, tick 1, 3 lives, status `active`.
```

E3:

```markdown
**Current result:** PASS. The config suite passes on `{{CODE_SHA}}`. The browser smoke test *an invalid configuration names every invalid field and uses defaults* (`npm run test:e2e`) finds the alert `Invalid configuration: lives, crossingsToWin, difficulty. All defaults are active.` and the default state ([`evidence/d5-invalid-config.png`](evidence/d5-invalid-config.png), regenerated from `{{CODE_SHA}}`).
```

E4:

```markdown
**Current result:** PASS for every lane of every preset. Normal row 4 now starts at `[0, 4]` (`{{C1_SHA}}`), so its two vehicles never share a cell; `tests/presets.test.ts` → *never places two vehicles of one lane on the same cell through tick 199* passes for all presets. In [`evidence/active-desktop.png`](evidence/active-desktop.png) row 4 shows two separate two-cell vehicles, each with one windshield. At tick 4 the row-2 vehicle crossing the board edge is still drawn as two edge segments with one windshield in total ([`evidence/e4-wrap-normal-tick4.png`](evidence/e4-wrap-normal-tick4.png)). The normal preset is still won in 11 actions at best (`tests/reachability.test.ts`). The renderer was not changed. Both images were regenerated from `{{CODE_SHA}}`.
```

## §US4-J `docs/EVIDENCE_003.md` — intro and Part 1 (T038)

**Edit 1.** In the intro list at the top, replace item 1 with:

```markdown
1. **Current state.** The only evidence that describes the project as it is now. Every result was produced on {{DATE}} from the code at commit `{{CODE_SHA}}`. Later commits change documentation and evidence files only.
```

**Edit 2.** Replace everything from the line `# Part 1 — Current state (verified 2026-09-23, code at `26ae68b`)` up to, but not including, the `---` line that precedes `# Part 2 — Development history`, with the block below. Keep the `## Contrast` table and the `## Visual asset` section text from the old Part 1 exactly as they were; they are reproduced here for placement.

````markdown
# Part 1 — Current state (verified {{DATE}}, code at `{{CODE_SHA}}`)

## Environment

- Node.js `{{NODE_VERSION}}`, npm `{{NPM_VERSION}}` (pinned by `.nvmrc` and `package.json` `engines`)
- Vite `{{VITE_VERSION}}`, TypeScript `{{TS_VERSION}}`, Vitest `{{VITEST_VERSION}}`, Playwright `{{PW_VERSION}}` with its bundled Chromium
- Windows 11

## Automated checks

All commands were run in sequence from a clean `npm ci` on `{{CODE_SHA}}`, with no dev server running.

| Command | Exit | Actual result |
|---|---:|---|
| `npm ci` | {{EXIT}} | {{NPM_CI_RESULT}} |
| `npm run typecheck` | {{EXIT}} | {{TYPECHECK_RESULT}} |
| `npm run test:run` | {{EXIT}} | {{TEST_RESULT}} |
| `npm run build` | {{EXIT}} | {{BUILD_RESULT}} |
| `npm audit --audit-level=high` | {{EXIT}} | {{AUDIT_RESULT}} |
| `npm run test:e2e` | {{EXIT}} | {{E2E_RESULT}} |

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

"Smoke N" is the N-th test in the order Playwright lists them (see `specs/003-review-fixes/contracts/browser-smoke.md`). Each screenshot was reviewed by the student ({{DATE}}).

## Contrast

(Paste the unchanged `## Contrast` section from the old Part 1 here, then add this sentence at its end:)

`src/style.css`, `src/render/`, and `src/main.ts` are unchanged between `26ae68b` and `{{CODE_SHA}}` (`git diff` is empty), so these ratios still apply.

## Evals

E1–E4 were repeated against `{{CODE_SHA}}` and all pass, with no exception. The results are in [`EVALS.md`](EVALS.md) under **Current result**.

## Definition of Done

D1–D8 in `docs/GAME_SPEC.md` link to the rows above and to the tests that prove them. D4 and D6 were extended after the third review: D4 now includes the no-overlap invariant, and D6 covers all three presets.

## Visual asset

(Paste the unchanged `## Visual asset` section from the old Part 1 here.)

## Known limitations

- Visual acceptance of the screenshots is a manual review by the student. There is no automated screenshot-comparison test.
- The browser smoke test runs locally in Playwright's Chromium only. There is no CI and no other browser.
- The reduced-motion and motion-allowed checks of the turn flash were last measured on 2026-09-23 (`26ae68b`) and were not repeated. The code they depend on (`src/style.css`, `src/main.ts`) has not changed since.
- Contrast over the bitmap backdrop is measured against its base colour, not per pixel.
- The recorded golden paths and shortest safe wins (6 / 11 / 15) are tied to the current rules and presets. Any preset change must re-measure them; see `specs/003-review-fixes/contracts/preset-invariants.md`.
- The hard preset is proven winnable by search, not play-tested for how hard it feels.
````

When you paste the Contrast and Visual asset sections, remove the two lines in parentheses.

Fill the placeholders from `run-log.md`:

- `{{NODE_VERSION}}`, `{{NPM_VERSION}}`: `node -v` (without the leading v) and `npm -v` from the Environment block of `run-log.md`.
- `{{VITE_VERSION}}`, `{{TS_VERSION}}`, `{{VITEST_VERSION}}`, `{{PW_VERSION}}`: the versions printed by `npm ls vite typescript vitest @playwright/test --depth=0` (§US4-A).
- `{{DATE}}`: the date of the T029 run, format `YYYY-MM-DD`. `{{CODE_SHA}}`, `{{C1_SHA}}`, `{{C2_SHA}}`: from `run-log.md`. `{{AUDIT_DEPS}}`: `metadata.dependencies.total` from `npm audit --json`.
- `{{EXIT}}`: the exit code of that row's command (0 expected).
- `{{NPM_CI_RESULT}}`: e.g. `Installed from package-lock.json; found 0 vulnerabilities`
- `{{TYPECHECK_RESULT}}`: `tsc --noEmit completed without diagnostics`
- `{{TEST_RESULT}}`: e.g. `7 test files, 57 tests passed`
- `{{BUILD_RESULT}}`: e.g. `Vite <version>, <N> modules transformed, production build completed` — read N from the build output line `✓ N modules transformed.`
- `{{AUDIT_RESULT}}`: e.g. `0 vulnerabilities (info 0, low 0, moderate 0, high 0, critical 0) across <total> dependencies` from `npm audit --json` metadata
- `{{E2E_RESULT}}`: e.g. `10 passed (Chromium, 1 worker)`

## §US4-K `docs/EVIDENCE_003.md` — Part 2 additions (T039)

**Edit 1.** Insert this section immediately before the line `## Git preservation`:

```markdown
## Corrections after the third review ({{DATE}})

The plan, measured alternatives, and exact tasks are in `specs/003-review-fixes/`. Each correction is one commit on branch `003-review-fixes`.

### Normal row 4 overlap (`{{C1_SHA}}`)

- **Claim:** Normal row 4 can be made overlap-free without making the normal preset harder to win.
- **Signal:** In every tick 0–199, the vehicle starting at 8 wrapped into column 0 and shared that cell with the vehicle starting at 0 (E4 FAIL for this row).
- **Hypothesis:** Removing only the overlapping vehicle (starts `[0, 4, 8]` → `[0, 4]`) removes the overlap and keeps a two-cell or wider gap, so collision check B does not block the lane.
- **Smallest change:** One line in `src/config/presets.ts`. Direction, speed, and length unchanged.
- **Check:** New tests first: no-overlap for all presets, reachability and recorded paths for easy and normal. Before the change: `{{US1_FAIL_SUMMARY}}` (normal overlap and the new normal winning path). After: 52/52.
- **Result:** Supported. No overlap in any lane; the shortest safe normal win is still 11 actions.
- **Limitation:** Row 4 now has two vehicles instead of three visible bodies; its occupied cells per tick drop from five to four.

### Hard preset unwinnable (`{{C2_SHA}}`)

- **Claim:** Hard can be made winnable while staying the hardest preset.
- **Signal:** An exhaustive search found no winning path; rows 1, 2, 4, 5 move every tick with one-cell gaps, so collision check B always hits.
- **Hypothesis:** Removing one vehicle from each of those four rows creates gaps that a player can use; row 3 (every two ticks) can stay.
- **Smallest change:** Four lines in `src/config/presets.ts`: `[0, 6]`, `[1, 7]`, `[5, 8]`, `[1, 7]`. A search over all one-vehicle removals showed that every winnable variant needs all four removals; this variant has the longest shortest win.
- **Check:** Reachability and recorded-path tests extended to hard, plus an order test (easy < normal < hard). Before the change: `{{US2_FAIL_SUMMARY}}`. After: 57/57.
- **Result:** Supported. Shortest safe wins are 6 / 11 / 15 actions.
- **Limitation:** Difficulty is measured by the shortest path length, not by play-testing.

### Automated browser smoke test (`{{CODE_SHA}}`)

- **Claim:** Startup, focus, configuration fallback, and win/loss lock with restart can be verified automatically in a real browser.
- **Signal:** These checks were scripted by hand for each review and were not repeatable by the reviewer.
- **Change:** Playwright dev dependency; `npm run test:e2e` with 10 scenarios that replay the same golden paths as the unit tests; `npm run evidence:screenshots` regenerates the images in this document.
- **Result:** 10/10 pass on `{{CODE_SHA}}`.
- **Limitation:** Chromium only, local only.
```

**Edit 2.** In the `## Git preservation` table, replace the row

```markdown
| Code verified in Part 1 | `26ae68b` |
```

with these rows:

```markdown
| Code verified on 2026-09-23 | `26ae68b` |
| Normal row 4 fix | `{{C1_SHA}}` |
| Hard preset fix | `{{C2_SHA}}` |
| Browser smoke test; code verified in Part 1 | `{{CODE_SHA}}` |
```

**Edit 3.** Under `## Partner contributions`, insert this block immediately before `### Demonstration`:

```markdown
### After the third review ({{DATE}})

- **Aleksa** — reviewed the third review, chose the fixes (normal row 4 `[0, 4]`, a winnable hard preset, Playwright), reviewed the Spec Kit plan in `specs/003-review-fixes/` before implementation, and confirmed the regenerated screenshots. The implementation followed that plan with OpenAI Codex ({{CODEX_MODEL}}), as recorded in `AI_USAGE_LOG.md`.
```

Do not invent a contribution for Igor. If the student names one, add it as a second bullet with the student's own wording.

## §US4-L1 `security.md` (T040)

1. In the Project table, replace the Stack row value with `Vite {{VITE_VERSION}}, TypeScript {{TS_VERSION}}, Vitest {{VITEST_VERSION}}, Canvas 2D; Playwright {{PW_VERSION}} (development only)`, and the `Last updated` value with `{{DATE}}`.
2. In the dependency audit table, change the existing row label `Current check` to `Historical`, and insert above it:

```markdown
| Current check | {{DATE}} | Branch `003-review-fixes`, code at `{{CODE_SHA}}`, after a clean `npm ci` | Exit 0; 0 vulnerabilities (info 0, low 0, moderate 0, high 0, critical 0) across {{AUDIT_DEPS}} dependencies |
```

3. Add this subsection after the `### Dependency audit` table paragraph (`Historical rows describe …`):

```markdown
### Development dependency: Playwright

- `@playwright/test` is a dev dependency used only by `npm run test:e2e` and `npm run evidence:screenshots`. It is not imported by `src/` and is not part of the production build in `dist/`.
- The tests open only `http://localhost:4173`, served by `vite preview` from the local build. They make no request to any other host.
- `npx playwright install chromium` downloads a browser binary from the Playwright download servers into the user's cache, outside the repository. It is a one-time development step.
```

4. Under `## Known limitations`, add the bullet:

```markdown
- The browser used by the smoke test is downloaded by Playwright at development time; its integrity relies on Playwright's own download checks.
```

## §US4-L2 `README.md` (T041)

1. In `## Commands`, after the line for `npm run typecheck`, add:

```markdown
- `npx playwright install chromium` — one-time download of the browser used by the browser tests
- `npm run test:e2e` — build the game and run the browser smoke test (startup, focus, invalid configuration, win/loss input lock, restart)
- `npm run evidence:screenshots` — regenerate the evidence screenshots in `docs/evidence/`
```

2. In `## Project status`, append this sentence to the paragraph: `Corrections from the third review (non-overlapping and winnable presets, browser smoke test) are specified in `specs/003-review-fixes/`.`

## §US4-L3 `AGENTS.md` and spec status (T042)

1. In `## Sources of truth, in priority order`, insert a new item 5 and renumber the manifest item to 6:

```markdown
5. `specs/003-review-fixes/` — accepted corrections after the third review: preset invariants (no overlap, winnable), golden paths, and the browser smoke test. It changes preset data and tests only.
6. `docs/CONTEXT_MANIFEST.md` — which context is included and which is deliberately excluded.
```

2. In `## Architecture boundaries`, add a last bullet:

```markdown
- `tests/` — Vitest unit tests; `tests/fixtures/golden-paths.ts` holds the recorded paths. `e2e/` — Playwright browser tests (`*.pw.ts`). Keep the two separate.
```

3. Replace the checks code block under `## Checks before every commit` with:

````markdown
```bash
npm ci
npm run typecheck
npm run test:run
npm run build
npm audit --audit-level=high
npx playwright install chromium   # once per machine
npm run test:e2e
```
````

4. In `specs/003-review-fixes/spec.md`, change the line `**Status**: Draft — awaiting student review before implementation` to `**Status**: Accepted — third-review corrections`.

## §US4-L4 `docs/CONTEXT_MANIFEST.md` (T043)

Insert these two rows directly after the `AGENTS.md` row:

```markdown
| `specs/003-review-fixes/` | Yes, for the third-review corrections | Student decisions DEC-1–DEC-4, measured preset numbers, exact tasks and file contents | 2 | Numbers and golden paths are tied to the current rules and presets; a rule or preset change invalidates them |
| `e2e/`, `playwright.config.ts` | Yes | Browser smoke test and evidence capture | 3 | The tests read the Canvas accessible description; changing that text in `src/main.ts` breaks them |
```

---

## §US4-M Final verification (T044)

Run and check each:

1. No placeholder left:

   ```bash
   git grep -n "{{" -- docs README.md AGENTS.md security.md .specify/memory/constitution.md
   ```

   Expected: no output.

2. No stale current claim. Open `docs/EVIDENCE_003.md` Part 1 and `docs/GAME_SPEC.md`: the words `unwinnable`, `cannot be won`, and `Known limitations` in D6 must not appear; the word `overlap` may appear only in sentences that say the overlap is gone. In `docs/EVALS.md`, every `**Current result:**` paragraph must say PASS. Part 2 of the evidence and older eval results may still describe the old problems; do not edit them.

3. Only preset data changed in `src/`:

   ```bash
   git diff --stat 26ae68b HEAD -- src
   ```

   Expected: only `src/config/presets.ts`.

4. Full checks again:

   ```bash
   npm run typecheck
   npm run test:run
   npm run build
   npm run test:e2e
   ```

   Expected: exit 0, 57/57, build ok, 10 passed.

5. `git status --short` lists only files allowed in Phase 6 plus `?? docs/WEEK_03_REPORT_ALEKSA_DURUTOVIC.md`.

## §US4-N Commit C6 (T044)

```bash
git add docs/EVALS.md docs/EVIDENCE_003.md security.md README.md AGENTS.md docs/CONTEXT_MANIFEST.md specs/003-review-fixes/spec.md specs/003-review-fixes/tasks.md specs/003-review-fixes/run-log.md
git status --short
git commit -m "docs: regenerate current evidence and evals from {{CODE_SHA}}" -m "EVIDENCE_003 Part 1, EVALS current results, security audit, README, AGENTS and the context manifest now describe the code at {{CODE_SHA}}. Part 2 records claim, signal, change and result for the three third-review corrections."
```

Replace `{{CODE_SHA}}` in the command with the real SHA.

---

## §5 Final report (T045)

```bash
git log --oneline main..003-review-fixes
git status --short
```

Report to the student, in this order:

1. The list of commits from the command above (expected 7: C0–C6).
2. Test counts: before 43, after US1 52, after US2 57; e2e 10/10.
3. CODE_SHA and the date of the evidence.
4. Anything that did not match this guide, with the actual output.
5. The sentence: "Nothing was merged into `main` and nothing was pushed. To deliver, the student reviews the branch and merges it into `main`."

Then stop.
