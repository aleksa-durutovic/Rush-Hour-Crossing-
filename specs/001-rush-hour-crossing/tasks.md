# Tasks: Rush Hour Crossing Core Game

**Input**: Design documents from `specs/001-rush-hour-crossing/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/query-config.md`, `quickstart.md`

**Tests**: Required by `docs/GAME_SPEC.md` and the project constitution. Test tasks precede their corresponding implementation tasks.

**Execution rule**: Work sequentially. The assignment prohibits parallel agents for the core task, so this plan uses no `[P]` execution markers.

## Phase 1: Setup and Pre-Implementation Evidence

**Purpose**: Lock expectations and verify the approved starter before gameplay code.

- [x] T001 Record E1–E3 inputs and expectations before implementation in `docs/EVALS.md`
- [x] T002 Run the starter typecheck, test, build, and dependency audit commands and record actual outputs in `docs/EVIDENCE_003.md`
- [x] T003 Replace the starter-only test with behavior test files and create the planned module directories under `src/` and `tests/`

---

## Phase 2: User Story 1 — Plan a Safe Crossing (Priority: P1) — MVP

**Goal**: Deliver deterministic, turn-based player and traffic movement with two collision checks.

**Independent Test**: Run a fixed action sequence repeatedly and verify identical state, correct one-cell movement, tick advancement, waiting, boundaries, traffic intervals, wrap-around, and collision precedence.

### Tests for User Story 1

- [x] T004 [US1] Write failing traffic occupancy and wrap-around tests covering fixed tick-derived movement in `tests/traffic.test.ts`
- [x] T005 [US1] Write failing preset invariant tests requiring one free cell in every lane for ticks 0–199 in `tests/presets.test.ts`
- [x] T006 [US1] Write failing turn tests for R1, R2, collision A/B, one-life maximum, tick advancement, and determinism in `tests/turn.test.ts`

### Implementation for User Story 1

- [x] T007 [US1] Define grid, actions, positions, lane definitions, configuration-facing types, and game state in `src/game/constants.ts` and `src/game/state.ts`
- [x] T008 [US1] Define all easy, normal, and hard lane presets outside game logic in `src/config/presets.ts`
- [x] T009 [US1] Implement tick-derived vehicle positions and occupied-cell queries in `src/game/traffic.ts`
- [x] T010 [US1] Implement the pure action-to-state transition with collision A/B ordering in `src/game/turn.ts`
- [x] T011 [US1] Run `npm run test:run` and confirm the independent User Story 1 tests pass

**Checkpoint**: A deterministic crossing simulation works without DOM or Canvas.

---

## Phase 3: User Story 2 — Resolve a Complete Game (Priority: P2)

**Goal**: Add crossing rewards, reachable win/loss, restart, keyboard rules, Canvas rendering, and HUD feedback.

**Independent Test**: Drive controlled states to collision, crossing, win, and loss; verify post-game input lock and exact restart state; manually confirm the rendered board and HUD.

### Tests for User Story 2

- [x] T012 [US2] Extend failing turn tests for R5, R7, score, reachable win/loss, invariants, post-game input lock, and restart in `tests/turn.test.ts`
- [x] T013 [US2] Write failing keyboard mapping tests for arrows, W/A/S/D, Space, R, unsupported keys, and `event.repeat` in `tests/input.test.ts`

### Implementation for User Story 2

- [x] T014 [US2] Complete crossing, score, win, loss, input-lock, invariant, and restart behavior in `src/game/turn.ts` and `src/game/state.ts`
- [x] T015 [US2] Implement browser-independent keyboard-event mapping in `src/input/keyboard.ts`
- [x] T016 [US2] Implement the 9-by-7 Canvas board, vehicles, player, lane-direction cues, HUD, and end-state instructions in `src/render/canvas.ts`
- [x] T017 [US2] Apply the approved design tokens, cascade layers, visible focus, and motion-free responsive frame in `src/style.css` and `index.html`
- [x] T018 [US2] Wire initialization, accepted key actions, restart, and render-after-turn behavior in `src/main.ts`
- [x] T019 [US2] Run `npm run test:run` and manually demonstrate one win, one loss, post-game input lock, and restart

