# Agent Instructions — Rush Hour Crossing

Read this file before changing the project. It points to the authoritative sources; it does not replace them.

## Sources of truth, in priority order

1. `.specify/memory/constitution.md` — non-negotiable principles (locked scope, pure turn logic, determinism, runtime validation, tests before change, smallest controlled change, traceable work).
2. `docs/GAME_SPEC.md` — gameplay rules R1–R7, configuration contract, out-of-scope list, and Definition of Done D1–D8.
3. `specs/001-rush-hour-crossing/` — accepted core game specification, plan, and tasks.
4. `specs/002-voxel-night-city/` — accepted visual addendum. It changes presentation only, never gameplay rules.
5. `docs/CONTEXT_MANIFEST.md` — which context is included and which is deliberately excluded.

When sources conflict, the higher item wins. Report the conflict; do not resolve it silently.

## Architecture boundaries

- `src/game/` — pure, deterministic turn logic. No DOM, Canvas, keyboard events, randomness, or wall-clock time.
- `src/config/` — query-parameter parsing, runtime validation, and difficulty presets. Numbers live here, not in logic.
- `src/input/` — keyboard-to-action mapping only.
- `src/render/` — Canvas drawing. Text shown to the player comes from pure helpers such as `end-message.ts`, so it can be tested.
- `src/main.ts` — wiring only.

## Required workflow

- Use the Spec Kit skills in `.agents/skills/` (`speckit-specify` → `speckit-plan` → `speckit-tasks` → `speckit-analyze` → `speckit-implement`) for any new feature.
- Write or update a failing test or eval expectation before changing behaviour.
- Keep each change to the smallest scope that addresses one stated problem. Record claim, signal, change, and result in `docs/EVIDENCE_003.md`.
- Log meaningful AI involvement and decisions in `docs/AI_USAGE_LOG.md`.
- Never overwrite the baseline tag `s003-baseline-v1`.

## Checks before every commit

Use Node 24+ and npm 11+ (`.nvmrc`, `package.json` `engines`).

```bash
npm ci
npm run typecheck
npm run test:run
npm run build
npm audit --audit-level=high
```

Record actual results only. Never claim a check that did not run or did not return a result.

## Out of scope for Session 003

Session 004 AI hint and tool calling, backend, database, deployment, network services, audio, touch controls, real-time movement, and new game mechanics. No secrets, tokens, `.env` files, or private URLs in code, prompts, screenshots, or evidence.

## Delivery

Reviewers read the default branch `main`. Work that is not merged into `main` counts as not submitted.
