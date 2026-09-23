---
description: "Task list for the Voxel Night City visual redesign"
---

# Tasks: Voxel Night City Redesign

**Input**: Design documents from `/specs/002-voxel-night-city/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/ui-contract.md`, `quickstart.md`

**Tests**: Existing pure-logic tests are regression gates. New visual acceptance is validated through the runtime checks in `quickstart.md` because Canvas appearance is not covered by the current test suite.

## Phase 1: Setup

**Purpose**: Establish traceable visual inputs and keep the existing project safe.

- [x] T001 Record the pair-approved visual-only scope exception in `docs/AI_USAGE_LOG.md`.
- [x] T002 Create an original optional night-city decorative bitmap at `public/assets/voxel-night-city-backdrop.png` and record its provenance in `docs/EVIDENCE_003.md`.
- [x] T003 Verify `.gitignore` covers `node_modules/`, `dist/`, logs, and `.env*` without adding an unnecessary ignore file.

---

## Phase 2: Foundational Visual Theme

**Purpose**: Define one coherent, accessible visual system before story work.

- [x] T004 Update the visual-theme source in `design-tokens.json` with the Voxel Night City palette, typography, spacing, signature element, and cascade-layer convention.
- [x] T005 Update `src/style.css` with responsive shell styling, optional backdrop treatment, visible focus, high-contrast states, and `prefers-reduced-motion` handling.
- [x] T006 Update `src/main.ts` with concise semantic shell markup that supports the themed title, configuration feedback, Canvas frame, and controls without changing keyboard behavior.

**Checkpoint**: Theme shell is ready; the playable renderer remains unchanged.

---

## Phase 3: User Story 1 - Play on a vivid crossing board (Priority: P1) 🎯 MVP

**Goal**: Deliver a readable original Voxel Night City board while preserving deterministic game state.

**Independent Test**: Start the game and verify the Canvas shows goal, start, five lanes, lane cues, player, vehicles, and status values after a move without automatic state progression.

- [x] T007 [US1] Update `src/render/canvas.ts` with a presentation-only Voxel Night City board, lane, curb, road-marker, vehicle, and player treatment that reads existing state only.
- [x] T008 [US1] Update `src/render/canvas.ts` so the active HUD visibly contains lives, crossings, score, tick, and difficulty with accessible contrast.
- [x] T009 [US1] Add non-essential action feedback through `src/main.ts` and `src/style.css`, ensuring it does not change state and is disabled or reduced by `prefers-reduced-motion`.
- [x] T010 [US1] Run `npm run typecheck`, `npm run test:run`, `npm run build`, and `npm audit --audit-level=high`; record actual outputs in `docs/EVIDENCE_003.md`.

**Checkpoint**: An active Voxel Night City game is visible and existing gameplay regression checks pass.

---

## Phase 4: User Story 2 - Understand the game status from the arcade UI (Priority: P2)

**Goal**: Make the redesigned shell readable and keyboard-usable at desktop and narrow sizes.

**Independent Test**: At desktop and at least 320-pixel viewport widths, confirm the title, HUD, invalid-config feedback, controls, and focused board are readable with no horizontal overflow.

- [x] T011 [US2] Verify and refine `src/style.css` responsive layout and control treatment at desktop and 320-pixel viewport widths.
- [x] T012 [US2] Verify `src/main.ts` preserves the existing accessible Canvas label, keyboard behavior, and visible invalid-configuration feedback in the redesigned shell.
- [x] T013 [US2] Capture and record desktop, narrow viewport, focus, invalid-configuration, and reduced-motion runtime results in `docs/EVIDENCE_003.md`.

**Checkpoint**: Shell clarity, focus, responsiveness, and configuration feedback are evidenced.

---

## Phase 5: User Story 3 - Receive a distinct end-state presentation (Priority: P3)

**Goal**: Make win and loss visually distinct while preserving locked post-game behavior.

**Independent Test**: Reach a deterministic win and loss state, confirm each overlay and restart direction, then verify only restart is accepted after game end.

- [x] T014 [US3] Update `src/render/canvas.ts` with visually distinct Voxel Night City win and loss overlays plus restart direction.
- [x] T015 [US3] Capture and record win/loss runtime evidence and post-game restart behavior in `docs/EVIDENCE_003.md`.

**Checkpoint**: Full visual lifecycle has been demonstrated without changing game rules.

---

## Phase 6: Polish & Cross-Cutting Validation

**Purpose**: Verify acceptance criteria, contrast, provenance, and traceability.

- [x] T016 Measure documented text/focus contrast pairs from `design-tokens.json` and record results in `docs/EVIDENCE_003.md`.
- [x] T017 Re-run the full `quickstart.md` validation and update `docs/EVIDENCE_003.md` with measured outcomes only.
- [x] T018 Mark completed tasks in `specs/002-voxel-night-city/tasks.md` and commit the feature with an English Conventional Commit message.

## Dependencies & Execution Order

- T001–T003 → T004–T006 → T007–T010 → T011–T013 → T014–T015 → T016–T018.
- US2 and US3 rely on the themed shell and renderer from US1 but validate separate acceptance concerns.
- The game-state and input modules are intentionally excluded from all tasks.

## Implementation Strategy

1. Establish the theme and optional asset without making it required for gameplay.
2. Deliver the active board and run all regression gates.
3. Validate responsive/focus/configuration behavior and end states.
4. Record only observed results and commit after every acceptance gate is satisfied.
