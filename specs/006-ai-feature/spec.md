# Feature Specification: Delayed Post-Game AI Advice

**Status**: Draft — choose an advice focus before planning  
**Created**: 2026-09-29  
**Assignment**: SITA AI Bootcamp 2026 W04 — Reliable AI Integration

## Summary

After each completed Rush Hour Crossing game, the player receives one short AI coaching message about the weakest point in the previous completed game. The message is prepared after a game ends, held while the next game is played, and shown only when that next game ends. The first completed game therefore produces no visible advice.

The shared delay and reliability behavior is specified here. The advice focus remains to be selected: traffic timing, movement efficiency, or survival and goal progress. See ../../ai-feature-plan/feature.md. The selection determines which compact metrics are collected and what the advice can reliably claim.

## User Scenarios

### US1 — Receive advice from the previous game (Priority: P1)

As a player, I want one concise, useful tip about a completed game to appear after I finish my next game, so that the tip never interrupts play and gives me something specific to improve.

**Acceptance scenarios**

1. Given no game has been completed, when the player finishes the first game, then the end screen shows the normal win or loss state and no AI advice.
2. Given the first game's analysis succeeds, when the player is playing the second game, then its advice remains hidden.
3. Given first-game advice is ready, when the second game ends, then that advice appears once, is identified as advice for the previous game, and does not wait for a new provider response.
4. Given previous-game advice has been displayed, when the player restarts or changes difficulty, then the advice is cleared for the new game and cannot appear a second time.
5. Given the second game has ended, when its own analysis succeeds, then its advice remains hidden until the third game ends.

### US2 — Keep play responsive while analysis is pending (Priority: P1)

As a player, I want a slow analysis request to have no effect on gameplay or the game's end state.

**Acceptance scenarios**

1. Given a game has ended and analysis is pending, when the player starts and completes another game before that analysis finishes, then the old analysis is abandoned or invalidated, its late response is ignored, and analysis starts for the newly completed game.
2. Given advice arrives while the next game is active, when it arrives, then it remains hidden until that game ends.
3. Given an analysis attempt times out, when the job remains current, then at most one retry is made for a transient failure; each attempt is limited to 15 seconds.
4. Given both attempts fail, when the next game ends, then a short safe unavailable message may be shown for the previous game. Raw provider errors and secrets are never shown.

### US3 — Send only relevant game information (Priority: P1)

As a player, I want the coach to receive only a compact summary needed for the selected advice focus.

**Acceptance scenarios**

1. Given a completed-game summary is locally invalid, when it is submitted for analysis, then the request is rejected before any provider call.
2. Given the provider returns missing, malformed, or out-of-range advice fields, when the result is received, then it is rejected and is not shown as valid advice.
3. Given valid advice is returned, when it is rendered, then its text is treated as plain text and cannot inject markup or code into the game page.

## Scope

### In scope

- Analyze each finished game, win or loss, once.
- Keep only one previous-game summary and its pending advice or failure state in volatile application memory.
- Start analysis after each game ends; hold the result until the following game ends.
- Show advice at most once, only on a finished-game screen.
- Use bounded, structured, validated advice and a safe failure message.
- Keep the provider secret on a TypeScript backend, as required by W04.

### Out of scope

- Changing any Rush Hour Crossing rule, preset, scoring, or win/loss condition.
- AI hints during a game, next-move suggestions, AI-controlled traffic, or an autonomous agent loop.
- Persistent history, accounts, a database, or cross-device storage.
- Sending the full game state or complete action log when an aggregate is sufficient.
- Showing advice while a game is active.
- Provider or model fallback, dashboards, or deployment.

## Requirements

### Functional Requirements

