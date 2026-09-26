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
