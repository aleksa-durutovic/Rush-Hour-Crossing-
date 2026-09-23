# Rush Hour Crossing

A deterministic, turn-based crossing game built with TypeScript and Canvas for Session 003 of the Retro AI Engineering Challenge.

## Requirements

- Node.js 24 or newer and npm 11 or newer, as pinned by `.nvmrc` and the `engines` field in `package.json`
- With nvm, run `nvm use` in the project root to select the pinned Node version

## Commands

- `npm ci` — install the exact dependencies from `package-lock.json`
- `npm run dev` — start the local development server
- `npm run build` — type-check and create a production build
- `npm run test:run` — run the test suite once
- `npm run typecheck` — run TypeScript checks without emitting files

## Play

After starting the development server, focus the game board and use:

- Arrow keys or W/A/S/D to move one cell
- Space to wait for one turn
- R to restart

Optional URL query fields are `lives`, `crossingsToWin`, and `difficulty`. See `docs/GAME_SPEC.md` for their runtime validation contract.

## Project status

The Session 003 core game, runtime configuration validation, deterministic rule tests, and evidence workflow are implemented on `main`. The Voxel Night City redesign (`specs/002-voxel-night-city/`) is an accepted visual addendum that does not change gameplay rules. Evidence is in `docs/EVIDENCE_003.md` and `docs/evidence/`.

## Scope

The authoritative gameplay specification is `docs/GAME_SPEC.md`. Session 004 AI functionality, backend services, deployment, audio, real-time movement, and additional game mechanics are out of scope.