- **FR-001**: When a game changes from active to won or lost, the system MUST capture one compact summary for that finished game.
- **FR-002**: After the first game ends, the system MUST start analysis of its summary and MUST NOT show advice on that first end screen.
- **FR-003**: The system MUST hold a successful analysis result without displaying it until a later game reaches won or lost.
- **FR-004**: When a later game ends, the system MUST display ready advice about the previous game once and label it accordingly.
- **FR-005**: After advice is consumed for display, the system MUST clear the previous summary and pending advice from retained application state. The visible text may remain on that game's end screen until restart or a new game begins.
- **FR-006**: When a new game ends before the prior analysis completes, the system MUST invalidate or cancel the older analysis, ignore any late result, and begin analysis for the newly finished game without blocking the game result.
- **FR-007**: The system MUST allow no more than two provider attempts for one still-current analysis. Each attempt MUST have a 15-second timeout. Only transient provider or network failures may be retried.
- **FR-008**: After bounded attempts fail, the system MUST represent analysis as unavailable and MUST show only a stable, user-safe message at the next game end. It MUST NOT expose a key, raw provider response, stack trace, or internal error.
- **FR-009**: The backend MUST runtime-validate the local request before calling Gemini. Invalid local input MUST result in zero provider calls.
- **FR-010**: The backend MUST runtime-validate the provider's structured response before returning it. Invalid output MUST NOT be treated as success.
- **FR-011**: The feature MUST send only the smallest aggregate needed for the selected advice focus. It MUST NOT send personal identifiers, credentials, or unrelated application state.
- **FR-012**: The Gemini API key MUST be available only to the backend and MUST NOT be included in browser code, browser requests, logs, evidence, or committed environment files.
- **FR-013**: Advice text MUST be concise, specific to evidence in the submitted summary, and rendered as plain text.
- **FR-014**: The advice focus MUST be one of the three options in the companion feature document. **[NEEDS CLARIFICATION: choose traffic timing, movement efficiency, or survival and goal progress before planning.]**

### Draft Advice Output

The initial response contract uses a fixed category and two short text fields. The chosen focus may narrow the allowed category values and required summary fields.

~~~json
{
  "focus": "traffic_timing",
  "evidence": "Two of your three lost lives occurred in row 4.",
  "nextTip": "Wait for the vehicle to clear row 4 before entering it."
}
~~~

- Focus is a fixed enum matching the selected feature.
- Evidence is one short observation supported by supplied game metrics.
- Next tip is one actionable suggestion for a future game.
- Empty, oversized, unsupported, or schema-invalid values are rejected.
- The UI derives any title from the validated focus; the model does not choose markup.

### Key Entities

- **Completed-game summary**: The minimum selected aggregate needed to assess one finished game, including outcome and difficulty. Optional metrics depend on the selected focus.
- **Pending advice**: One validated result or bounded failure state, associated with exactly one completed game and held until the following game ends.

## Success Criteria

- **SC-001**: In a run of three completed games with timely valid responses, no advice appears after game one, game-one advice appears once after game two, and game-two advice appears once after game three.
- **SC-002**: Advice is never visible while a game is active.
- **SC-003**: When a later game ends before the previous request resolves, the game-end screen is not delayed for that old request and no late old response appears.
- **SC-004**: Each provider attempt stops at 15 seconds and no current analysis exceeds two attempts.
- **SC-005**: Every invalid local request tested produces zero calls to the fake provider.
- **SC-006**: Malformed provider output is rejected and never rendered as valid advice.
- **SC-007**: A repository and browser-bundle secret scan finds no Gemini key; the committed environment example has an empty value.
- **SC-008**: Existing deterministic gameplay tests and browser smoke paths retain their outcomes.

## Assumptions and Decisions

- A game is one run from a fresh active state through win or loss. A manual restart before win or loss does not create a completed-game summary.
- Summaries and advice are held in memory only. Reloading the page clears them; no database or browser persistence is required.
- At most one analysis job is current. A later completed game supersedes an unfinished older job.
- Timeout means 15 seconds per provider attempt; two attempts can therefore take up to 30 seconds if the job remains current. A later game completion supersedes the job earlier.
- The displayed failure text is “AI advice is currently unavailable.” It is shown in the previous-game slot and does not prevent recording and analyzing the latest finished game.
- The user requested Gemini, the lowest-cost suitable model, a 15-second timeout, and at most two attempts. The initial model candidate and current official pricing are recorded in ../../ai-feature-plan/feature.md and must be rechecked before implementation.

## Project Constraints

- The existing authoritative game specification excludes live AI calls and a backend from Session 003. This is a separate W04 proposal and does not amend gameplay rules.
- W04 requires a TypeScript backend; the current repository has a Vite browser frontend and no backend. The full plan must include the frontend/backend boundary before provider integration.
- The project constitution requires an explicit student-pair decision recorded in docs/AI_USAGE_LOG.md before implementing work that was out of scope for Session 003. This draft records the user's request and leaves pair approval for implementation pending.
- The W04 assignment governs provider security, fake-provider tests, timeout, bounded retry, and evidence.
