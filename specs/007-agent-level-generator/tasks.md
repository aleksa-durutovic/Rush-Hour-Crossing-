# Tasks: Verified agent level generator

**Input**: spec.md, plan.md, research.md, data-model.md and contracts/ in this directory.
**Execution**: Use the local speckit-implement skill and IMPLEMENTATION_GUIDE.md.
**Tests**: Required before corresponding behavior changes. Completed tasks are marked [X].
**Ownership**: Luna6 writes the implementation. These are instructions, not source code.

## Phase 1 Setup and baseline prerequisite

- [X] T001 Read AGENTS.md and this feature package; inspect working tree, tool versions and baseline tag; record actual starting state and known failure in docs/EVIDENCE_W05.md (FR-014, FR-020).
- [X] T002 Reproduce the already-failing SDK-import assertion in tests/server/boundaries.test.ts; correct Windows path comparison with minimal path normalization while retaining the sole SDK owner and all architecture checks; demonstrate failure before fix and passage after it (FR-019, SC-007).
- [X] T003 Run every required baseline gate from AGENTS.md, recording actual output/status in docs/EVIDENCE_W05.md; resolve only measured prerequisite failures before feature source, preserving tests/fixtures/golden-paths.ts and s003-baseline-v1 (FR-014, SC-007).
- [X] T004 Add Zod as the only new runtime dependency in package.json and package-lock.json, recording the justified installed version in docs/EVIDENCE_W05.md; preserve existing scripts/dependencies and inspect installed SDK types before provider changes (FR-002, FR-006, FR-019).

## Phase 2 Foundational contracts and deterministic evaluation

- [X] T005 Write failing exact-key/cross-field tests in tests/level-generator-contract.test.ts for request integers targetDifficulty1..5, lives1..5, crossingsToWin1..10; model variants, compact results and preview/unavailable DTOs from data-model.md (FR-002, FR-008, FR-011, FR-017).
- [X] T006 Implement browser-safe strict Zod contracts in shared/level-generator-contract.ts; reject unknown keys/numeric strings, enforce variant nullability/limits and derive types consistently from schemas (FR-002, FR-008, FR-011, FR-017).
- [X] T007 Write failing tests in tests/generated-level.test.ts for exactly five unique rows1..5, direction left/right, moveEveryTicks1..3, vehicleLength1..2, vehicleStarts1..4 unique integers0..8, circular overlaps/full lanes, canonical repetition identity and separate templates (FR-006, FR-010, FR-014).
- [X] T008 Implement range/invariant/canonicalization/template policy in src/config/generated-level.ts using the research.md template derivations; never alter src/config/presets.ts or clamp model values (FR-006, FR-010, FR-012, FR-014).
- [X] T009 Write failing metric/rating boundary tests in tests/level-metrics.test.ts for circular/adjacent/single-vehicle gaps, weighted averageGap, density and ratings1=6..8,2=9..10,3=11..12,4=13..14,5>=15 (FR-007, FR-008, FR-017).
- [X] T010 Implement pure measurements in src/game/level-metrics.ts with rating numbers supplied from src/config/generated-level.ts; keep ratings independent of the player's crossing target (FR-007, FR-008, FR-017).
- [X] T011 Write failing pure search tests in tests/solve-level.test.ts covering existing lengths6/11/15, full targets3/10, witness replay, phase/crossing keys, collisionA/B, finite exhaustion, the impossible moving-gap fixture and reduced-resource budget_exceeded (FR-007, SC-001, SC-005).
- [X] T012 Implement pure incremental BFS and bounded predecessor witnesses in src/game/solve-level.ts per contracts/solve-level.md; call existing applyAction, reject life loss, deduplicate phase/position/crossings and distinguish exhaustion from cutoff (FR-007, SC-001, SC-005).
- [X] T013 Write failing async tests in tests/server/level-generator-tool.test.ts for yielding every256 states or sooner, two-second timeout, abort/deadline, 35,000 states/175,000 actions across both searches, 4,096-byte compact output and invalid-result rejection (FR-005, FR-008, FR-009, SC-004, SC-005).
- [X] T014 Implement the single-tool validating driver in server/level-generator/solve-tool.ts, supplying application-owned settings/budgets to the pure search and validating/replaying internal proof before compact model evidence (FR-005, FR-007, FR-008, FR-019).

## Phase 3 User Story 1 Request a verified challenge

**Goal**: Complete the backend propose/evaluate/finalize path against scripted models.
**Independent test**: Two model decisions, one real requested solver execution, separate
final verification and a valid exact-rating preview for the captured whole target.

