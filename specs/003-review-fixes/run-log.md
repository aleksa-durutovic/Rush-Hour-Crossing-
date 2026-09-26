# Run Log — 003 Review Fixes

Real command output recorded during implementation. Source for `EVIDENCE_003.md`, `EVALS.md`, and `AI_USAGE_LOG.md`.

## Environment

- Date: 2026-09-26
- Implementing agent / model: GPT-6
- `node -v`: v24.14.0
- `npm -v`: 11.12.1
- Start commit (`git rev-parse --short HEAD`): 0330746

## Before any change

| Command | Exit | Key output |
|---|---:|---|
| `npm ci` | 0 | `added 39 packages, and audited 40 packages in 3s`; `found 0 vulnerabilities` |
| `npm run typecheck` | 0 | `> tsc --noEmit` |
| `npm run test:run` | 0 | `Test Files  7 passed (7)`; `Tests  43 passed (43)` |
| `npm run build` | 0 | `vite v8.3.0 building client environment for production...`; `✓ built in 764ms` |

## US1 — failing before change

```text
typecheck exit: 0
 FAIL  tests/presets.test.ts > difficulty presets > normal never places two vehicles of one lane on the same cell through tick 199
 FAIL  tests/reachability.test.ts > recorded golden paths > the recorded winning path wins normal
 Test Files  2 failed | 5 passed (7)
      Tests  2 failed | 50 passed (52)
```

## US1 — after change

| Command | Exit | Key output |
|---|---:|---|
| `npm run typecheck` | 0 | `> tsc --noEmit` |
| `npm run test:run` | 0 | `Test Files  7 passed (7)`; `Tests  52 passed (52)` |
| `npm run build` | 0 | `vite v8.3.0 building client environment for production...`; `✓ built in 128ms` |

- C1_SHA: 7ae37c5

## US2 — failing before change

```text
typecheck exit: 0
 FAIL  tests/reachability.test.ts > real preset reachability > hard can be won without losing a life
 FAIL  tests/reachability.test.ts > recorded golden paths > the recorded winning path wins hard
 FAIL  tests/reachability.test.ts > recorded golden paths > the recorded losing path loses hard
 Test Files  1 failed | 6 passed (7)
      Tests  3 failed | 54 passed (57)
```

## US2 — after change

| Command | Exit | Key output |
|---|---:|---|
| `npm run typecheck` | 0 | `> tsc --noEmit` |
| `npm run test:run` | 0 | `Test Files  7 passed (7)`; `Tests  57 passed (57)` |
| `npm run build` | 0 | `vite v8.3.0 building client environment for production...`; `✓ built in 127ms` |

- C2_SHA: 6e5edbb

## US3

| Command | Exit | Key output |
|---|---:|---|
| `npm install --save-dev @playwright/test@^1.63.0` | 0 | `added 3 packages, and audited 43 packages in 2s`; `found 0 vulnerabilities`; package version `"^1.63.0"` |
| `npx playwright install chromium` | 0 | (no output) |
| `npm pkg set "scripts.test:e2e=playwright test e2e/smoke.pw.ts"` | 0 | (no output) |
| `npm pkg set "scripts.evidence:screenshots=playwright test e2e/evidence.pw.ts"` | 0 | (no output) |
| `npm run typecheck` | 0 | `> tsc --noEmit` |
| `npm run test:run` | 0 | `Test Files  7 passed (7)`; `Tests  57 passed (57)` |
| `npm run build` | 0 | `vite v8.3.0 building client environment for production...`; `✓ built in 129ms` |
| `npm run test:e2e` | 0 | `Running 10 tests using 1 worker`; `10 passed (5.9s)` |

Playwright test lines:

```text
  ok  1 e2e\smoke.pw.ts:9:3 › browser smoke › starts without console problems and focuses the board (607ms)
  ok  2 e2e\smoke.pw.ts:34:3 › browser smoke › Tab moves visible keyboard focus to the board (220ms)
  ok  3 e2e\smoke.pw.ts:46:3 › browser smoke › Space waits one turn (146ms)
  ok  4 e2e\smoke.pw.ts:61:3 › browser smoke › an invalid configuration names every invalid field and uses defaults (153ms)
  ok  5 e2e\smoke.pw.ts:79:5 › browser smoke › easy: a win locks input until R restarts (175ms)
  ok  6 e2e\smoke.pw.ts:108:5 › browser smoke › easy: a loss locks input until R restarts (165ms)
  ok  7 e2e\smoke.pw.ts:79:5 › browser smoke › normal: a win locks input until R restarts (182ms)
  ok  8 e2e\smoke.pw.ts:108:5 › browser smoke › normal: a loss locks input until R restarts (173ms)
  ok  9 e2e\smoke.pw.ts:79:5 › browser smoke › hard: a win locks input until R restarts (190ms)
  ok 10 e2e\smoke.pw.ts:108:5 › browser smoke › hard: a loss locks input until R restarts (168ms)
```

