# Quickstart: Voxel Night City Validation

## Prerequisites

- Node.js 24 or newer and npm 11 or newer (`.nvmrc`, `package.json` `engines`).
- Install project dependencies with `npm ci`.

## Automated regression validation

1. Run `npm run typecheck`.
2. Run `npm run test:run`.
3. Run `npm run build`.
4. Run `npm audit --audit-level=high`.

All commands must complete successfully. Existing deterministic logic and URL-configuration tests must remain unchanged in intent.

## Browser visual validation

1. Run `npm run dev` and open the displayed local URL at desktop width.
2. Confirm active state contains the required HUD, board elements, and controls; capture a screenshot.
3. Tab or focus the board and confirm a visible focus indicator. Use movement, wait, and restart keys.
4. Open a narrow viewport of at least 320 pixels and confirm no horizontal page overflow; capture a screenshot.
5. Reach a win or loss state with an existing deterministic configuration and capture a screenshot.
6. Enable reduced motion in browser/device settings and confirm a turn remains understandable without non-essential motion.
7. Open an invalid configuration URL and confirm the fallback message is visible.
