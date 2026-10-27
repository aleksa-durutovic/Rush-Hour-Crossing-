# Feature Specification: Secure the Arcade

**Feature Branch**: codex/ai-level-generator-feature
**Feature Directory**: specs/009-secure-the-arcade
**Created**: 2026-10-27
**Status**: User-approved scope; specified and planned; implementation pending
**Input**: Harden the existing AI level generator for Week 08; include shared API/browser
protections and advice regressions, and prepare a code-free cheaper-model handoff.

## User Scenarios & Testing

### User Story 1 - Generate within enforced boundaries (Priority: P1)

A local player requests a challenge, inspects a verified preview and chooses Play.
Invalid requests or model proposals cannot bypass verification or change active play.

**Why this priority**: Preserve the useful W05 flow and prove application-owned authority.
**Independent Test**: Two fake model decisions with real solver work between them and
separate final verification; a rejected initial request starts no provider/tool work.

**Acceptance Scenarios**:

1. **Given** valid settings, **when** the model proposes allowed traffic and selects its
   verified evidence, **then** a playable preview is returned without changing active play.
2. **Given** malformed input or extra privilege fields, **when** sent directly to the API,
   **then** rejection precedes all provider attempts and solver execution.
3. **Given** an unknown tool, invalid arguments or another run's evidence references,
   **when** proposed, **then** no unauthorized execution, data access or preview occurs.
4. **Given** excessive/invalid provider or tool output, **when** received, **then** it is
   rejected or explicitly projected, with no raw extra fields in subsequent model context.

### User Story 2 - Bound work and recover safely (Priority: P1)

A player gets a controlled response when capacity or request allowance is exhausted,
then can retry after genuine recovery without losing gameplay.

**Why this priority**: Per-run ceilings do not bound repeated requests or orphaned work.
**Independent Test**: Fake time and delayed providers prove exact admission bounds,
actual active-work bounds, bounded failover and successful later admission.

**Acceptance Scenarios**:

1. **Given** one generation and one advice job, **when** excess work is requested,
   **then** it is rejected before provider work and no hidden queue is created.
2. **Given** five jobs admitted in a rolling minute, **when** another valid job is requested,
   **then** it is rate-limited; after the window expires a legitimate job succeeds.
3. **Given** a provider ignores abort, **when** its caller times out/disconnects, **then**
   late success is ignored and capacity remains reserved until started work settles.
4. **Given** enabled failover, **when** a permitted transient failure occurs, **then**
   backup uses the same budgets without waiting for old abort acknowledgement.

### User Story 3 - Display text and retain private diagnostics (Priority: P2)

Players see legitimate text safely. Local operators explain decisions without collecting
prompts, game statistics, credentials or raw provider content.

**Why this priority**: Structured valid output can still contain dangerous text or secrets.
**Independent Test**: Real-browser DOM/content-policy proof and synthetic-secret/log tests.

**Acceptance Scenarios**:

1. **Given** markup-like response text, **when** rendered, **then** it remains inert text
   or is rejected; normal Serbian letters, apostrophes and a < b remain usable.
2. **Given** the production build, **when** a known available forbidden script is inserted,
   **then** the browser records the responsible content-policy violation and no execution,
   while normal gameplay and fake-backed generation still work.
3. **Given** a synthetic secret in an internal error or disallowed tool field, **when**
   handled, **then** no response, model context, event or client artifact contains it.
4. **Given** allow/deny/terminal decisions, **when** events are recorded, **then** only
   fixed bounded metadata and actual counters are retained, without forged log events.

### User Story 4 - Reproduce and explain evidence (Priority: P2)

Both students can reproduce the local suite and explain its results and practical limits.

**Independent Test**: A reviewer follows the stated checkpoint and commands without a real
provider key and locates the T00-T17 expectations and actual evidence.

**Acceptance Scenarios**:

1. **Given** prewritten expectations, **when** tests execute, **then** evidence distinguishes
   planned, executed, observed and concluded results for every required scenario.
2. **Given** three selected before/after cases, **when** repeated, **then** fixtures and
   criteria are unchanged; existing protection has not been removed for demonstration.
3. **Given** a failing baseline gate, **when** implementation starts, **then** its measured
   cause is resolved and checked before expanding functional behavior.

### Edge Cases

- Chunked oversized bodies, invalid UTF-8/JSON, null/missing/extra fields and exact limits.
- constructor/toString tool names; valid-shaped foreign/nonexistent evidence IDs.
- Extra tool fields with synthetic secrets; reordered duplicate traffic.
- Exhausted attempts, late primary/backup results, cancellation during solver batches.
- Closed HTTP response with unresolved underlying work; same-time competing admissions.
- Rate-window boundary; rejected requests do not spend allowance.
- Forged score/settings/correlation ID; markup-like text, Unicode and literal URL text.
- Development proxy/HMR versus production policy; disallowed and absent Origin.

## Requirements

### Mandatory invariants

