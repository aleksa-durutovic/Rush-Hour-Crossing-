# Feature Specification: Verified agent level generator

**Feature Branch**: `codex/007-agent-level-generator` (suggested implementation branch)
**Created**: 2026-10-06
**Status**: User-approved scope; implementation instructions prepared; feature not implemented
**Input**: Generate traffic for the existing five-lane game through a bounded propose,
evaluate, revise workflow. Give the player a verified preview and explicit Play this level
action. Prepare instructions for Luna 6, without implementation code.

## User Scenarios & Testing

### User Story 1 - Request a verified challenge (Priority: P1)

The player chooses a target challenge rating from 1 to 5 and requests a level using their
current lives and crossing target. They receive a traffic preview proven winnable without
losing a life, with its measured rating and a clear indication of whether the target was met.

**Why this priority**: It provides the complete bounded generation value.
**Independent Test**: A scripted model proposes a candidate, receives an evaluated result,
and selects that candidate in a later decision. Verify the preview and replay its proof.

**Acceptance Scenarios**:

1. Given a valid request, when a candidate meets the requested rating and the model
   finalizes it after receiving verification evidence, then a verified preview is returned.
2. Given a candidate rated too low, too high, or impossible, when the model revises it,
   then no more than two revisions are accepted and only a verified level is previewed.
3. Given a crossing target greater than one, when a preview is offered, then the proof
   completes that entire target with no life loss; proof of one crossing alone is insufficient.
4. Given an invalid request, when generation is requested, then no model or tool executes.
5. Given insufficient search resources, when verification stops, then it reports an
   incomplete verification rather than falsely claiming that the level is impossible.

### User Story 2 - Start the level deliberately (Priority: P1)

The player examines the preview and decides whether to play it. Generation itself cannot
change the ongoing game, traffic, lives, score, tick, or completed crossings.

**Why this priority**: Player approval separates evaluation from changes to the game.
**Independent Test**: Generate during active play, observe unchanged gameplay, then activate
Play this level and verify a fresh game with precisely the preview's traffic and settings.

**Acceptance Scenarios**:

1. Given pending generation or a ready preview, when the player makes gameplay moves,
   then their existing game continues normally.
2. Given a verified preview, when Play this level is activated, then a fresh generated
   game begins at tick zero with the captured lives and crossing target.
3. Given a generated game, when R is pressed, then that exact generated level restarts.
4. Given a generated game, when any preset button is activated, then its original preset
   starts, including when it equals the last remembered preset choice.
5. Given a generated completion, when delayed coaching is requested, then its summary
   identifies generated traffic rather than incorrectly calling it easy, normal, or hard.
6. Given a page reload, when the game initializes, then the ordinary query configuration
   and preset apply; generated traffic is not persisted.

### User Story 3 - Understand controlled stops (Priority: P1)

The player receives a useful, truthful result when generation stops, without internal
diagnostics or an unsafe level disguised as success.

**Why this priority**: Failure behavior is a core Week 05 requirement.
**Independent Test**: Script forbidden tool, repeated candidate, provider failure and
deadline cases, and assert execution counts, terminal status, reason and preview eligibility.

**Acceptance Scenarios**:

1. Given an unknown first tool request, when validation rejects it, then zero tools execute,
   generation fails, and no level is previewed.
2. Given a provider failure or exhausted decision budget, when a verified candidate or
   permitted verified template is available within the limits, then it is identified as a
   fallback with its actual rating and stop reason, rather than a completed agent run.
3. Given no valid proof or a cancelled request, when generation terminates, then no
   playable preview is offered and the existing game remains available.
4. Given a newer request or preset selection, when an older response arrives late, then
   that response cannot replace the current preview or start a game.

### Edge Cases

- Valid fields but overlapping vehicles, duplicate starts, missing/duplicate lane rows,
  unknown properties, excessive payloads, and fully occupied lanes.
- A lane that always has an empty cell but has no cell safe before AND after movement.
- One crossing is possible but the complete requested target has not been proved.
- A final proposal references an unevaluated, impossible, or modified candidate.
- First-decision final response before any tool evidence; repeated identical candidate;
  third revision; cancellation during model work or a CPU-bound solver.
- Provider retries consume attempts without becoming additional decisions; no fresh budget
  is granted by retries, fallback, verification or a deadline.
- Text entry or focused generator controls must not consume gameplay turns.
- Rejection or failure must not silently downgrade the requested crossing target.

## Requirements

### Functional Requirements

- **FR-001**: Offer a 1..5 target challenge selector and Generate level action. Use the
  current validated lives and crossing target; the board remains nine columns and five lanes.
- **FR-002**: Validate the initial request before any model/tool operation. Do not accept
  arbitrary tool names, URLs, file paths, model choices or extra request fields from a player.
- **FR-003**: Keep generation in the local backend. Supply only the goal, fixed rules,
  traffic contract, permitted tool, remaining limits and bounded evidence from this run.
- **FR-004**: A successfully completed agent run MUST contain at least two model decisions
  and a requested, executed, validated evaluation between those decisions.
- **FR-005**: Expose only one read-only evaluation tool, solveLevel, in this version.
  Validate its name, arguments, scope and remaining resources before execution.
- **FR-006**: Candidate traffic MUST have exactly five unique lane rows, valid direction,
  bounded integer movement intervals and vehicle placements, no overlaps and at least one
  empty cell per lane throughout the cycle. Reject malformed or out-of-range proposals.
