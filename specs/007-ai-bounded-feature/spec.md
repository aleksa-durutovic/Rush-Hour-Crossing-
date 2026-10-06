# Feature Specification: On-Demand Safe-Path Hint

**Feature Branch**: `007-ai-bounded-feature`  
**Created**: 2026-10-06  
**Status**: Accepted; implementation and verification complete — student-pair approval and user request recorded  
**Input**: User request to implement `plan/week05-plan.md`; the student pair approved the narrow in-game Hint/tool-calling exception on 2026-10-06.

## User Scenarios & Testing

### User Story 1 — Request a verified route (Priority: P1)

As a player in an active run, I want to request a safe route to the next crossing so I can plan my next moves without spending another life.

**Why this priority**: The verified route is the feature's main value and the required Week 05 agent workflow.

**Independent Test**: From a representative active state on each difficulty, request a Hint and verify that every displayed action and state comes from a deterministic shortest route to one top-row crossing without reducing the submitted life count. When more crossings are configured, the game remains active after the Hint route ends.

**Acceptance Scenarios**:

1. **Given** an active run with a safe route within the search bounds, **When** the player selects Hint, **Then** one bounded agent run validates and executes `find_safe_path`, and the displayed shortest route stops on its first safe entry to any column of the top goal row without losing a life.
2. **Given** the route has been calculated, **When** the player views it, **Then** the game state, tick, score, lives, crossings, traffic, and player position have not changed.
3. **Given** the agent proposes a tool other than `find_safe_path` or supplies arguments other than an empty object, **When** the proposal is checked, **Then** the tool is not executed and the player receives a safe unavailable status.

### User Story 2 — Pause, hide, and re-show the Hint (Priority: P1)

As a player, I want the game to pause while I read a Hint and resume only when I hide it, so the route remains tied to the state I asked about.

**Why this priority**: A route is useful only when the player can inspect it without traffic advancing or their state changing underneath it.

**Independent Test**: Request a Hint with a controlled fake response; verify actions and difficulty controls are blocked while loading and visible, then verify Hide resumes input and a later Show reuses the cached result without another request.

**Acceptance Scenarios**:

1. **Given** an active run, **When** Hint is selected, **Then** keyboard movement, waiting, restart, and difficulty changes are blocked until the Hint is hidden.
2. **Given** a route or safe failure status is visible, **When** the player selects Hide hint, **Then** the route/status is hidden and gameplay input resumes.
3. **Given** a Hint result is cached and hidden, **When** the player selects Show hint, **Then** the same result is shown, gameplay pauses again, and no additional request is made.
4. **Given** gameplay advanced after a cached route was hidden, **When** the player shows that route again, **Then** the status identifies the route's original tick and does not describe it as newly calculated.
5. **Given** the player restarts or changes difficulty while the Hint is hidden, **When** the new run starts, **Then** its Hint allowance and cache are reset.
6. **Given** the player has used Hint and then loses one life, **When** the game resets the player to start, **Then** the previous route/cache is cleared and one request is available for the new life count.
7. **Given** a Hint has already been attempted at the current life count, **When** the player hides or re-shows its cached result, **Then** no second request is made for that life.

### User Story 3 — Understand loading and safe outcomes (Priority: P2)

As a player, I want accessible loading, verified, and unavailable messages so I know whether I can act and whether a route was actually proven.

**Why this priority**: The solver and provider have finite limits; users must not mistake a timeout or incomplete search for proof that no safe route exists.

**Independent Test**: Exercise successful, no-route, search-limit, stale-snapshot, invalid-proposal, timeout, and provider-failure outcomes using deterministic solver fixtures and fake providers; inspect the accessible status and ensure raw diagnostics are absent.

**Acceptance Scenarios**:

1. **Given** a Hint request is pending, **When** it is announced, **Then** visible “Loading hint…” text and a spinner are shown, with the spinner static under reduced-motion preferences.
2. **Given** exhaustive bounded search finds no safe route, **When** the result is shown, **Then** it says no safe route was verified and does not expose provider diagnostics.
3. **Given** a search or route-length cap is reached, **When** the result is shown, **Then** it says the route could not be verified within the search limit and does not claim no route exists.
4. **Given** a response arrives after the game differs from the submitted snapshot, **When** the response is handled, **Then** its route is discarded and a safe stale-result status is shown.