- CODE_SHA (commit C3): 2c1b3b1

## Current state (CODE_SHA)

| Command | Exit | Key output |
|---|---:|---|
| `git rev-parse --short HEAD` | 0 | `2c1b3b1` |
| `npm ci` | 0 | `added 42 packages, and audited 43 packages in 2s`; `found 0 vulnerabilities` |
| `npm run typecheck` | 0 | `> tsc --noEmit` |
| `npm run test:run` | 0 | `Test Files  7 passed (7)`; `Tests  57 passed (57)` |
| `npm run build` | 0 | `vite v8.3.0 building client environment for production...`; `✓ 14 modules transformed.`; `✓ built in 446ms` |
| `npm audit --audit-level=high` | 0 | `found 0 vulnerabilities` |
| `npm audit --json` | 0 | Metadata: vulnerabilities info 0, low 0, moderate 0, high 0, critical 0, total 0; dependencies prod 1, dev 86, optional 47, peer 0, peerOptional 0, total 86 |
| `npm run test:e2e` | 0 | `Running 10 tests using 1 worker`; `10 passed (4.6s)` |
| `npx playwright --version` | 0 | `Version 1.63.0` |
| `npm ls vite typescript vitest @playwright/test --depth=0` | 0 | `@playwright/test@1.63.0`; `typescript@7.0.2`; `vite@8.3.0`; `vitest@5.0.1` |
| `git diff --stat 26ae68b HEAD -- src` | 0 | `src/config/presets.ts | 10 +++++-----`; `1 file changed, 5 insertions(+), 5 deletions(-)` |
| `git diff 26ae68b HEAD -- src/style.css src/render src/main.ts index.html` | 0 | (no output) |

- Versions (`npm ls vite typescript vitest @playwright/test --depth=0`): `@playwright/test@1.63.0`, `typescript@7.0.2`, `vite@8.3.0`, `vitest@5.0.1`
- `npx playwright --version`: `Version 1.63.0`
- `npm audit --json` metadata: vulnerabilities total 0; dependencies total 86

## Evidence screenshots

- `npm run evidence:screenshots` summary: `9 passed (10.4s)`
- Files changed: `active-desktop.png`, `active-narrow-320.png`, `d5-invalid-config.png`, `d6-loss.png`, `d6-win.png`, `e4-wrap-normal-tick4.png`, `keyboard-focus.png` modified; `d6-win-hard.png` and `d6-win-normal.png` new. `baseline-active-normal.png` not listed.
- Student visual confirmation (T031): 1 yes; 2 yes; 3 yes; 4 yes. Student confirmed row 4 shows two separate two-cell vehicles with one windshield each; E4 shows TICK 4 and the wrapped blue vehicle split across both edges with one windshield total; the hard win screenshot says `CITY CROSSED!` and `HARD TRAFFIC`; Aleksa and Igor agreed to DEC-1–DEC-4 and the constitution amendment 1.0.0 → 1.1.0.

## Notes

### T001 — starting point (passed)

Expected: branch `003-review-fixes`; latest commit `<sha> docs(spec): add 003 review-fixes specification`; status contains only `?? docs/WEEK_03_REPORT_ALEKSA_DURUTOVIC.md`.

Actual command outputs:

```text
git branch --show-current
003-review-fixes

git log --oneline -1
0330746 docs(spec): add 003 review-fixes specification

git status --short
warning: unable to access 'C:\Users\AleksA/.config/git/ignore': Permission denied
warning: unable to access 'C:\Users\AleksA/.config/git/ignore': Permission denied
?? docs/WEEK_03_REPORT_ALEKSA_DURUTOVIC.md
```

The status content matched §0. The two permission warnings were a sandbox limitation and do not change the T001 result; T001 is treated as passed per the student's instruction.