**Checkpoint**: The complete unconfigured game is playable and independently demonstrable.

---

## Phase 4: User Story 3 — Configure the Challenge Safely (Priority: P3)

**Goal**: Runtime-validate supported URL query fields and visibly apply the required atomic fallback.

**Independent Test**: Exercise valid, missing, unknown, fractional, unparsable, out-of-range, unsupported, and multiple-invalid inputs against the query contract.

### Tests for User Story 3

- [x] T020 [US3] Write failing tests for the valid example, missing fields, unknown fields, all five required invalid examples, multiple invalid fields, and atomic fallback in `tests/config.test.ts`

### Implementation for User Story 3

- [x] T021 [US3] Implement `GameConfig` defaults, numeric parsing, field validation, invalid-field aggregation, and atomic fallback in `src/config/game-config.ts`
- [x] T022 [US3] Integrate validated configuration and visible invalid-field feedback into `src/main.ts` and `src/render/canvas.ts`
- [x] T023 [US3] Run `npm run test:run` and manually verify the valid and combined-invalid query scenarios

**Checkpoint**: All three user stories work together while remaining testable through pure modules.

---

## Phase 5: Baseline Validation and Preservation

**Purpose**: Complete Definition of Done checks and preserve the unmodified first functional result.

- [x] T024 Run `npm run typecheck`, `npm run test:run`, `npm run build`, and `npm audit --audit-level=high`, recording actual results in `docs/EVIDENCE_003.md`
- [x] T025 Run E1–E3 on the baseline and append actual results without changing their expectations in `docs/EVALS.md`
- [x] T026 Capture the initial game, invalid-config message, reachable win, and reachable loss as evidence referenced from `docs/EVIDENCE_003.md`
- [x] T027 Commit the first functional baseline with an English Conventional Commit and create immutable annotated tag `s003-baseline-v1`
- [x] T028 Define E4 from the first reproducible baseline problem, write its expectation before formal execution, then record its baseline result in `docs/EVALS.md`

---

## Phase 6: One Controlled Change and Final Evidence

**Purpose**: Test one hypothesis without changing the prompt, context, schema, or eval criteria simultaneously.

- [x] T029 Record Claim, Signal, Hypothesis, Smallest change, Check, Result, and Limitation for E4 in `docs/EVIDENCE_003.md`
- [x] T030 Implement exactly one smallest corrective change in the single relevant source area identified by E4
- [x] T031 Repeat unchanged E1–E4 and append post-change results to `docs/EVALS.md`
- [x] T032 Re-run typecheck, full tests, build, and dependency audit and record actual results in `docs/EVIDENCE_003.md`
- [ ] T033 Finalize `docs/EVIDENCE_003.md`, `docs/AI_USAGE_LOG.md`, `security.md`, and partner contribution notes without adding Session 004 work

---

## Dependencies and Execution Order

- Phase 1 blocks all gameplay implementation.
- User Story 1 establishes the pure deterministic domain used by User Stories 2 and 3.
- User Story 2 extends the state transition and adds browser adapters after User Story 1 passes.
- User Story 3 adds the external configuration boundary after the playable core is stable.
- Baseline preservation blocks the controlled change.
- The controlled change may modify only the area justified by E4.

## Requirement Coverage

- US1 tasks cover FR-001–FR-012 and SC-001–SC-003.
- US2 tasks cover FR-013–FR-017, FR-022–FR-023, SC-005–SC-007.
- US3 tasks cover FR-018–FR-021 and SC-004.
- Baseline and evidence tasks cover SC-008 and the Session 003 process criteria.

## Implementation Strategy

1. Complete and validate the pure User Story 1 MVP.
2. Add complete game resolution and browser presentation.
3. Add the validated configuration boundary.
4. Freeze the first complete implementation as baseline.
5. Use only the observed E4 problem to authorize one further code change.
