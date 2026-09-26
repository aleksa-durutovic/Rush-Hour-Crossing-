# Quickstart: Verify the Third-Review Corrections

Run from the repository root on branch `003-review-fixes`, after task T044.

## Prerequisites

- Node.js 24+, npm 11+ (`node -v`, `npm -v`)
- No server running on port 4173
- Playwright Chromium installed once: `npx playwright install chromium`

## 1. Automated checks

| Command | Expected |
|---|---|
| `npm ci` | exit 0, `found 0 vulnerabilities` |
| `npm run typecheck` | exit 0, no output after the script header |
| `npm run test:run` | `Test Files  7 passed (7)`, `Tests  57 passed (57)` |
| `npm run build` | exit 0, `built in …` |
| `npm audit --audit-level=high` | exit 0, `found 0 vulnerabilities` |
| `npm run test:e2e` | `10 passed` |

## 2. Test-first evidence

The failing test output observed before each preset change (tasks T006 and T013) is recorded in `docs/EVIDENCE_003.md` Part 2. It is not re-run here.

## 3. Manual look (2 minutes)

1. `npm run dev`, open the printed URL.
2. Default (normal) board, tick 0: row 4 (purple, moving left) shows **two** separate two-cell vehicles, each with one windshield. Compare with `docs/evidence/baseline-active-normal.png` (historical).
3. Open `/?crossingsToWin=1&difficulty=hard` and type: ↑ ↓ Space Space Space ← ↑ ↑ ↑ ↑ ← ← ← ↑ ↑. The overlay shows `CITY CROSSED!` at tick 15.
4. Press W: nothing changes. Press R: tick 0, `active`.

## 4. Evidence images

`npm run evidence:screenshots` → `9 passed` and these files updated: `active-desktop.png`, `active-narrow-320.png`, `keyboard-focus.png`, `d5-invalid-config.png`, `e4-wrap-normal-tick4.png`, `d6-win.png`, `d6-win-normal.png`, `d6-win-hard.png`, `d6-loss.png`. `baseline-active-normal.png` is not touched.

Contracts: [preset-invariants.md](contracts/preset-invariants.md), [browser-smoke.md](contracts/browser-smoke.md).