- [X] T015 [US1] Write failing core service tests in tests/server/level-generator-service.test.ts with a fake model and real solve tool: two-decision success, invalid request, early final, wrong evidence reference, impossible candidate then revision, exact final identity and rating mismatch (FR-003, FR-004, FR-011, SC-001, SC-002).
- [X] T016 [US1] Define the provider-neutral decision boundary and immutable limits/context policy in server/level-generator/model.ts and server/level-generator/policy.ts using contracts/agent-run.md; include fake injection points without provider SDK imports (FR-003, FR-009, FR-019).
- [X] T017 [US1] Implement explicit bounded run state and the success/revision/final path in server/level-generator/service.ts; use only the solveLevel registry, authoritative candidate/evaluation IDs, at most three candidates and counted final verification (FR-003, FR-004, FR-005, FR-009, FR-011, FR-020).
- [X] T018 [US1] Write fake-transport adapter tests in tests/server/level-generator-provider.test.ts for structured decision output, installed SDK options, 2,048 output tokens, raw size cap, signal propagation, no internal retries, safe classified errors and unchanged coaching behavior (FR-003, FR-009, FR-019).
- [X] T019 [US1] Add a separate generator-decision factory/operation to server/advice/gemini-provider.ts while retaining the sole SDK importer and existing GEMINI_MODEL; use installed types and fakes, not live calls (FR-003, FR-019).
- [X] T020 [US1] Write failing route tests in tests/server/level-generator-api.test.ts for exact POST request, 2,048-byte streamed cap, malformedUTF8/JSON, method/media errors, Host/no-CORS controls, no-store, busy rejection and disconnect cancellation (FR-001, FR-002, FR-018, FR-019).
- [X] T021 [US1] Wire the injected service and POST /api/levels/generate in server/app.ts and server/index.ts, releasing the one-run guard on every path without blocking advice requests or exposing a generic tool route (FR-001, FR-002, FR-018, FR-019).

## Phase 4 User Story 2 Preview and deliberate play

**Goal**: Present verified traffic without changing the ongoing game; let the player apply it.
**Independent test**: Generation changes no game state, Play starts the exact preview,
R restarts it, any preset leaves generated mode, and coaching identifies generated traffic.

- [X] T022 [US2] Write failing browser lifecycle/DTO tests in tests/level-generator-lifecycle.test.ts for running/ready/unavailable, stale response rejection, cancellation, reset invalidation, immutable settings and no approval for invalid responses (FR-013, FR-018, SC-006).
- [X] T023 [US2] Implement pure lifecycle, validated same-origin client and controller in src/level-generator/lifecycle.ts, src/level-generator/client.ts and src/level-generator/controller.ts; no browser agent loop or solver (FR-013, FR-018, FR-019).
- [X] T024 [US2] Write failing generated-origin advice tests in tests/advice/summary.test.ts, tests/server/advice.test.ts and tests/server/advice-service.test.ts; preserve eight keys, preset defaults, focus/evidence derivation and delayed lifecycle expectations (FR-016, SC-007).
- [X] T025 [US2] Extend generated summary identity in shared/advice-contract.ts and src/advice/summary.ts; preserve GameConfig.difficulty and the existing advice service/lifecycle behavior (FR-016, SC-007).
- [X] T026 [US2] Write failing Playwright expectations in e2e/level-generator.pw.ts with same-origin fake responses for unchanged active state, preview metrics/snapshot, exact Play/reset, R reuse, same-remembered-preset restoration, reload and generator focus guards (FR-001, FR-013, FR-014, FR-015, FR-017, FR-018, SC-006).
- [X] T027 [US2] Add the small accessible panel/status/preview and explicit Play wiring in src/main.ts and src/style.css, reusing src/render/canvas.ts for the isolated snapshot; keep active origin separate, no preset button pressed for generated play, literal text and keyboard guards (FR-001, FR-013, FR-014, FR-015, FR-017, FR-018).
- [X] T028 [US2] Add generated-to-preset and delayed-coaching browser regression cases in e2e/level-generator.pw.ts and e2e/advice.pw.ts as needed, and include the new generator file explicitly in package.json test:e2e (FR-015, FR-016, SC-006, SC-007).

## Phase 5 User Story 3 Controlled stops and truthful fallback

**Goal**: Prove the safety/reliability matrix before any live provider request.
**Independent test**: Unknown first tool yields zero executions/no preview; operational
failure returns only an eligible verified fallback; deadline and cancellation cannot resume.

- [X] T029 [US3] Extend failing tests in tests/server/level-generator-service.test.ts for unknown tool, bad arguments/model output/tool result/final selection, proving zero execution for rejected first proposals and no security fallback (FR-005, FR-008, FR-011, FR-012, SC-003).
- [X] T030 [US3] Add failure classification, validated-result gates and bounded context/evidence construction in server/level-generator/service.ts and server/level-generator/policy.ts; never trust model metrics/completed flags (FR-003, FR-008, FR-011, FR-012, FR-020).
- [X] T031 [US3] Write failing fake-clock limit tests in tests/server/level-generator-service.test.ts for five decisions, six attempts, eight counted solves including verification, one retry per decision, two revisions, repeated reordered candidate, 40-second cutoff/45-second deadline and abort propagation (FR-009, FR-010, FR-018, SC-004).
- [X] T032 [US3] Complete attempt/retry/cutoff/repetition/revision enforcement in server/level-generator/service.ts and server/level-generator/policy.ts; reserve final resources, disable late settlements and preserve safe terminal reasons (FR-009, FR-010, FR-018, SC-004).
- [X] T033 [US3] Write failing fallback tests in tests/server/level-generator-service.test.ts for last solved candidate, exact-request template verification, target mismatch, unavailable proof, expired reserve and cancellation; retain original stop reason and completed false (FR-012, SC-001, SC-004, SC-005).
- [X] T034 [US3] Implement eligible fallback in server/level-generator/service.ts using the separate verified-template policy from src/config/generated-level.ts; never execute fallback after security rejection or cancellation (FR-012, SC-001, SC-004, SC-005).
- [X] T035 [US3] Add safe failure/fallback/cancel/stale-result browser cases in e2e/level-generator.pw.ts; verify source/rating notices, unavailable result disables Play, cancellation changes no game state and provider text cannot become markup (FR-012, FR-017, FR-018, SC-006).
- [X] T036 [US3] Extend architecture tests in tests/server/boundaries.test.ts to cover generator SDK/environment isolation, pure search with no DOM/clock/RNG/Node access and no new browser/server imports; keep exact permitted SDK owner rather than broad exemptions (FR-019, SC-007).