- **FR-007**: Evaluation MUST use the same turn rules as gameplay and distinguish solved,
  proved impossible, and incomplete verification. A solved result includes replayable proof,
  minimum safe winning moves for the full target, and first-crossing measurements.
- **FR-008**: Validate and bound tool results before returning them to the model. The model
  cannot author proof, verified metrics or the authoritative completion flag.
- **FR-009**: Enforce at most five decisions, six provider attempts, eight solver executions
  including final/fallback verification, three distinct candidate evaluations (initial plus
  two revisions), one retry per decision, and a 45-second run deadline. A solver invocation
  has a two-second timeout, with reserved time for final verification or fallback.
- **FR-010**: Stop repeated normalized candidate requests without executing them again.
  Only transient provider failures are retryable, within the shared budgets and deadline.
- **FR-011**: Accept a final selection only for an already evaluated candidate in the same
  run. Revalidate and reverify its exact traffic/settings before preview. Full completion
  additionally requires the requested rating to match the computed rating.
- **FR-012**: On operational/budget stops, return the last successfully verified candidate
  or a predefined template only if a current proof is available within all limits. Mark it
  as fallback with the actual rating. Security/schema/final-selection rejection and explicit
  cancellation produce no fallback preview.
- **FR-013**: Generation and evaluation MUST NOT mutate the active browser game. Only
  Play this level applies a verified preview and resets the game to its initial state.
- **FR-014**: Preserve R1..R5, existing preset traffic, query validation/default behavior,
  keyboard gameplay and original preset golden paths. Generated traffic is a narrow R6
  addendum; starting approved generated play is a settings action under the R7 addendum.
- **FR-015**: R restarts the active level. Preset selection leaves generated mode and
  restores the selected original preset. Reload clears previews and generated traffic.
- **FR-016**: Preserve delayed Week 04 advice behavior. Generated completions use an
  explicit generated-origin label without adding traffic or action history to its summary.
- **FR-017**: Display target and measured ratings, verification/fallback status, and a safe
  terminal reason. Show no raw model payload, proof path, secret or hidden reasoning.
- **FR-018**: Invalidate stale responses, propagate disconnect/cancellation, and prevent
  focused generation controls from consuming gameplay moves. Permit one active generation
  run per local server; concurrent generation gets a bounded busy response.
- **FR-019**: Keep keys/provider SDK server-side, preserve loopback/Host/no-CORS controls,
  and keep tools free of network, filesystem, persistence and canonical game-state writes.
- **FR-020**: Record bounded evidence: run status/reason, decisions, attempts/retries,
  requested/executed tool counts, verification purpose, candidate identity, timings and
  validation categories. Fake tests must prove rejected tools execute zero times.

### Key Entities

- **Generation request**: Target rating and captured current lives/crossing target.
- **Traffic candidate**: Bounded lane definitions, normalized identity and request settings.
- **Verification evidence**: Solver outcome, replayable proof and computed measurements.
- **Agent run**: Explicit state, counters, deadline, current evidence and terminal reason.
- **Verified preview**: Exact candidate, settings, measurements and completion/fallback status.
- **Active level selection**: Ordinary preset or player-approved generated traffic.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Every playable preview has a proof that wins the entire captured crossing
  target from tick zero without losing a life under the actual game rules.
- **SC-002**: Scripted successful runs demonstrate at least two model decisions with
  one genuine evaluation between them; an early final cannot pass as completed.
- **SC-003**: Unknown tools, invalid arguments and invalid initial requests execute zero
  tools for the rejected proposal; bad initial input also makes zero provider attempts.
- **SC-004**: Limit, repetition and cancellation scenarios cannot exceed the declared
  decision/attempt/tool/revision limits or start new work after their permitted deadline.
- **SC-005**: An impossible fixture and an interrupted search produce different outcomes;
  no incomplete proof produces a playable preview.
- **SC-006**: A ready preview cannot change an active game until player approval; playing,
  restarting, choosing any preset, and reloading have the specified traffic behavior.
- **SC-007**: All existing preset paths and delayed advice expectations remain valid;
  generated completions are explicitly identified and retain the same advice delay.
- **SC-008**: The evidence package includes success, revision, rejected tool, failure and
  deadline/budget traces, five or more prewritten evals, and actual required check results.

## Assumptions

- Version one uses structured controls rather than a natural-language goal parser.
- Challenge rating is an objective first-crossing planning-length proxy, not a guarantee
  about a human player's experience. Exact rating boundaries are defined in the data model.
- Requests capture current lives and crossing target; the model cannot change either.
- Generation uses the existing Gemini integration through a new decision contract, not
  the coaching service's tip-only method; provider selection remains application-owned.
- No live calls occur during planning or ordinary tests. A limited live confirmation
  requires explicit user authorization in the implementation chat.
- Scope acceptance is recorded from the user's approval; implementation/test completion
  and the second student's contributions are not inferred.

## Out of scope

Six lanes or variable dimensions; changing turn/collision rules; RNG during play; agent
control of the player or active traffic; simulate/getDifficultyMetrics as separate tools;
natural-language interpretation; more than one application-selected backup provider;
persistence, database or deployment;
arbitrary shell/browser/filesystem/network tools; swarms; background generation; automatic
level application; exposing solver paths to the player; unrelated UI redesign.
