# Feature Specification: Bounded backup model failover

**Feature Branch**: suggested `codex/008-model-failover`; documentation stays on the current branch.
**Created**: 2026-10-06
**Status**: Scope, compatibility amendments and implementation approved/completed 2026-10-06; offline verification passed; live calls remain unauthorized.
**Input**: The user wants a backup model when the main model reaches a usage limit or takes too long, and then asked to document the change.

## User Scenarios & Testing

### User Story 1 - Continue level generation with a backup (Priority: P1)

A player requests a verified challenge. When the primary model is rate-limited, unavailable
or too slow, the application asks a configured backup to continue the same generation run.

**Why this priority**: A temporary model problem should not unnecessarily prevent generation.
**Independent Test**: Script a primary quota failure, let a fake backup propose traffic and
select the solver-verified result, and inspect the resulting playable preview.

**Acceptance Scenarios**:

1. Given an enabled, configured backup, when primary capacity is exhausted, then the backup
   receives the same captured goal, traffic rules, prior candidates and verification evidence.
2. Given a primary call that has not finished within its eight-second allowance, when that
   allowance expires, then it is cancelled locally and the backup can use up to seven seconds
   within the same fifteen-second decision phase.
3. Given a successful primary response, when it validates, then no backup request is made.
4. Given a provider switch, when generation continues, then candidate identities, counters,
   revision limits and the original deadline remain part of the same run.
5. Given a valid backup final selection, when independent final verification succeeds, then
   the ordinary verified preview is offered and still requires explicit player approval.

### User Story 2 - Preserve delayed coaching through provider failure (Priority: P2)

A player receives post-game advice using the existing one-completed-run delay, even when
the primary advice model needs the configured backup.

**Why this priority**: Recovery must preserve the coaching experience already accepted.
**Independent Test**: Script quota or timeout failure followed by valid backup advice;
complete the next game and verify that the advice appears at its usual time.

**Acceptance Scenarios**:

1. Given a completed game and an eligible primary failure, when valid backup advice arrives,
   then it remains hidden until the next completed game under the existing lifecycle.
2. Given a pending job that is superseded, when either model settles late, then neither
   result can replace the current job or appear early.
3. Given failed recovery, when no validated advice is available, then the existing safe
   unavailable notice is used; no tip is fabricated.

### User Story 3 - Receive a bounded, truthful result (Priority: P2)

A player receives a verified recovery level or a safe unavailable result when AI recovery
cannot finish. The app remains responsive to cancellation and ordinary gameplay.

**Why this priority**: Useful recovery and truthful failure presentation complement the primary journey. Critical budget, cancellation and validation guards are mandatory prerequisites for every story, including the MVP.
**Independent Test**: Force both providers to fail, cancel between attempts, and return late
or invalid backup responses. Assert bounded operation counts and preview eligibility.

**Acceptance Scenarios**:

1. Given both models fail operationally, when a same-run verified level or verified template
   is available within the remaining limits, then generation identifies it as recovery and
   keeps its actual rating and original stop reason.
2. Given invalid structured output, a forbidden tool, invalid arguments or an invalid final
   selection, when the app rejects it, then another model is not asked to bypass that rejection.
3. Given explicit refusal, cancellation or disconnect, when it occurs, then no new backup
   request begins; existing cancellation and permitted refusal handling remain authoritative.
4. Given generation reaches its forty-second decision cutoff, when recovery is considered,
   then no further model call starts; final verification/recovery can use only the existing
   reserve before the forty-five-second absolute deadline.

### Edge Cases

- Rate limits, quota exhaustion, temporary overload, request timeout and transport failure.
- Primary completes exactly at its deadline or returns after the backup has started.
- Backup is disabled, has invalid configuration, or lacks the required structured-output capability.
- Too little time or too few provider attempts remain to begin backup work.
- Primary emitted a complete but invalid proposal versus a response truncated by its output limit.
- Backup also fails, rate-limits or refuses; it must not cause another provider switch.
- Two requests run independently; one request switching providers cannot change the other's routing.
- Generated advice uses the accepted eight-field summary and retains its generated-origin label.
- Both providers share a limit; a second model is not a guarantee of availability.

## Requirements

### Functional Requirements

