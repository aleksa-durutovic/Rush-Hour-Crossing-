# Feature Specification: Voxel Night City Redesign

**Feature Branch**: `codex/002-voxel-night-city`

**Created**: 2026-09-23

**Status**: Accepted — visual addendum (implemented on `main`; changes presentation only, not gameplay rules)

**Input**: User description: "Redesign the entire Rush Hour Crossing interface as an original Voxel night city, using original generated bitmap decoration, discrete optional motion, and desktop/mobile plus active/end-state evidence."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Play on a vivid crossing board (Priority: P1)

As a player, I want the active game to feel like a readable night-time voxel city so that traffic positions, my character, and safe rows are immediately distinguishable.

**Why this priority**: The active board is the core experience and must communicate the existing turn-based rules without changing them.

**Independent Test**: Start a normal game and visually inspect a board containing the HUD, five traffic lanes, vehicles, the player, goal, and start area.

**Acceptance Scenarios**:

1. **Given** an active game, **When** the board is displayed, **Then** the player can distinguish the goal, start row, each road lane, every vehicle, and the player at a glance.
2. **Given** an active game, **When** a turn is completed, **Then** the displayed board reflects the new deterministic state without adding any automatic game turns.

---

### User Story 2 - Understand the game status from the arcade UI (Priority: P2)

As a player, I want a compact, high-contrast arcade HUD and clear keyboard guidance so that I can understand the game status and act without reading a long page header.

**Why this priority**: A clear status display supports gameplay and makes the full-shell redesign coherent.

**Independent Test**: Inspect the active game at desktop and mobile widths, navigate to the focused board with a keyboard, and confirm the status values and controls remain legible.

**Acceptance Scenarios**:

1. **Given** an active game, **When** a player views the screen, **Then** lives, crossings, score, turn count, difficulty, and movement/restart controls are visible and readable.
2. **Given** a keyboard user, **When** the board receives focus, **Then** the focus indicator is clearly visible and all existing keyboard controls continue to work.

---

### User Story 3 - Receive a distinct end-state presentation (Priority: P3)

As a player, I want win and loss states to have a prominent visual result and a restart direction so that I know the run has ended and how to begin again.

**Why this priority**: End states complete the visual lifecycle and are required evidence for the redesign.

**Independent Test**: Reach a win and a loss state using the existing deterministic game configuration and verify both overlays and restart behavior.

**Acceptance Scenarios**:

1. **Given** a completed winning run, **When** the game reaches its win condition, **Then** a distinct win presentation appears with a restart instruction.
2. **Given** a run with no lives remaining, **When** the loss condition is reached, **Then** a distinct loss presentation appears with a restart instruction and normal input remains locked except restart.

### Edge Cases

- At the narrow supported viewport width, the board, HUD, alert, and controls remain within the visible page width without horizontal page scrolling.
- If reduced motion is requested by the device, all visual transitions are removed or reduced while the state change remains immediately understandable.
- Existing invalid-configuration feedback remains visible and readable within the redesigned shell.
- Generated decoration failing to load must not hide the playable board, game status, or keyboard controls.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST redesign the full game shell, including page background, board frame, Canvas board, HUD, configuration feedback, and keyboard-control guidance, in an original voxel night-city visual language.
- **FR-002**: The system MUST preserve every rule and input behavior defined by `docs/GAME_SPEC.md`; the redesign MUST NOT add automatic turns, random behavior, new game mechanics, network requests, or mobile/touch controls.
- **FR-003**: The active board MUST use clearly differentiated visual treatments for goal, start, traffic lanes, lane directions, vehicles, and player.
- **FR-004**: The HUD MUST visibly show lives, crossings, score, tick, and selected difficulty during an active run.
- **FR-005**: The system MUST use only original visual assets created for this project; it MUST NOT copy third-party logos, characters, screenshots, or game assets.
- **FR-006**: The system MAY use original generated bitmap decorations and MUST remain playable if such decoration is unavailable.
- **FR-007**: The system MUST limit motion to brief, non-essential visual feedback after a user action; it MUST respect the device reduced-motion preference and MUST NOT advance game state automatically.
- **FR-008**: The redesigned page MUST remain usable at desktop and narrow mobile viewport widths using the existing keyboard-only interaction model.
- **FR-009**: The system MUST provide a visibly distinct win presentation and loss presentation, each with restart guidance, while retaining the existing post-game input rules.
- **FR-010**: The system MUST retain visible invalid-configuration feedback and a clearly visible keyboard focus indicator.
- **FR-011**: The system MUST meet a readable text contrast threshold of at least 4.5:1 for normal text and at least 3:1 for focus and large text against its adjacent background.
- **FR-012**: The project MUST record the agreed scope exception for original generated assets and discrete optional motion in `docs/AI_USAGE_LOG.md`.

## Key Entities *(include if feature involves data)*

- **Visual theme**: Named palette, typography, shape, and motion decisions shared by the shell and Canvas renderer.
- **Board visual state**: Presentation-only mapping of the existing game state, configuration, and lane data into board layers, HUD values, and end-state overlays.
- **Decorative asset**: Original project-owned bitmap that enriches the scene but is never required to play the game.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At desktop width, a screenshot of an active run visibly contains the game title, all five traffic lanes, player, HUD values, and keyboard controls in one screen.
- **SC-002**: At a viewport width of 320 pixels or greater, the page has no horizontal overflow and the board remains fully visible.
- **SC-003**: Automated game-logic and configuration tests continue to pass with no test changes that weaken existing gameplay assertions.
- **SC-004**: Production build, type check, and dependency audit complete successfully after the redesign.
- **SC-005**: Visual evidence contains screenshots of an active game, a win or loss end state, and the narrow viewport layout; the acceptance record states the observed result for each.
- **SC-006**: A keyboard user can reach the board, observe a visible focus indicator, make a move, wait, and restart with the documented controls.

## Assumptions

- The student pair has explicitly approved a narrow exception to the original visual exclusion: original generated bitmap decoration and brief, optional visual feedback are permitted for this redesign only.
- The exception does not permit copied assets, audio, touch controls, automatic/realtime progression, new mechanics, or changes to deterministic turn logic.
- Existing Vite, strict TypeScript, Canvas 2D, Vitest, and npm tooling remain the stack.
- The existing generated mockup is visual direction only; it is not a source asset to embed or copy.