## Phase 6 Verification and evidence

- [X] T037 Execute all prewritten scenarios in specs/007-agent-level-generator/AI_EVALS.md with fakes, recording actual traces/results in docs/EVIDENCE_W05.md; include real requested solver execution, rejected-tool zero execution and whole-target witness replay (FR-020, SC-008).
- [X] T038 Run the complete AGENTS.md checks and the quickstart.md browser scenarios; record exact successes/failures and final tested revision in docs/EVIDENCE_W05.md without editing golden paths or acceptance criteria to hide regressions (FR-014, FR-016, SC-007, SC-008).
- [X] T039 Review the diff and reconcile implementation notes in specs/007-agent-level-generator/quickstart.md, README.md and docs/AI_USAGE_LOG.md; preserve unrelated/untracked user work and original baseline tag (FR-014, FR-020, SC-008).
- [X] T040 Prepare the bounded manual live smoke procedure in docs/EVIDENCE_W05.md; request separate live-call authorization only after fake tests pass, then record at most three authorized final-demo runs or the truthful pending/unavailable status (FR-020, SC-008).
- [X] T041 Record actual driver/reviewer contributions, final limitations, main delivery status and completion summary in docs/EVIDENCE_W05.md and docs/AI_USAGE_LOG.md; mark only actually completed tasks and distinguish live-demo pending from implementation completion (FR-020, SC-008).

## Dependencies and implementation strategy

Phase1 -> Phase2 -> US1 -> US2 -> US3 -> verification. Follow this sequential order for
one Luna6 chat. Do not skip source prerequisites because a UI demonstration works.
Within each pair, write/run failing expectations before implementing behavior, then run
focused tests and typecheck. Full required gates precede every commit; no commit is required
merely to cross a task boundary. Continue authorized reversible work without repeated approvals.

US1 is independently testable through the backend service/route and scripted model. US2
and US3 build on it; they are independently verifiable, not independent prerequisites.
No live call occurs before the full fake safety matrix passes. No agent delegation is needed
for implementation; no parallel agent tasks are requested in this handoff.

## Parallel opportunities

After contracts stabilize, metric and pure solver tests can be authored in different files
without shared edits; API and browser lifecycle tests can likewise be prepared independently.
These are optional human coordination opportunities, not permission to spawn agents.
The chosen implementation order remains sequential and has no parallel task markers.

## Coverage map

| Requirement | Tasks |
|---|---|
| FR-001 | T020-T021, T026-T027 |
| FR-002 | T004-T006, T020-T021 |
| FR-003 | T015-T019, T030 |
| FR-004 | T015, T017 |
| FR-005 | T013-T014, T017, T029 |
| FR-006 | T007-T008 |
| FR-007 | T009-T014 |
| FR-008 | T005-T006, T009-T010, T013-T014, T029-T030 |
| FR-009 | T013, T016-T018, T031-T032 |
| FR-010 | T007-T008, T031-T032 |
| FR-011 | T005-T006, T015, T017, T029-T030 |
| FR-012 | T008, T029-T030, T033-T035 |
| FR-013 | T022-T023, T026-T027 |
| FR-014 | T001, T003, T007-T008, T026-T027, T038-T039 |
| FR-015 | T026-T028 |
| FR-016 | T024-T025, T028, T038 |
| FR-017 | T005-T006, T009-T010, T026-T027, T035 |
| FR-018 | T020-T023, T026-T027, T031-T032, T035 |
| FR-019 | T002, T004, T014, T016, T018-T021, T023, T036 |
| FR-020 | T001, T017, T030, T037-T041 |
| SC-001 | T011-T012, T015, T033-T034, T037 |
| SC-002 | T015, T017, T037 |
| SC-003 | T005-T006, T020-T021, T029-T030, T037 |
| SC-004 | T013-T014, T031-T034, T037 |
| SC-005 | T011-T014, T033-T034, T037 |
| SC-006 | T022-T023, T026-T028, T035, T038 |
| SC-007 | T002-T003, T024-T025, T028, T036, T038 |
| SC-008 | T037-T041 |
