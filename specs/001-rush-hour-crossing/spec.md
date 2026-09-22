# Feature Specification: Rush Hour Crossing Core Game

**Feature Branch**: `codex/001-rush-hour-crossing`

**Created**: 2026-09-22

**Status**: Draft

**Input**: User description: "Build the Session 003 Rush Hour Crossing game defined in `docs/GAME_SPEC.md`, without any Session 004 AI functionality or other out-of-scope mechanics."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Plan a Safe Crossing (Priority: P1)

A player advances one turn at a time across five deterministic traffic lanes. On every turn the player can move one cell or wait, and traffic advances in a predictable fixed cycle so the player can plan ahead.

**Why this priority**: This is the complete core value of the game and forms a viable deterministic crossing challenge by itself.

**Independent Test**: Start a game, execute a fixed sequence of moves and waits, and verify that the player, traffic, tick, and collision outcomes match the same sequence on every run.

**Acceptance Scenarios**:

1. **Given** an active game, **When** the player presses an arrow key or W/A/S/D once, **Then** the player attempts to move exactly one cell and traffic advances exactly one tick.
2. **Given** an active game, **When** the player waits with Space, **Then** the player remains in place and traffic advances exactly one tick.
3. **Given** the player attempts to leave the grid, **When** the turn resolves, **Then** the player remains in place and traffic still advances exactly one tick.
4. **Given** identical configuration and action sequences, **When** two games are played, **Then** every resulting state is identical.

---

### User Story 2 - Resolve a Complete Game (Priority: P2)

A player receives immediate feedback for collisions and successful crossings, can win or lose through play, and can restart a finished game from its initial state.

**Why this priority**: It turns the crossing mechanic into a bounded game with meaningful progress, failure, and replay.

**Independent Test**: Use controlled traffic states to cause a collision, a successful crossing, a win, and a loss, then restart and verify the complete initial state.

**Acceptance Scenarios**:

1. **Given** a player shares a traffic cell before or after traffic advances, **When** the turn resolves, **Then** at most one life is lost, tick still advances, and the player returns to the start.
2. **Given** the player reaches the goal without a collision, **When** the turn resolves, **Then** crossings increase by one, score increases by 100, and the player returns to the start.
3. **Given** crossings reach the configured target, **When** the turn resolves, **Then** the game enters a won state and ignores every input except restart.
4. **Given** lives reach zero, **When** the turn resolves, **Then** the game enters a lost state and ignores every input except restart.
5. **Given** a finished game, **When** the player presses R, **Then** tick, lives, crossings, score, status, and player position return to their configured initial values.

---

### User Story 3 - Configure the Challenge Safely (Priority: P3)

A player can select starting lives, required crossings, and difficulty through URL query parameters. Invalid input never crashes the game and produces a visible explanation while using a complete safe default configuration.

**Why this priority**: Configuration demonstrates the required structured runtime contract without changing the core game rules.

**Independent Test**: Open the game with valid, missing, unknown, unparsable, fractional, out-of-range, and unsupported parameter values and compare the active configuration and visible feedback with the specified contract.

**Acceptance Scenarios**:

1. **Given** valid values for all supported parameters, **When** the game starts, **Then** those values become the active configuration.
2. **Given** one or more supported parameters are missing, **When** the game starts, **Then** only those missing fields receive their defaults.
3. **Given** any present supported parameter is invalid, **When** the game starts, **Then** every field uses its default and a visible message names every invalid field.
4. **Given** unknown parameters are present, **When** the game starts, **Then** they are ignored and do not invalidate supported values.

### Edge Cases

