# Tasks: 007-ai-bounded-feature — On-Demand Safe-Path Hint

**Input**: Design documents in this directory (`spec.md`, `plan.md`, `data-model.md`, `contracts/`, and `AGENT_EVALS.md`).

**Gate**: The student pair approved the narrow scope exception on 2026-10-06. The user requested implementation. A live Gemini request remains separately gated and is not part of this implementation.

**Workflow**: Record E1–E12 before the original feature execution. For the user clarification follow-up, record E13–E14 with the targeted regression tests and capture their red baseline before behavior changes.

## Phase 1 — Setup

The existing TypeScript, Vite, Vitest, Playwright, and loopback-server project structure and dependencies are reused. No setup task or dependency addition is required.

## Phase 2 — Foundational

No shared infrastructure change blocks the stories. Shared request/result contracts and the solver are implemented in User Story 1 before the browser story uses them.

## Phase 3 — User Story 1: Request a verified route (Priority: P1)

**Goal**: A bounded server agent validates one `find_safe_path({})` proposal and returns only a replay-verified route to the next safe crossing or an accurately classified safe outcome.

**Independent Test**: From active snapshots on all difficulties, replay every returned action through the existing transition and verify the target is reached without changing lives; invalid proposals and requests execute no unapproved tool work.

### Tests for User Story 1

- [x] T001 [US1] Add exact-key snapshot/proposal/response tests in `tests/hints/contract.test.ts`, including `tick` safe integer `0..Number.MAX_SAFE_INTEGER - 512`, `x` `0..8`, `y` `1..6`, `lives` `1..5`, and `crossings < crossingsToWin`.
- [x] T002 [US1] Add deterministic solver tests in `tests/hints/solver.test.ts` for all difficulties, non-start states, nonzero ticks, any top-row exit column, one-next-crossing behavior, life preservation, route replay, the `30,000` expanded-state cap, the `512` action cap, exhaustive `no_safe_path`, and distinct `search_limit`.
- [x] T003 [US1] Add fake-provider service tests in `tests/server/hint-service.test.ts` for two-step order, exact `find_safe_path({})` allowlist, one solver call, invalid/repeated proposal rejection, compact tool result, explanation validation, maximum `4` provider attempts (`2` per step), `15,000` ms attempt timeout, `45,000` ms total deadline, cancellation, and no solver replay.
- [x] T004 [US1] Add API tests in `tests/server/hint-api.test.ts` for `POST /api/hint`, UTF-8 JSON, exact snapshot keys, `2,048` request bytes, `65,536` response bytes, stable errors, invalid-input zero calls, disconnect, Host allowlist, and no CORS.
- [x] T005 [US1] Extend `tests/server/boundaries.test.ts` expectations so only `server/advice/gemini-provider.ts` and `server/agent/gemini-provider.ts` may import `@google/genai`; keep Node/server/SDK/environment access out of `src/`.
- [x] T006 [US1] Run the new contract, solver, service, API, and boundary tests before behavior code; record their actual red baseline in `docs/EVIDENCE_W05.md`.

### Implementation for User Story 1

- [x] T007 [US1] Implement strict DTO/runtime validators in `shared/hint-agent-contract.ts`, including exact keys, UTF-8 limits, all snapshot ranges, tool args `{}`, step/route bounds, and cross-field progression.
- [x] T008 [US1] Add a pure exported action-destination helper in `src/game/turn.ts` and use it without changing `applyAction` behavior, so route traces show the goal cell before crossing reset.
- [x] T009 [US1] Implement preset traffic-cycle calculation, fixed-order bounded BFS, predecessor reconstruction, and `verified` / `no_safe_path` / `search_limit` results in `server/agent/tools/find-safe-path.ts`.
- [x] T010 [US1] Implement route shape and full transition replay validation in `server/agent/hint-service.ts`; reject any mismatched state or life loss before model continuation or response construction.
- [x] T011 [US1] Implement injectable provider/solver orchestration, exact tool allowlist, counters, transient-only retry, per-attempt and total deadlines, cancellation, safe failures, and no-tool-replay semantics in `server/agent/hint-service.ts`.
- [x] T012 [US1] Implement the server-only Gemini function-call proposal and function-response continuation in `server/agent/gemini-provider.ts`; reuse the existing model/key boundary, require one function, request one structured explanation, bound output, propagate abort, and log no payloads.
- [x] T013 [US1] Add `POST /api/hint` to `server/app.ts` with stable statuses, streamed byte caps, strict JSON validation before service invocation, disconnect cancellation, and no CORS.

