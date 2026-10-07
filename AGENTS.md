# Agent Instructions — Rush Hour Crossing

Read this file before changing the project. It points to the authoritative sources; it does not replace them.

## Sources of truth, in priority order

1. `.specify/memory/constitution.md` — non-negotiable principles (locked scope, pure turn logic, determinism, runtime validation, tests before change, smallest controlled change, traceable work).
2. `docs/GAME_SPEC.md` — gameplay rules R1–R7, configuration contract, out-of-scope list, and Definition of Done D1–D8.
3. `specs/001-rush-hour-crossing/` — accepted core game specification, plan, and tasks.
4. `specs/002-voxel-night-city/` — accepted visual addendum. It changes presentation only, never gameplay rules.
5. `specs/003-review-fixes/` — accepted corrections after the third review: preset invariants (no overlap, winnable), golden paths, and the browser smoke test. It changes preset data and tests only.
6. `specs/004-difficulty-switch/` — accepted UI addendum: `EASY` / `NORMAL` / `HARD` buttons next to the tick counter. It adds a mouse-operated difficulty selector and changes no rule R1–R6.
7. `specs/005-backend-split/` — accepted infrastructure addendum: a local API server in `server/` that serves the built game and `/api` from one origin (`127.0.0.1` only, `Host` allowlist, no CORS). It changes no rule R1–R7 and adds no AI call.
8. `specs/006-ai-feature/` — accepted delayed post-game advice. Preserve the provider
   boundary and delayed lifecycle when working on later features.
9. `specs/007-agent-level-generator/` — user-approved Week 05 addendum: bounded five-lane
   traffic generation, one read-only solver tool, verified preview, explicit player approval.
   Read `IMPLEMENTATION_GUIDE.md` first for the Luna 6 handoff; it contains no source code.
10. `specs/008-model-failover/` — user-approved bounded backup-model extension for both
    AI operations. Read `IMPLEMENTATION_GUIDE.md` first. Failover is disabled by default;
    the selected backup is Gemini 2.5 Flash (`gemini-2.5-flash`). No live provider call is authorized.
11. `docs/CONTEXT_MANIFEST.md` — which context is included and which is deliberately excluded.

When sources conflict, the higher item wins. Report the conflict; do not resolve it silently.

## Architecture boundaries

- `src/game/` — pure, deterministic turn logic. No DOM, Canvas, keyboard events, randomness, or wall-clock time.
- `src/config/` — query-parameter parsing, runtime validation, and difficulty presets. Numbers live here, not in logic.
- `src/input/` — keyboard-to-action mapping only.
- `src/render/` — Canvas drawing. Text shown to the player comes from pure helpers such as `end-message.ts`, so it can be tested.
- `src/main.ts` — wiring only.
- Feature 007: pure solver state/metrics stay in `src/game/` and range/configuration policy
  in `src/config/`; timing, provider decisions and tool dispatch stay in `server/`.
  Browser generator lifecycle/client/controller stay in `src/level-generator/`.
- Feature 008: enabled routing and attempt accounting stay server-side; one selected backup
  is used sequentially within the existing operation budgets. It does not alter generator
  proof/approval or advice delay requirements.
- `server/` — local Node.js API server (`node:http`, run with tsx). It may import the pure modules in `src/game/` and `src/config/`, never `src/main.ts`, `src/render/`, `src/input/`, or CSS. It is the only code that may read `process.env`; a future provider key lives only here.
- `src/` never imports `server/` or Node.js built-ins and never reads `process.env` or `import.meta.env` (enforced by `tests/server/boundaries.test.ts`).
- `scripts/dev.mjs` — starts Vite and the API server together for `npm run dev`.
- `tests/` — Vitest unit tests; `tests/fixtures/golden-paths.ts` holds the recorded paths; `tests/server/` holds the server tests (type-checked by `tsconfig.server.json`). `e2e/` — Playwright browser tests (`*.pw.ts`), run against `npm start` on `http://127.0.0.1:4173`. Keep the two separate.

## Required workflow

- Use the Spec Kit skills in `.agents/skills/` (`speckit-specify` → `speckit-plan` → `speckit-tasks` → `speckit-analyze` → `speckit-implement`) for any new feature.
- Write or update a failing test or eval expectation before changing behaviour.
- Keep each change to the smallest scope that addresses one stated problem. Record claim, signal, change, and result in `docs/EVIDENCE_003.md` (Session 004 work: `docs/EVIDENCE_004.md`).
- Log meaningful AI involvement and decisions in `docs/AI_USAGE_LOG.md`.
- Week 05 claim, signal, change, result and run evidence go in `docs/EVIDENCE_W05.md`.
  The feature 007 Windows boundary-test failure must be corrected before feature code.
- Never overwrite the baseline tag `s003-baseline-v1`.

## Checks before every commit

Use Node 24+ and npm 11+ (`.nvmrc`, `package.json` `engines`).

```bash
npm ci
npm run typecheck
npm run test:run
npm run build
npm audit --audit-level=high
npx playwright install chromium   # once per machine
npm run test:e2e
```

Record actual results only. Never claim a check that did not run or did not return a result.

## Out of scope for Session 003

Session 004 AI hint and tool calling (until their own specification is accepted), any backend other than the local API server in `server/`, database, deployment, network services, audio, touch controls, real-time movement, and new game mechanics. No secrets, tokens, `.env` files, or private URLs in code, prompts, screenshots, or evidence.

## Delivery

Reviewers read the default branch `main`. Work that is not merged into `main` counts as not submitted.
