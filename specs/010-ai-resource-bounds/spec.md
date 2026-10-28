# Feature Specification: Cumulative AI attempts and bounded generation reads

**Feature Branch**: `codex/ai-level-generator-feature` (unchanged)
**Feature Directory**: `specs/010-ai-resource-bounds`
**Created**: 2026-10-28
**Status**: Owner decisions and local implementation authorized 2026-10-28; local implementation and verification complete; account review remains unverified
**Baseline**: `779cd397b4797a551607c69169f96d88b586e835`
**Input**: Implement and verify two narrow security fixes; preserve a separate manual
Gemini account checklist. No commit, push, merge, deployment or live provider call.

## User Scenarios & Testing

### User Story 1 - Bound cumulative AI work (Priority: P1)

As the local operator, I want generation and delayed advice to share a finite allowance
of provider attempts so repeated requests cannot spend an unlimited number in one session.

**Why this priority**: Five admissions per minute and per-operation ceilings limit rate
and individual jobs, but do not limit cumulative attempts across repeated minutes.
**Independent Test**: Exhaust a small injected allowance through both real HTTP operations
with fake transport, cross the rolling-minute boundary, and prove zero further starts.

**Acceptance Scenarios**:

1. Given a server-process session with allowance N, when generation and advice use primary,
   retry or backup invocations, then each started invocation consumes exactly one of N.
2. Given one remaining attempt and competing operations, when they request it, then exactly
   one invocation starts; the loser consumes neither an attempt nor a pending-work entry.
3. Given exhaustion, when another minute passes, a browser reloads, a new job starts, or
   routing changes, then no allowance is refilled and no new provider invocation starts.
4. Given cancellation before invocation, when work is rejected, then no attempt is spent.
   Cancellation after invocation never refunds it; unresolved work retains its draining lease.
5. Given exhaustion during a generator run, when verified operational recovery is eligible,
   then only the existing bounded local fallback policy may offer a preview; it stays
   incomplete, truthfully labelled, and requires explicit Play.
6. Given exhaustion before initial admission, when an otherwise admissible request reaches
   either AI route after existing validation, service, capacity and rate checks, then it
   returns a fixed unavailable error with zero provider/tool work and no new lease.
   Existing busy/rate rejection takes precedence over budget denial.

### User Story 2 - Stop oversized generation downloads early (Priority: P1)

As a player, I want an oversized or corrupt generation response rejected during bounded
consumption while the active game, cancellation and stale-response safeguards keep working.

**Why this priority**: The production response cap is useful; a browser must also defend
against a faulty response source without materializing its entire body first.
**Independent Test**: Feed controlled multi-chunk responses through the real generator client
and observe read/cancel/cleanup counts, validation results and unchanged browser lifecycle.

**Acceptance Scenarios**:

1. Given valid content of exactly 16,384 bytes, when consumed in arbitrary chunks, then
   valid UTF-8, JSON and existing response validation succeed.
2. Given the next delivered chunk would exceed 16,384 bytes, when received, then consumption
   stops immediately, cancellation is requested, and no subsequent read or JSON parse occurs.
3. Given absent, false, or otherwise misleading Content-Length, when content is consumed,
   then actual delivered bytes determine the limit.
4. Given invalid UTF-8/JSON, interrupted delivery or cancellation, when the request finishes,
   then no preview is accepted and every acquired reader is released.
5. Given a cancelled or superseded request, when its old stream later settles, then it
   cannot install a preview or change the active game.

### User Story 3 - Review actual provider-account controls (Priority: P2)

As the owner, I want a manual checklist distinguishing restrictions and usage-stopping
controls from notifications, with unsupported account facts explicitly left unverified.

**Why this priority**: Repository limits cannot establish the actual Google account's
restrictions, quotas, billing configuration or other consumers.
**Independent Test**: Review a separate checklist against dated official Google sources;
every account-specific answer remains pending until the owner inspects it privately.

**Acceptance Scenarios**:

1. Given official current documentation, when controls are described, then API/client
   restrictions, rate quotas, spend-cap enforcement and alerts have distinct effects.
2. Given account facts absent from the repository, when evidence is prepared, then their
   state is unverified; no credential or live request is used to fill the gaps.

### Edge Cases

- Final allowance used by a primary that times out while ignoring abort; backup is denied.
- Last allowance used by a later backup-only decision; no reset on its transient retry.
- Synchronous invocation throw, rejected promise, late success and diagnostic-sink failure.
- Accepted jobs racing for the final allowance; invalid/busy/rate/budget denials.
- A final successful allowed invocation followed by local independent proof: completion
  remains legal, even though the shared allowance is now zero.
- Hot reload/process restart creates a new process session; multiple processes each have
  their own allowance. Browser tabs, jobs and game runs are not separate budget sessions.
- One oversized chunk, split multibyte characters, fatal decoding, empty or missing body,
  malformed JSON, clean close with incomplete JSON, thrown stream error and rejected cancel.
- Browser/network buffering may already contain extra bytes; cancellation does not undo
  allocations or guarantee that remote work/billing has stopped.

## Requirements

### Functional Requirements

- **FR-001**: One finite server-owned allowance MUST be shared across both AI operations
  for the lifetime of the serving Node process. Restart resets it; elapsed time, browser
  reload, request, decision, retry and model switch do not.
- **FR-002**: The owner-approved allowance is **60 attempts per server process**
  (approved 2026-10-28). It MUST NOT be claimed as an exact monetary spending cap.
- **FR-003**: Capacity MUST be reserved atomically immediately before each invocation.
  Every started primary, retry and backup invocation counts once, including synchronous
  throw/failure; a denied invocation counts zero. No refund after a start.
