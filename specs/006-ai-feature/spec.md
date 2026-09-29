# Feature Specification: Delayed Post-Game AI Advice

**Feature**: 006-ai-feature

**Status**: Approved for implementation at the user’s request on 2026-09-29 — Option C selected; student-pair scope approval recorded

**Created**: 2026-09-29

**Assignment**: SITA AI Bootcamp 2026 W04 — Reliable AI Integration

## Summary

After a completed game, the backend prepares one short coaching tip from a compact run summary. The player sees that advice only after the following run ends. Advice never appears during active play. The first completed run has no prior advice to show.

Option C, survival and goal progress, is selected. A loss with zero crossings is categorized as survival; a partial loss is categorized as goal progress; a win or evidence that does not support either specific category uses general advice. The server derives the category and evidence from validated summary fields. Gemini returns only the next tip.

The student pair approved this bounded feature scope on 2026-09-29. The user then asked to complete the W04 assignment, including tests and required artifacts; this request is recorded as authorization to implement this specification. A live provider call remains outside routine implementation and tests, and requires separate explicit authorization.

## User Scenarios

### US1 — See advice from the previous completed run (Priority: P1)

As a player, I want one brief tip about a previous run to appear after my next run ends, so advice never interrupts a game.

**Acceptance scenarios**

1. Given no run has finished, when the first run ends, then the normal game result appears with no advice notice.
2. Given analysis for the first run becomes ready, when the next run is active, then the advice remains hidden.
3. Given advice is ready, when the next run ends, then the advice for the previous run appears on that result screen once.
4. Given advice was consumed, when another run ends, then the consumed advice does not appear again.
5. Given a ready result is hidden and the player restarts during a run or switches difficulty, when play continues, then the result stays hidden until the next completed run.
6. Given a displayed result is visible, when the player restarts or switches difficulty, then the notice is cleared.

### US2 — Keep the game responsive when analysis is pending (Priority: P1)

As a player, I want provider delays and failures to leave game input and game completion responsive.

**Acceptance scenarios**

1. Given the current run ends and analysis is pending, when the player starts or restarts a run, then gameplay does not wait for analysis.
2. Given an older analysis is still pending, when a later run ends, then the older job is invalidated, the safe unavailable message is shown in its previous-run slot, and analysis starts for the newly completed run.
3. Given the superseded provider response arrives later, when it resolves, then it cannot replace or otherwise change the newer lifecycle state.
4. Given an analysis response arrives during active play, when it becomes ready, then it remains hidden until a subsequent run ends.
5. Given provider attempts fail, when the following run ends, then only the safe unavailable message is shown for the previous run.

### US3 — Send only a small validated summary (Priority: P1)

As a player, I want analysis to use only the run measurements needed for Option C.

**Acceptance scenarios**

1. Given a completed run, when its summary is created, then it contains only outcome, difficulty, ticks, crossings, target crossings, starting lives, remaining lives, and score.
2. Given a locally invalid or tampered summary is submitted, when the API receives it, then it returns a stable client error and invokes the provider zero times.
3. Given Gemini returns malformed or out-of-range structured output, when the service handles it, then it rejects the result and returns a safe unavailable response.
4. Given valid advice reaches the browser, when it is displayed, then it is rendered as plain text in a polite status region.

## Scope

### In scope

- One delayed post-game advice message for each analyzed completed run.
- Option C summary and deterministic server-side category/evidence selection.
- One same-origin local API route served by the accepted feature 005 server.
- Gemini access from server code only, through a fakeable provider boundary.
- Runtime validation, one 15-second deadline per attempt, at most two attempts, safe failures, and stale-result suppression.
- Volatile in-memory state only; reload clears advice lifecycle state.
- Automated unit, server, boundary, and browser test expectations.

### Out of scope

- Changes to gameplay rules R1–R7, presets, score, controls, or win/loss behavior.
- In-game hints, next-move suggestions, tool/function calling, autonomous agents, or AI-controlled traffic.
- Collision/action-history telemetry, full game-state submission, identifiers, accounts, saved history, or persistence.
- Any provider other than Gemini, provider fallback, deployment, database, or unrelated network service.
- Returning a provider-selected category or evidence; those are derived by the backend from validated measurements.

## Requirements

### Functional Requirements