- **FR-001**: Support exactly one primary and at most one configured backup for each covered AI operation.
- **FR-002**: Provider/model selection, credentials and failover decisions MUST remain application-owned and server-only; player or model input cannot override them.
- **FR-003**: Failover MUST be opt-in. Disabled mode preserves current primary-only behavior. Invalid enabled configuration must produce a safe configuration error before provider work.
- **FR-004**: Primary quota/rate-limit, timeout, transient transport and supported temporary-service failures MUST be eligible for one bounded backup attempt when enabled and resources remain.
- **FR-005**: Validation/security rejection, authentication/configuration errors, explicit model refusal and cancellation MUST NOT trigger a backup call. A known provider output-token cutoff may end provider work and use ordinary application recovery, but must not trigger model failover in this version.
- **FR-006**: Enabled mode MUST allow at most eight seconds for the primary and seven seconds for a backup attempt, with a fifteen-second shared provider phase per logical decision or advice job, shortened by remaining outer deadlines.
- **FR-007**: Switching providers MUST NOT run both models deliberately in parallel. The application must locally abort/invalidate the first attempt and reject its late result.
- **FR-008**: Level generation MUST retain at most five decisions, six provider attempts in total, two attempts per decision, three candidates, two revisions, eight solver executions, a forty-second decision cutoff and a forty-five-second run deadline. Failover cannot reset any limit.
- **FR-009**: A model switch MUST continue the same generation request, stored candidate/evaluation identities and bounded validated context, without replaying accepted solver calls solely to supply the backup.
- **FR-010**: After an eligible primary failure selects backup, remaining decisions in that generation run MUST use backup only. A new run starts with primary again.
- **FR-011**: A backup-only decision may retry one transient failure within the same attempt and time limits. Backup failure cannot route back to primary or to a third model.
- **FR-012**: Outputs from both providers MUST satisfy the same operation contracts and authority checks. Every offered generated level must retain current deterministic full-target verification and explicit Play approval.
- **FR-013**: When model recovery is unavailable or exhausted, generation MUST preserve the existing verified-level/template recovery policy; delayed advice MUST preserve its existing unavailable behavior.
- **FR-014**: Delayed advice MUST use at most two provider attempts across primary and backup in enabled mode, without changing its eight-field input, focus/evidence derivation or one-completed-run delay.
- **FR-015**: Cancellation, disconnect and supersession MUST propagate to active provider work, prevent additional attempts and prevent late browser updates.
- **FR-016**: Provider switches MUST produce bounded safe diagnostic evidence identifying operation, provider role, failure category, counters and elapsed time. No credentials, complete prompts, raw outputs or hidden reasoning may be retained.
- **FR-017**: Endpoint contracts, browser request fields, gameplay, presets, solver policy and local server security MUST remain unchanged. This feature adds no model picker or technical player-facing controls.
- **FR-018**: Expectations for routing, failures, budgets, validation and existing workflows MUST be fixed and tested with fake transports/clocks before implementation behavior changes. Live verification remains separately authorized.
- **FR-019**: Concrete backup access and structured-output capabilities MUST be selected and recorded before provider-specific implementation. Shared quota behavior must be considered; a new API key alone is not evidence of independent limits.
- **FR-020**: The accepted single-provider restrictions in features006/007 MUST receive a narrow, recorded addendum before feature implementation; this draft cannot silently override higher-priority sources.

### Key Entities

- **Provider profile**: Application-approved provider/model identity and supported operations; credentials are external to evidence.
- **Logical decision/job**: Existing application operation with one provider phase and a shared resource budget.
- **Provider attempt**: One invocation of one provider adapter, its role, deadline and outcome.
- **Routing state**: Primary or backup selection belonging only to the current run/job.
- **Verified result**: Existing generation preview or advice response after all current validation gates.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Every scripted primary quota failure with a working eligible backup completes the ordinary validated operation without an extra player request.
- **SC-002**: Every scripted primary timeout aborts at eight seconds or the earlier outer cutoff; backup starts only when time remains, and the provider phase ends within fifteen seconds in enabled mode.
- **SC-003**: All successful-primary scenarios make zero backup attempts, and all tested runs respect their original overall resource ceilings.
- **SC-004**: Every preview produced through backup or application recovery wins the entire captured crossing target without life loss; unsafe or cancelled results offer no playable level.
- **SC-005**: All advice lifecycle regression scenarios retain their previous visibility timing and safe unavailable behavior.
- **SC-006**: All scripted invalid-output, refusal, cancellation and credential-error scenarios make zero failover calls; late responses never resurrect a terminal operation.

## Assumptions

- The user explicitly selected Gemini 2.5 Flash (`gemini-2.5-flash`) as the backup for both level generation and delayed advice on 2026-10-06. Official docs show structured-output support for this model; account access remains unverified because live calls are not authorized.
- Gemini API limits are project-level, not per key, so the selected backup may share quota exhaustion with the existing primary. The switch can still recover model-specific capacity, timeout, or temporary-service failures; it does not promise independent quota.
- Eight/seven/fifteen seconds are proposed initial enabled-mode policy constants, not measured production latency claims. Disabled mode keeps existing timing/retry behavior.
- The user explicitly authorized implementation for both AI operations and the narrow compatibility amendments in this package. No live provider call, credential creation, commit, push, merge or deployment is authorized.
- Core game rules and accepted features001–007 remain authoritative except for the narrowly recorded, server-only routing/timing amendments; all their gameplay, validation, security, proof and lifecycle requirements remain in force.