- **FR-004**: Initial invalid/busy/rate/budget denial and cancellation/deadline before a
  provider start MUST consume zero provider allowance. Existing admission-rate accounting
  for already accepted jobs is retained.
- **FR-005**: Browser/model input MUST NOT select, refill, reset, disable or override the
  allowance. No reset endpoint, browser storage authority or new environment setting.
- **FR-006**: Budget denial MUST be terminal for provider work in that operation, never
  a transient failure, retry or model-switch trigger. It MUST NOT inflate attempt/retry
  counters, emit a started/switch event, create orphan work, or retain cleanup resources.
- **FR-007**: Exhaustion MUST NOT release unresolved started work early. Existing active/
  draining leases, cancellation precedence, late-result suppression and release-once
  behavior MUST remain intact. Already started work may finish and is never refunded.
- **FR-008**: Generation stopped by the shared budget MAY use only existing operational
  fallback, proof and deadline rules; no unverified preview, automatic Play or provider
  work for recovery. Initial budget denial starts zero tools. Advice becomes unavailable
  under its existing one-completed-run delay; no fabricated tip.
- **FR-009**: Fixed safe API failure behavior MUST disclose no credential, raw exception,
  remaining session count, refill control or provider configuration. Ordinary game play
  MUST stay available; no automatic browser retry or UI redesign is added.
- **FR-010**: Existing operation ceilings, deadlines, failover eligibility, selected
  models, disabled-default failover and SDK one-attempt behavior MUST remain unchanged.
- **FR-011**: Generation responses MUST be limited to 16,384 actual delivered bytes while
  reading. Stop on the first overflowing chunk, request cancellation and issue no further
  reads. Do not trust Content-Length or first materialize unbounded text.
- **FR-012**: JSON parsing MUST occur only after bounded reading completes and fatal UTF-8
  decoding succeeds. Existing strict response and cross-field validation MUST be retained.
- **FR-013**: Every acquired reader MUST release its lock on success, failure and
  cancellation. Abort must stop acceptance and request stream cancellation; cleanup
  failures must not cause unhandled rejection or an unbounded wait for acknowledgement.
- **FR-014**: Existing abort handling, request identity/stale suppression, verified
  preview/explicit Play, reload behavior and active game state MUST remain intact.
- **FR-015**: A separate manual checklist MUST use current official Google documentation,
  distinguish request-rejecting controls from alerts, and identify account facts that
  cannot be verified from repository evidence. No settings changes or live probes.
- **FR-016**: Preserve gameplay, presets/golden paths, pure deterministic logic, the sole
  read-only solveLevel tool, independent final verification and secret isolation.
- **FR-017**: Record regression/eval expectations before implementation, real baseline
  results, exact affected paths, handoff and Spec Kit consistency analysis; preserve all
  pre-existing work and keep the current branch. Do not imply implementation or submission.

### Key Entities

- **Process session**: One serving Node process, its cumulative allowance and started count.
- **Attempt reservation/start**: One atomic authorization coupled to one actual invocation.
- **Job lease**: Existing admission, attempt/tool counters and underlying-work lifetime.
- **Bounded response read**: At most 16,384 retained bytes and a cleanup-owned reader.
- **Account verification item**: Official source, stated enforcement, private owner check
  and pending/sanitized verification status.

## Success Criteria

### Measurable Outcomes

- **SC-001**: In scripted mixed-operation traces, total starts never exceed N, and after
  N starts no new provider invocation occurs across later minutes or browser reloads.
- **SC-002**: Every allowed start is counted once; denied starts add zero counters/work.
  Started work retains capacity until settlement; no cancellation refills allowance.
- **SC-003**: Oversized streams are cancelled on the first overflowing chunk without a
  later read or parse; valid exact-limit content passes unchanged response validation.
- **SC-004**: Invalid encoding, malformed/truncated content, abort and cleanup-failure
  cases accept zero previews and leave no acquired reader locked.
- **SC-005**: Existing successful proof/Play, delayed-advice, gameplay, golden-path,
  cancellation, failover and secret-isolation regressions pass with unchanged limits.
- **SC-006**: All requirements have dependency-ordered tasks and prewritten expectations;
  actual checks and manual account unknowns are distinguishable from proposed outcomes.

## Assumptions and owner review

- **P1 (approved 2026-10-28)**: 60 attempts per server process. At minimum healthy usage
  (two generation invocations plus one advice invocation), this allows about 20 cycles;
  retries consume it faster. The allowance is not a dollar cap or a substitute for
  provider-account controls.
- **P2 (approved 2026-10-28)**: One serving Node process defines the session. Restart,
  watch restart or crash resets it; other processes have independent allowances.
  Browser reload does not reset it. Durable/account-wide budgets remain outside scope.
- **P3 (approved 2026-10-28)**: Preserve busy/rate precedence before safe budget
  unavailability. Mid-run generation reuses provider_attempt_limit and existing verified
  fallback; advice retains delayed unavailability. No public session counters are added.
- Approval evidence: the owner replied, "1. 60 attempts per server process 2. accepted
  3. approved" to the three review decisions. A separate local implementation instruction
  was supplied on 2026-10-28 and its application/test scope is complete.
- Existing account keys/settings, effective quotas and spending controls are unverified.

## Out of scope

Credentials inspection; live provider calls;
commits/push/merge/deploy; new provider/service, account system, database or persistence;
game/preset/solver-rule changes; rich text; unrelated dependency changes; shared-reader
refactoring of advice; new UI for budget controls or reset.