## Edge Cases

- Hint is unavailable before a run starts and after the run is won or lost.
- A valid active snapshot has at least one life and fewer completed crossings than its target; a goal-row position is not a persistent game state and is rejected.
- Invalid JSON, unknown request keys, out-of-range fields, an oversized body, a wrong content type, or a wrong method must stop before the solver and provider are called.
- A search-limit result and an exhaustively proven no-safe-route result are distinct.
- Invalid tool names/arguments, malformed structured output, repeated tool proposals, provider failure, timeout, cancellation, and a stale result cannot produce a route or disclose internal detail.
- A cached result may be re-shown after the player has advanced without losing a life; it must retain its original tick label. Losing a life, restarting, or changing difficulty clears the current cached result.
- A safe verified Hint route ends at the next crossing only. The route stops on the first safe entry to any column on `y = 0`, even when `crossingsToWin` is greater than the next crossing count; gameplay continues if the configured win target has not been reached.
- A late route is never shown when the live game no longer matches the request snapshot.
- A route cannot contain more than 512 actions or more than 64 KiB of serialized response data.

## Requirements

### Functional Requirements

- **FR-001**: The Hint control MUST be available only while a run is active and MUST permit at most one agent run for each current life count in a game. A failed or stale attempt consumes that life count's allowance. Losing a life clears the prior result and makes one request available for the new life count.
- **FR-002**: A Hint request MUST contain exactly `status`, `difficulty`, `tick`, `x`, `y`, `lives`, `crossings`, and `crossingsToWin`; it MUST contain no score, action history, identifiers, saved data, or personal information.
- **FR-003**: The request MUST be runtime-validated in the browser and again at the server boundary. Only an active state with safe integer ranges, a non-goal player position, positive lives, and crossings below the target is valid. Unknown keys are rejected.
- **FR-004**: The successful agent flow MUST have two logical model steps: the first proposes the sole permitted `find_safe_path` tool with exact empty-object arguments; the second returns a short structured explanation after receiving the normalized solver outcome.
- **FR-005**: The backend MUST validate a tool proposal before execution. An unknown/repeated tool, malformed proposal, or non-empty/unknown arguments MUST execute zero tools and stop safely.
- **FR-006**: `find_safe_path` MUST use a deterministic breadth-first search over the existing game transition and selected difficulty preset. A verified route MUST end on the first safe entry to any column of the top goal row, count exactly one crossing beyond the submitted snapshot, and preserve the submitted life count. It MUST NOT continue through additional crossings to satisfy `crossingsToWin`.
- **FR-007**: The solver MUST expand no more than 30,000 states and return no more than 512 actions. Reaching either bound before a next crossing is proved MUST return `search_limit`; exhausting the reachable safe state space without a next crossing MUST return `no_safe_path`.
- **FR-008**: The server MUST use the validated solver result as the only source of route actions and per-step states. Model output MUST NOT set, replace, or alter route coordinates, actions, outcome, evidence, or origin tick.
- **FR-009**: The workflow MUST allow at most four provider attempts in total, with at most two attempts per logical step, a 15-second deadline per attempt, and a 45-second overall deadline including solver work. Only transient provider/network errors and per-attempt timeouts may be retried. Invalid output, permanent failures, cancellation, and completed tool execution MUST NOT cause the tool or whole workflow to be repeated.
- **FR-010**: The API MUST reject a request body larger than 2,048 UTF-8 bytes and MUST return a response no larger than 65,536 UTF-8 bytes. Invalid inputs MUST call neither the provider nor the solver.
- **FR-011**: Provider, timeout, validation, and solver failures MUST map to fixed safe client-facing outcomes. Raw provider payloads, prompts, chain-of-thought, secrets, stack traces, and internal exception details MUST NOT reach the browser or evidence.
- **FR-012**: The server MUST abort or ignore work after caller cancellation and MUST ignore a late provider response after the overall deadline or cancellation.
- **FR-013**: Selecting Hint MUST immediately pause movement, waiting, restart, and difficulty changes while loading and while a result/status is displayed.
- **FR-014**: The interface MUST show accessible “Loading hint…” text and a visible spinner while loading. The spinner MUST be static under reduced-motion preferences while the text remains visible.
- **FR-015**: A verified route or safe status MUST remain visible until the player selects Hide hint. Hiding it MUST resume gameplay input.
- **FR-016**: Re-showing a cached result at the same life count MUST make no new request. If the run has advanced since the route's origin, the UI MUST identify its original tick. Losing a life, restarting, or changing difficulty MUST clear the cache; a life loss makes one Hint allowance available for the new life count, while restart/difficulty change restores all life-count allowances for the new run.
- **FR-017**: Before a pending result is shown, the live game snapshot MUST be compared with the submitted snapshot. A mismatch MUST discard the route and cache/show only a safe stale-result status.
- **FR-018**: The status text MUST use a polite accessible live region. A verified route MUST also be available as an ordered text list of its action and entered cell for assistive technology. Model text MUST be rendered as literal text. A `search_limit` outcome MUST never be described as proof that no safe route exists.
- **FR-019**: Hint data, provider access, and cancellation MUST remain within the existing same-origin local server boundary; the server remains loopback-only, applies its Host allowlist, and sends no CORS headers.
- **FR-020**: Existing game rules R1–R7, feature 006 post-game advice, presets, scoring, and golden paths MUST remain unchanged.

