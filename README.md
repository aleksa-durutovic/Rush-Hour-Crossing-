# Rush Hour Crossing

A deterministic, turn-based crossing game built with TypeScript and Canvas for Session 003 of the Retro AI Engineering Challenge.

## Requirements

- Node.js 24 or newer and npm 11 or newer, as pinned by `.nvmrc` and the `engines` field in `package.json`
- With nvm, run `nvm use` in the project root to select the pinned Node version

## Commands

- `npm ci` — install the exact dependencies from `package-lock.json`
- `npm run dev` — start the Vite dev server and the local API server (`http://127.0.0.1:8787`) together; Vite forwards `/api` to the API server. Ctrl+C stops both
- `npm run dev:web` / `npm run dev:api` — start only one of the two
- `npm start` — serve the production build (`dist/`, run `npm run build` first) and `/api` from one local server on `http://127.0.0.1:8787` (set `PORT` to change the port)
- `npm run build` — type-check and create a production build
- `npm run test:run` — run the test suite once
- `npm run typecheck` — run TypeScript checks without emitting files
- `npx playwright install chromium` — one-time download of the browser used by the browser tests
- `npm run test:e2e` — build the game, serve it with `npm start` on `http://127.0.0.1:4173`, and run the browser smoke test (startup, focus, invalid configuration, win/loss input lock, restart, difficulty selector, same-origin API)
- `npm run evidence:screenshots` — regenerate the evidence screenshots in `docs/evidence/`

## Play

After starting the development server, focus the game board and use:

- Arrow keys or W/A/S/D to move one cell
- Space to wait for one turn
- R to restart
- Click `EASY`, `NORMAL`, or `HARD` next to the tick counter (or Tab to a button and press Enter or Space) to start a new game on that traffic preset; the choice is saved in the URL
- Choose a challenge rating in **Build a verified challenge** to request a five-lane level. Review its verified preview, then select **Play this level** to use it; generating alone never changes the current run

Optional URL query fields are `lives`, `crossingsToWin`, and `difficulty`. See `docs/GAME_SPEC.md` for their runtime validation contract.

## Project status

The Session 003 core game, runtime configuration validation, deterministic rule tests, and evidence workflow are implemented on `main`. The Voxel Night City redesign (`specs/002-voxel-night-city/`) is an accepted visual addendum that does not change gameplay rules. Evidence is in `docs/EVIDENCE_003.md` and `docs/evidence/`. Corrections from the third review (non-overlapping and winnable presets, browser smoke test) are specified in `specs/003-review-fixes/`. Feature 005 (`specs/005-backend-split/`) separates a local Node.js API server (`server/`) from the browser game (`src/`). Accepted Features 006 and 007 provide delayed post-game advice and a bounded, server-side level generator whose candidates are verified with the unchanged game engine before preview.

## Scope

The authoritative gameplay specification is `docs/GAME_SPEC.md`. The opt-in Feature 008 backup uses Gemini 2.5 Flash for the existing generation and advice operations; other providers or backends, deployment, audio, real-time movement, and additional game mechanics remain out of scope.

### Optional AI failover

Failover is disabled unless the server process has `AI_FAILOVER_ENABLED=true`. The server
also requires its existing `GEMINI_API_KEY` environment setting; the approved backup model
is fixed in server configuration as `gemini-2.5-flash`. Keep both values on the server and
out of browser settings, source control and logs. When enabled, each provider phase is capped
at 15 seconds (primary 8 seconds, backup 7 seconds). Gemini models in one project may share
quota, so this does not guarantee recovery from project-wide quota exhaustion. Routine tests
use fake transports; live verification still requires separate authorization. See
`specs/008-model-failover/quickstart.md`.
