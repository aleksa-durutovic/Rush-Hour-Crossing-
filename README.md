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

### AI resource bounds

Generation and delayed advice share an allowance of 60 actual provider starts per serving
Node process. Primary, retry and backup calls each use one start. Browser reload and elapsed
time do not refill it; restarting the server or its watch process starts a fresh allowance.
This limit bounds local provider invocations, not exact monetary spend. Once exhausted,
advice becomes unavailable after the existing completed-run delay. Generation may return
only its existing verified, incomplete fallback, which still requires explicit Play.

The browser generator client retains at most 16,384 response bytes and stops reading on
the first overflowing chunk, without retaining it. It then performs fatal UTF-8 decoding,
JSON parsing and the existing strict response validation for bounded complete responses.
This does not control bytes delivered in an oversized chunk or buffered by the browser
or network before a chunk is delivered.

### Optional AI failover

Failover is disabled unless the server process has `AI_FAILOVER_ENABLED=true`. The server
also requires its existing `GEMINI_API_KEY` environment setting; the approved backup model
is fixed in server configuration as `gemini-2.5-flash`. Keep both values on the server and
out of browser settings, source control and logs. When enabled, each provider phase is capped
at 15 seconds (primary 8 seconds, backup 7 seconds). Gemini models in one project may share
quota, so this does not guarantee recovery from project-wide quota exhaustion. Routine tests
use fake transports; live verification still requires separate authorization. See
`specs/008-model-failover/quickstart.md`.

## Local score and advice trust

Scores and completed-run summaries are local player data. The server treats submitted
summaries as unverified input when preparing optional advice. Generated traffic is checked
with the deterministic solver before preview; the current game changes only after the player
chooses **Play this level**.

## Week08 eight-minute security walkthrough

Run the fake-backed suite from the approved generator branch checkout:

    npm ci
    npm run test:security

The security unit suite uses the production handler, validators, provider adapters with
injected fake transport, admission controller and real solver. The browser suite serves the
production build through that handler at 127.0.0.1:4173. It makes no provider call and needs
no credential. Each fixture creates fresh event/admission state; fake clocks replace real
minute waits. Restarting the local server also resets the process-only event ring and
admission window.

| Time | Walkthrough |
|---|---|
| 0:00-1:00 | Open the game and identify local-only state, the generator boundary and the highest-priority resource risk. |
| 1:00-2:30 | Run T00: two fake model decisions, the real solver, unchanged active board, verified preview, explicit Play and normal movement/reset. |
| 2:30-5:00 | Run T02/T07/T13/T17: privilege and Origin denials, bounded admission, unknown tools and a foreign final reference. Show actual counters. |
| 5:00-6:30 | Run T14/T21-T23: synthetic SDK key receipt, adapter/tool sentinels, newline injection and fixed-shape allow/deny/terminal events. |
| 6:30-8:00 | Run T16 and the three before/after probes; review current audit status and the recorded residual limits. |

For a normal local gameplay session, run **npm run dev**; no AI provider is needed for
ordinary gameplay. The test suite owns its loopback fixtures and releases them after each
case. See specs/009-secure-the-arcade/quickstart.md and docs/EVIDENCE_W08.md for the
full reset steps, exact evidence and limitations.