- **FR-001**: When a run reaches won or lost, the frontend MUST capture one summary with exactly the eight Option C fields defined in the data model.
- **FR-002**: A completed summary MUST be sent to analysis once, after the run completes. An active or manually restarted run MUST NOT produce a summary.
- **FR-003**: The first completed run MUST NOT display advice on its own result screen.
- **FR-004**: A successful result MUST remain hidden during the following run and MUST be displayed at most once when that following run ends.
- **FR-005**: A result that is ready or unavailable MUST remain hidden through mid-run restart and difficulty switch. Reload MUST clear all lifecycle state.
- **FR-006**: Restart or difficulty switch after advice has been displayed MUST clear the visible notice.
- **FR-007**: If the next run ends while the previous analysis is pending, the system MUST invalidate or abort that analysis, show the safe unavailable message in the previous-run slot, and begin analysis for the newly completed run without waiting for the old request.
- **FR-008**: A late response for a superseded job MUST be ignored.
- **FR-009**: Analysis MUST have at most two provider attempts, each with a 15-second deadline. Only transient provider/network failures and attempt timeout are retryable. Schema-invalid output, invalid local input, missing configuration, and permanent provider failures MUST NOT be retried.
- **FR-010**: The backend MUST validate the request shape, field ranges, and cross-field invariants before invoking a provider. Invalid requests MUST invoke the provider zero times.
- **FR-011**: The backend MUST derive focus and evidence deterministically and validate the provider's tip before constructing the client response.
- **FR-012**: The request summary MUST be no more than 4,096 UTF-8 bytes and MUST contain no unknown properties.
- **FR-013**: The provider MUST receive only the eight summary fields plus the server-derived focus and evidence. It MUST NOT receive a full state, action history, identifiers, credentials, or personal data.
- **FR-014**: The API response MUST contain only validated focus, deterministic evidence, and a validated next tip. It MUST NOT contain provider diagnostics or raw provider payloads.
- **FR-015**: The Gemini key MUST be read only by server code from the process environment and MUST NOT appear in source sent to the browser, browser requests, logs, evidence, or tracked environment files.
- **FR-016**: Advice MUST be rendered as literal text in a polite status region and MUST NOT change game state, controls, or end-state behavior.
- **FR-017**: The focus MUST be survival for a loss with zero crossings, goal_progress for a loss with at least one but fewer than target crossings, and general for a win or when validated evidence cannot support a specific focus.
- **FR-018**: The server MAY load a local .env file with Node's built-in environment-file support when that file exists. The key MUST remain server-side and MUST never be printed. Direct process environment configuration MUST also remain supported.

### Success Criteria

- **SC-001**: A three-run browser flow shows no advice after run one, run-one advice once after run two, and run-two advice once after run three when responses are ready.
- **SC-002**: Advice is hidden for every active run, including after mid-run restart and difficulty switch, until a completed run occurs.
- **SC-003**: If a prior job remains pending at the next run end, the previous-run slot shows the safe unavailable message immediately and the stale response cannot replace it.
- **SC-004**: Every invalid API summary case returns a stable 4xx and records zero fake-provider calls.
- **SC-005**: A current job makes no more than two attempts, and each attempt is aborted or ignored at 15 seconds.
- **SC-006**: Malformed provider output and provider failures never expose raw details to API clients or the visible UI.
- **SC-007**: The frontend and server boundary checks keep the SDK and process environment out of src/.
- **SC-008**: Existing gameplay unit tests, golden paths, and browser smoke expectations remain unchanged.

## Clarifications recorded

- **Advice focus**: Option C, survival and goal progress.
- **Focus mapping**: lost with zero crossings → survival; any partial loss → goal_progress; win or unclear evidence → general.
- **Pending result at following run end**: show the safe unavailable message as the prior result is superseded; invalidate the old request and analyze the newly completed run.
- **Restart or difficulty switch before display**: preserve hidden ready or pending advice; reveal it only after the next completed run. A reset after display clears the visible notice.
- **Implementation authorization**: the student pair approved the Option C feature scope on 2026-09-29. The user’s request to complete the W04 assignment, including tests and required artifacts, authorized implementation on the same date. This record does not imply approval for a live provider request.

## Assumptions and constraints

- A run begins with an active GameState and ends only at won or lost. Manual restart and difficulty switch are not completed runs.
- The existing configuration bounds apply: starting lives 1–5 and target crossings 1–10.
- Score remains the existing game score, 100 points per completed crossing.
- The existing server from feature 005 remains loopback-only with its Host allowlist and no CORS. The feature adds only the bounded advice API route.
- The provider adapter uses the official Gemini JavaScript SDK. SDK configuration was rechecked from the installed @google/genai 2.24.0 types on 2026-09-29; model, account access, and live pricing remain subject to change.
- Automated results are recorded in docs/EVIDENCE_006.md and specs/006-ai-feature/AI_EVALS.md. No live provider request was executed.