- A held key produces repeated browser events; repeated events must not create turns.
- A collision can be detected both before and after traffic advances; only one life may be lost in the turn.
- A vehicle can occupy cells across a horizontal wrap boundary and every occupied cell must remain detectable.
- A lane with a speed greater than one tick remains stationary on non-movement ticks.
- A move reaches the goal on a turn where traffic could also collide with the player; collision resolution takes priority over crossing success.
- Multiple URL parameters can be invalid at once; every invalid supported field must be named.
- Lives must never become negative and completed crossings must never decrease.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The game MUST use a 9-column by 7-row grid with a traffic-free goal row, five traffic rows, and a traffic-free start row.
- **FR-002**: The player MUST begin and reset at column 4 of the start row.
- **FR-003**: A turn MUST accept one of five actions: move up, down, left, right, or wait.
- **FR-004**: Arrow keys and W/A/S/D MUST map to movement, Space MUST map to wait, and R MUST map to restart.
- **FR-005**: A repeated keydown event MUST be ignored and MUST NOT consume a turn.
- **FR-006**: A move MUST change the player position by at most one grid cell; an out-of-grid attempt MUST act as wait.
- **FR-007**: Every accepted move, wait, or out-of-grid attempt MUST advance traffic by exactly one tick.
- **FR-008**: Traffic MUST be deterministic, use no randomness, and derive every vehicle position solely from the lane definition and current tick.
- **FR-009**: Each lane MUST define a direction, a movement interval, vehicle starts, and one vehicle length, with horizontal wrap-around.
- **FR-010**: No difficulty preset MAY completely block any traffic lane at any tick from 0 through 199.
- **FR-011**: Collision MUST be checked after the player action against current traffic and again after traffic advances.
- **FR-012**: Any collision in a turn MUST remove at most one life, keep the advanced tick, and reset the player to the start.
- **FR-013**: Reaching the goal without collision MUST add one crossing, add 100 points, and reset the player to the start.
- **FR-014**: The game MUST be won when crossings reach the configured target and lost when lives reach zero.
- **FR-015**: After win or loss, all input except restart MUST be ignored.
- **FR-016**: Restart MUST restore tick zero, configured lives, zero crossings, zero score, active status, and the start position.
- **FR-017**: The game MUST display the grid, distinct goal/start/traffic areas, player, vehicles, recognizable lane directions, lives, crossing progress, score, and end-state instructions.
- **FR-018**: The game MUST accept `lives`, `crossingsToWin`, and `difficulty` as supported URL query parameters and ignore unknown parameters.
- **FR-019**: Lives MUST be an integer from 1 through 5, crossingsToWin MUST be an integer from 1 through 10, and difficulty MUST be easy, normal, or hard.
- **FR-020**: Missing supported parameters MUST use field defaults of 3 lives, 3 crossings, and normal difficulty.
- **FR-021**: If any present supported parameter is invalid, the game MUST reject the entire supplied configuration, use all defaults, and visibly name all invalid fields without crashing.
- **FR-022**: The game MUST preserve the invariants that lives never fall below zero and crossing count never decreases.
- **FR-023**: The game MUST update immediately after a turn and MUST NOT introduce timers, movement animation, audio, touch controls, AI, network services, persistence, or additional mechanics.

### Key Entities

- **Game configuration**: Starting lives, crossings required to win, difficulty, defaults, and validation outcome.
- **Game state**: Tick, player position, remaining lives, crossings, score, and active/won/lost status.
- **Player action**: One movement direction, wait, or restart request.
- **Traffic lane**: Row, direction, movement interval, vehicle length, and starting vehicle positions.
- **Difficulty preset**: The complete fixed set of five traffic lanes selected by difficulty.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Replaying the same configuration and action sequence 100 times produces the same final state every time.
- **SC-002**: Automated checks cover every rule R1 through R7 without requiring visual rendering.
- **SC-003**: Every lane in all three difficulty presets has at least one free grid cell for every tick from 0 through 199.
- **SC-004**: The valid configuration example is accepted and all five specified invalid examples are rejected with the documented complete fallback behavior.
- **SC-005**: Both a win and a loss can be reached through keyboard play and are visibly distinguishable.
- **SC-006**: A single non-repeated gameplay keydown produces exactly one turn, while a repeated keydown produces zero turns.
- **SC-007**: The documented startup, typecheck, test, and build commands complete without errors on the approved environment.
- **SC-008**: The Session 003 review can replay the same four eval scenarios on the preserved baseline and changed version with expectations written before execution.

## Assumptions

- The player uses a modern desktop browser and a physical keyboard.
- The game is a single local browser page and stores no personal or persistent data.
- Configuration is read once when a game session starts or restarts; changing the URL requires a page reload to provide new values.
- Each preset contains exactly five lane definitions corresponding to traffic rows 1 through 5.
- Visual presentation uses original geometric shapes and text rather than copied Frogger assets or identity.
- Deployment, responsive mobile gameplay, touch controls, and Session 004 AI functionality remain out of scope.