**Checkpoint**: Fake-provider success returns a deterministic replay-verified route; invalid request/proposal has zero disallowed calls; all workflow/search caps are enforced.

## Phase 4 — User Story 2: Pause, hide, and re-show the Hint (Priority: P1)

**Goal**: The player can inspect a cached route while gameplay is paused, hide it to resume, and re-show it without a new request.

**Independent Test**: Use a controlled API response and verify loading/display pause, Hide resumes input, Show reuses the cached result, old origin tick is labelled, and restart/difficulty while hidden clears the cache.

### Tests for User Story 2

- [x] T014 [US2] Add pure lifecycle tests in `tests/hints/lifecycle.test.ts` for ready/loading/visible/hidden transitions, one run per current life count (including failed attempts), cache reuse, reset, request generations, and stale settlement suppression.
- [x] T015 [US2] Add browser client tests in `tests/hints/client.test.ts` for exact request shape, same-origin POST, malformed/oversized response rejection, DTO validation, and safe errors.
- [x] T016 [US2] Add Playwright expectations in `e2e/hint.pw.ts` for loading/visible pause, movement/wait/R/difficulty blocks, Hide/Show, request count one, original-tick label, reset, overlay route provenance, and the accessible ordered action/cell list; cover a pending-snapshot mismatch in `tests/hints/controller.test.ts` because normal browser controls are intentionally blocked during loading.
- [x] T017 [US2] Run lifecycle/client/browser expectations before their behavior code and record the actual red baseline or environment-blocked result in `docs/EVIDENCE_W05.md`.

### Implementation for User Story 2

- [x] T018 [US2] Implement exact active snapshot construction and browser-side runtime validation in `src/hints/snapshot.ts`.
- [x] T019 [US2] Implement the pure per-life request/cache/show/hide/reset lifecycle and generation IDs in `src/hints/lifecycle.ts`.
- [x] T020 [US2] Implement same-origin request/response handling and DTO validation in `src/hints/client.ts`.
- [x] T021 [US2] Implement controller wiring, pause state, snapshot equality check, stale-route discard, and safe client failures in `src/hints/controller.ts`.
- [x] T022 [US2] Add optional validated route markers to `renderGame` in `src/render/canvas.ts`, drawing each solver `entered` cell and preserving output when no route is provided.
- [x] T023 [US2] Wire the native Hint/Hide/Show control, status region, ordered action/cell route list, snapshot capture, cache controller, overlay, and paused keyboard/restart/difficulty handling in `src/main.ts`.

**Checkpoint**: The visible route is only solver output; all gameplay controls stay blocked until Hide; a cached re-show makes zero additional requests.

## Phase 5 — User Story 3: Understand loading and safe outcomes (Priority: P2)

**Goal**: The player receives accessible, reduced-motion-compatible messages that distinguish a proven no-route result from an incomplete search or unavailable agent.

**Independent Test**: Drive fixed verified/no-route/limit/stale/error responses through the browser with reduced motion enabled and ensure statuses are accurate, accessible, and free of raw provider details.

### Tests for User Story 3

- [x] T024 [US3] Extend browser and pure-message expectations in `e2e/hint.pw.ts` and `tests/hints/messages.test.ts` for polite accessible “Loading hint…” status, visible/static reduced-motion spinner, distinct fixed copy for `no_safe_path`, `search_limit`, stale, and unavailable outcomes, literal-text rendering, and focus return after Hide.
- [x] T025 [US3] Run the failure/accessibility expectations before their presentation behavior changes; record the actual red or environment-blocked baseline in `docs/EVIDENCE_W05.md`.

### Implementation for User Story 3

