# Quickstart Validation: Rush Hour Crossing

## Prerequisites

- Node.js 22.12 or newer
- npm
- A modern desktop browser and keyboard

## Setup and automated checks

1. Run `npm install` from the repository root.
2. Run `npm run typecheck` and expect a successful exit with no diagnostics.
3. Run `npm run test:run` and expect every test to pass.
4. Run `npm run build` and expect a successful Vite production build.
5. Run `npm audit --audit-level=high` and expect no high or critical vulnerabilities.

## Browser validation

1. Run `npm run dev` and open the local URL printed by Vite.
2. Confirm the 9-by-7 board, five traffic rows, player, HUD, controls, and lane directions are visible.
3. Confirm one key press creates one turn, Space waits, held-key repeats do not create turns, and an out-of-grid attempt still advances traffic.
4. Play or use an approved deterministic action sequence to show one win and one loss.
5. Restart each finished game with R and confirm the initial state.

## Configuration validation

1. Open the valid query example and confirm the requested lives, target, and difficulty.
2. Open every required invalid example and confirm complete default fallback and a visible invalid-field message.
3. Open a query with one missing supported field and confirm only that field defaults.
4. Add an unknown field and confirm it is ignored.

## Evidence rule

Record actual commands and outputs rather than expected prose. Capture the baseline before changing a discovered problem, then repeat the same E1–E4 cases after one controlled change.