### Key Entities

- **Hint Snapshot**: The eight validated values describing one active run state from which the player requested help.
- **Solver Result**: A backend-derived outcome (`verified`, `no_safe_path`, or `search_limit`), bounded route actions and state trace when verified, and the snapshot tick that anchors the result.
- **Hint Lifecycle**: Per-game state recording whether a request was used, whether its result is loading, hidden/cached, visible, or safely unavailable.

## Success Criteria

### Measurable Outcomes

- **SC-001**: For representative active states on easy, normal, and hard, every displayed verified route reaches exactly the next top-row crossing with the submitted life count unchanged; if more crossings are configured, the route can end with the game still active.
- **SC-002**: Each current life count permits at most one API/agent run, including failures; hiding and re-showing a cached result results in zero extra runs, and losing a life permits one new run.
- **SC-003**: During loading or display, a sequence of movement, wait, restart, and difficulty input leaves the game snapshot unchanged; selecting Hide resumes input.
- **SC-004**: Invalid request and invalid tool-proposal cases execute zero solver/provider tools at the point the invalidity is detected.
- **SC-005**: Every agent run stays within two logical model steps, one solver tool execution, four provider attempts, 15 seconds per attempt, 45 seconds overall, 30,000 expanded states, and 512 route actions.
- **SC-006**: In controlled outcomes, assistive technology can read the loading/result status and ordered verified route; failure copy distinguishes search limit from exhaustive no-route and reveals no raw provider or exception text.
- **SC-007**: A stale response never draws a route for a game state different from its submitted snapshot.
- **SC-008**: Existing gameplay, advice, server-boundary, and browser smoke expectations pass without changes to their acceptance criteria.

## Assumptions

- The player is in a current active run and chooses when to request the Hint; it is advisory and cannot advance the game.
- “Without losing another life” means every solver transition preserves the submitted life count, including both collision checks within a turn.
- Traffic repeats with a finite period. The solver keys traffic phase modulo the least common multiple of each lane's `GRID_COLUMNS × moveEveryTicks` period; current presets have a maximum cycle of 54 ticks.
- The safe active search space has at most 29,160 combinations: 54 player cells, at most 54 traffic phases, and at most 10 crossing counts while lives remain fixed. The 30,000 expansion cap leaves room for terminal/check bookkeeping.
- The 512-action cap bounds the trace and response size. If it prevents a proof, the result is `search_limit`.
- Automated checks use fake provider adapters only. This approval does not authorize a live Gemini request.
- Reloading clears volatile per-game Hint lifecycle state; no route or Hint history is persisted.
- The cached route is explicitly tied to its origin tick. Re-showing it after gameplay advances presents it as an earlier cached route and pauses the run until hidden.