- [x] T026 [US3] Implement verified/no-route/search-limit/stale/unavailable user copy as fixed safe messages and render the optional model explanation using `textContent` in `src/main.ts`.
- [x] T027 [US3] Add visible spinner, focus treatment, disabled paused controls, and `prefers-reduced-motion: reduce` static-spinner styling in `src/style.css`.
- [x] T028 [US3] Add `e2e/hint.pw.ts` to the existing `test:e2e` command in `package.json` without removing smoke/advice coverage.
- [x] T029 [US3] Return focus to the game canvas after Hide and preserve a Hide action for dismissing a visible stale status after a terminal transition in `src/main.ts`.

**Checkpoint**: Users can tell loading, verified, exhaustive no-route, search-limit, stale, and unavailable outcomes apart; reduced-motion and plain-text rules pass.

## Phase 6 — Polish and cross-cutting evidence

- [x] T030 Run `npm ci`, `npm run typecheck`, `npm run test:run`, and `npm run build`; record exact outputs in `docs/EVIDENCE_W05.md`.
- [x] T031 Run `npm audit --audit-level=high` and `npm run test:e2e` on supported Node/npm; record actual results only in `docs/EVIDENCE_W05.md`.
- [x] T032 Review bundle, request/response bodies, boundary results, logs, and tracked/untracked files for secret/raw-provider exposure or changes to feature 006/game rules; record actual results in `docs/EVIDENCE_W05.md`.
- [x] T033 Update `docs/AI_USAGE_LOG.md` and `docs/EVIDENCE_W05.md` with implementation decisions, automated provider policy, test evidence, limits, and accurately known student contributions.

## Dependencies and execution order

- Setup and the project structure are already satisfied; there are no new dependencies.
- Within each story, tests and the red baseline precede behavior changes.
- US1 completes the shared API/solver/provider contract before US2 browser integration.
- US2 depends on the validated response types and route trace from US1.
- US3 presentation tests use the service outcomes from US1 and lifecycle from US2.
- T030–T033 follow all three story checkpoints. No tasks are marked parallel; browser/game wiring shares files and must remain sequential.

## Implementation strategy

1. Deliver the verified route agent and API (US1), with fake-provider tests as the first independently demonstrable slice.
2. Add the player pause/cache/overlay lifecycle (US2).
3. Finish accessible safe outcome presentation and reduced-motion behavior (US3).
4. Run the complete project gates and capture actual evidence. Do not perform a live provider request without separate explicit approval.

## Phase 7 — User clarification follow-up

**Clarification**: Keep the gameplay win condition at `crossingsToWin`. A Hint stops after the next safe crossing to any column of the top row, even if the game remains active. One Hint attempt is allowed for each remaining life count.

- [x] T034 [US1] Add solver, service, shared-response, and browser expectations in `tests/hints/solver.test.ts`, `tests/server/hint-service.test.ts`, `tests/hints/contract.test.ts`, and `e2e/hint.pw.ts` for shortest next-crossing routes at any top-row column when `crossingsToWin > 1`.
- [x] T035 [US2] Add lifecycle/controller/browser expectations in `tests/hints/lifecycle.test.ts`, `tests/hints/controller.test.ts`, and `e2e/hint.pw.ts` for one attempt per life count, failure consumption, cache clearing after life loss, and resetting all allowances for a new game.
- [x] T036 Stop BFS at the first safe goal-row entry; validate active-vs-won final state and exactly one crossing in `server/agent/tools/find-safe-path.ts`, `server/agent/hint-service.ts`, and `shared/hint-agent-contract.ts`; wire life-change cache reset in `src/hints/` and `src/main.ts`.
- [x] T037 Update the approved feature contract and evidence in `docs/GAME_SPEC.md`, `docs/AI_USAGE_LOG.md`, `docs/EVIDENCE_W05.md`, `specs/007-ai-bounded-feature/`, and `plan/week05-plan.md`; run and record targeted/full checks.

## Format validation

Every actionable line uses a `Tnnn` identifier and a checkbox; story tasks also include a user-story marker. No `[P]` markers are used because the tasks touch shared contracts or UI wiring and are sequenced.