| ID | Invariant |
|---|---|
| I1 | Invalid or disallowed initial HTTP requests start zero provider attempts and zero business-tool executions. |
| I2 | Browser/model data cannot select identity, authorization, provider configuration or security limits. |
| I3 | Only an allowlisted tool with valid arguments and run-local data scope may execute. |
| I4 | Generation is read-only; only player Play applies a verified preview to active state. |
| I5 | Untrusted content never becomes executable browser content. |
| I6 | Calls, duration, data sizes and concurrent underlying work have server-enforced bounds. |
| I7 | Secrets stay server-side; output, model context and events receive only necessary data. |
| I8 | Normal W05 generation and gameplay continue to succeed. |

### Functional Requirements

- **FR-001**: Preserve gameplay/presets, deterministic proof, Play approval, advice delay and
  opt-in failover; retain a successful two-decision real-tool flow. [I4,I8]
- **FR-002**: Reject invalid request format, size, domain values and extra privilege fields
  before provider/tool work; accept legitimate boundary values. [I1,I2]
- **FR-003**: Enforce local-only/same-origin access, including Host, Origin where supplied,
  unknown routes and no browser/model-selected configuration. [I1,I2]
- **FR-004**: Enforce tool name, argument and run-local evidence scope independently. [I3]
- **FR-005**: Validate shape, fields and size at model/tool/final boundaries; project compact
  evidence and keep internal proof out of model context. [I3,I7]
- **FR-006**: Preserve per-operation attempts, decisions, solver, repetition, timeout,
  deadline and failover limits; reject late results. [I6]
- **FR-007**: Permit at most one generation job, one advice job and two combined per local
  process; no queue; five admitted AI jobs per rolling 60 seconds globally. [I6]
- **FR-008**: Hold capacity for unresolved underlying work after timeout/cancel/response;
  release exactly once after logical completion and actual work settlement. [I6]
- **FR-009**: Render untrusted content as plain text or reject it, preserving legitimate
  Unicode; prove DOM safety and lack of execution in a real browser. [I5]
- **FR-010**: Enforce a production browser content policy restricting scripts/connections,
  objects, base URLs and framing; preserve content-type/referrer protection. [I5,I8]
- **FR-011**: Record bounded allow/deny/terminal events with fixed fields, application-owned
  correlation IDs and actual counters; exclude raw content and prevent log injection. [I7]
- **FR-012**: Prove synthetic-secret non-disclosure across frontend artifacts, HTTP, model
  context and events after proving the server adapter received that value. [I7]
- **FR-013**: Treat browser game data as unverified; forged data cannot grant privileges
  or become a certified server score. Do not invent accounts or storage. [I2,I4]
- **FR-014**: Automate T00-T15 and T17, test T04/T05 in a real browser, prove T16 against
  production and provide positive controls for every main boundary. [I1-I8]
- **FR-015**: Record six concrete risks, three priorities, I1-I8 traceability, T00-T17,
  three identical-input comparisons and an eight-minute demo runbook.
- **FR-016**: Resolve measured baseline failures first; audit actual dependency versions,
  exposure and decisions; run required regression gates and record actual results.
- **FR-017**: Keep adversarial checks local and fake-backed, with no live fallback, real
  secret access or normal-runtime test-provider switch.
- **FR-018**: Supply one documented security command and actual AI/contribution records;
  distinguish unknown student contributions and branch work from submitted work.

### Key Entities

- **Admission lease**: server-owned capacity/rate decision for one operation.
- **Run-local evidence**: existing candidate/evaluation references and compact verified data.
- **Security event**: bounded metadata about accepted, denied or completed operations.
- **Evidence case**: fixture, prior expectation, command, observed counters/state and limits.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Normal fake-backed generation has at least two model decisions, one real
  requested solve and independent final verification; gameplay succeeds afterward.
- **SC-002**: Rejected initial HTTP cases have zero provider/tool work; rejected tool
  proposals have zero execution of the forbidden action.
- **SC-003**: Admitted/draining jobs never exceed one per operation or two combined;
  no sixth job is admitted within the rolling minute.
- **SC-004**: Browser checks find no executable injected DOM, marker execution or forbidden
  navigation; a known available forbidden script is blocked by active content policy.
- **SC-005**: A server-loaded synthetic secret is absent from all inspected responses,
  model contexts, events and frontend artifacts.
- **SC-006**: T00-T17 have reproducible evidence, with T00-T15/T17 automated and at least
  three identical-input/expectation comparisons.
- **SC-007**: All required gates pass at completion, or precise blockers are reported
  and the implementation is not claimed complete.

## Assumptions

- Single-user loopback demo: no accounts, private saved resources, access cookies,
  database, localStorage or leaderboard. Candidate IDs are references, not credentials.
- Generator input is bounded structured settings, not free-form user text. T09 proves
  execution rejection, not live-model prompt-injection resistance.
- The shared five-per-minute limit counts generation and advice together. Busy/rate
  responses preserve gameplay. In-memory limits apply to one process only.
- No optional challenge or new game feature. Narrow security transport errors and a
  plain-text explanation of unverified local scores may be added if needed.
- User approval covers this scope and handoff; it does not establish student-pair review,
  individual contributions, live calls, commits, pushes, merges or deployment.
