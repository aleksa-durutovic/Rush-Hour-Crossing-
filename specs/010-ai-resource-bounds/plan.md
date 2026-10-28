# Implementation Plan: AI resource bounds

**Branch**: `codex/ai-level-generator-feature` | **Date**: 2026-10-28
**Spec**: [spec.md](spec.md) | **Baseline**: `779cd397b4797a551607c69169f96d88b586e835`
**Stage**: Local implementation and verification complete; owner account review remains pending.

## Summary

Add one process-lifetime provider-start allowance to the existing admission/lease boundary.
Then independently replace the generator client's unbounded response.text() with a local
bounded stream read. Preserve current application behavior everywhere else.

## Technical Context

- Strict TypeScript; Node v24.14.0/npm 11.12.1 observed; existing Node24+/npm11+ requirement.
- Existing node:http, Gemini SDK, Zod, Vitest, Vite and Playwright; no dependency changes.
- One loopback server process, one same-origin browser app; no durable storage.
- Fake transport and injected monotonic time; production handler/services/solver stay real.
- Browser reader retains at most16,384 payload bytes; upstream buffering/oversized delivery
  and temporary bounded concatenation allocations are distinct from retained payload size.
- Existing admission: generation1, advice1, combined2; five accepted jobs/rolling60,000ms.
- Approved cumulative allowance60 per process, independent of those limits and immutable for the process.
- No unresolved technical research question; P1/P2/P3 owner decisions are recorded in spec.md.

## Constitution Check

| Gate | Before research | After design |
|---|---|---|
| I Locked scope | PASS: only two security corrections | PASS: no new game or infrastructure |
| II-III Pure deterministic turn logic | PASS | PASS: no src/game edit |
| IV Runtime boundaries | PASS | PASS: byte/UTF-8/JSON/schema order retained |
| V Configuration outside game logic | PASS | PASS: server allowance outside src/game |
| VI Tests/expectations before change | PASS: this session changes docs only | PASS by plan: red tests precede each slice |
| Baseline failure blocks expansion | CHECKED | PASS after serial browser rerun; see BASELINE.md |
| VII Smallest controlled change | PASS | PASS: two independent hypotheses, no shared-reader extraction |
| VIII Traceability/secrets | PASS | PASS: fakes, safe evidence, no credentials/live calls |
| Existing006-009 budgets/proof/approval/delay | PASS | PASS: stricter cumulative allowance; no widened limits |

No constitution amendment is proposed. Higher-priority current AGENTS.md and executed
baseline show009 implemented, although009 spec/plan still have historical pending wording.
Record that stale status; do not rerun009 or silently rewrite its package. The009 guide's
old instruction against accidentally creating010 applies to implementing009, whereas this
user explicitly requests a new addendum. Current instruction selects010 without a branch
change. Spec Kit setup's BRANCH output is a feature-context label; Git branch is separately
verified and remains codex/ai-level-generator-feature.

## Phase 0 - Research

[research.md](research.md) records decisions, alternatives and observed call paths.
[PROVIDER_ACCOUNT_CHECKLIST.md](PROVIDER_ACCOUNT_CHECKLIST.md) is the separate dated,
official-source manual review. It makes no assertion about the owner's account.

Hypothesis A: a synchronous process-owned gate at every actual provider start bounds
cumulative invocations without weakening rate/capacity/time/proof safeguards.
Hypothesis B: byte counting during stream consumption rejects an oversized generation
response before it is fully read. Evaluate each independently with unchanged expectations.

## Phase 1 - Data and contracts

[data-model.md](data-model.md) owns state/field constraints.
[contracts/resource-policy.md](contracts/resource-policy.md) owns ordering, errors,
accounting and cleanup. [REGRESSION_EVALS.md](REGRESSION_EVALS.md) owns fixed expectations.

### Fix 1 - Gate the actual provider start

1. Create a small server-only budget with immutable limit and monotonic started count.
   Construct it once with the existing production admission controller. Existing
   server/index.ts already composes one controller for both routes; no new singleton
   inside each service/request/model and no environment configuration are needed.
2. Initial admission: keep validation/service checks and capacity/rate precedence; before
   acquiring a lease/appending a timestamp, deny if the budget is already empty. This is
   a read-only precheck, not a reservation. A competing job may still win the final token.
3. For each lease.start('provider'), synchronously check terminal/start eligibility and
   reserve one token immediately before entering its provider thunk. Never await between
   check, debit, local counters and invoking the adapter. Solver starts do not debit it.
   Tracking attaches to the underlying returned promise before any timeout race.
4. Move disabled generator attempt/retry increments into the authorized invocation thunk.
   Prepare/validate context with projected next counters before this boundary; no invalid
   context spends a token. Commit those counters once inside the granted thunk so the
   provider still receives authoritative counters including its current attempt.
5. In enabled mode, align runEnabledProviderPhase callbacks/events with that same granted
   thunk. The phase supplies an explicit started callback to its run callback; services
   invoke it inside tracked provider work immediately before the adapter call. Only there
   update operation attempt/retry counts and sticky role. Emit actual-start/switch evidence
   only for an invocation that entered this boundary, including a synchronous throw.
   Scheduling/considering backup is not switching. This changes internal hook placement,
   not the8s/7s/15s policy, six-attempt generator ceiling or sticky backup semantics.
6. Preserve a dedicated server-only exhaustion sentinel through service normalization and
   phase timeout wrappers. Check it before transient/error conversion; caller cancellation
   remains dominant. No denied start invokes the adapter, increments counts, starts another
   retry/switch or schedules a further backoff. Existing already-scheduled backoff still
   checks cancellation and reaches the authoritative start gate before any invocation.
7. Initial denial returns fixed503 unavailable per operation (contract below). Mid-run
   generator denial reuses provider_attempt_limit and existing bounded operational
   fallback. Advice uses AdviceServiceError/ADVICE_UNAVAILABLE. No public session count.
8. Finally/abort paths retain all started promises. Zero pending work releases only after
   logical terminal; an uncooperative old provider keeps draining capacity. No token refund.
   No blanket abort merely because remaining reaches zero: already started work and local
   proof/final verification may finish under their existing deadlines.

Review pointer: current counters/events advance too early in services and enabled phase.
Simply throwing from lease.start without realigning those counters would be incorrect.

### Fix 2 - Local generator response reader

Keep the implementation private to src/level-generator/client.ts. Reuse the advice client's
general read/count/fatal-decode pattern as a reference, with explicit abort/cancel cleanup.

- Obtain one reader; missing body returns null. Consume Uint8Array chunks, count byteLength,
  reject the first chunk that would take the total above16,384, and retain no excess chunk.
- Request cancel immediately on overflow/abort; make no subsequent read. Cancellation is
  best effort and handled without waiting indefinitely for a source acknowledgement.
- Observe caller abort before/after asynchronous boundaries and cancel a pending read
  through a temporary abort listener. Remove it and release the reader in finally.
- Clean completion -> concatenate only bounded chunks -> fatal UTF-8 decode -> JSON.parse
  -> unchanged generationResponseSchema validation. No text()/json() shortcut.
- Stream error, malformed text/JSON, cleanup rejection or aborted/stale response cannot
  enable Play. Cancel unfinished reads on failure; handle cancellation rejection.
- Content-Length is not authority. Non-success responses return null without parsing;
  best-effort cancel their unused bodies. Controller/lifecycle remain the stale authority.

A shared reader is rejected for this slice: only the generator is defective, and advice
has a separate4096-byte limit and existing tests. Do not move or rewrite advice code.

## Project Structure and exact affected files

All paths below are repository-relative in the explicitly selected worktree.
The planned source and test changes were implemented in the separately authorized local
session; actual scope and verification are recorded in docs/EVIDENCE_W08.md.

| Future path | Change |
|---|---|
| server/security/provider-attempt-budget.ts (new) | Default constant, finite budget, private exhaustion sentinel, atomic start authorization |
| server/security/admission.ts | One shared budget; early empty denial; provider lease gate, truthful counters |
| server/app.ts | Map new admission-denial reason to fixed per-operation503; preserve event shape/release |
| server/advice/service.ts | Started accounting/hook alignment and nonretryable exhaustion in both modes |
| server/level-generator/service.ts | Same start alignment; preserve marker; existing operational fallback |
| server/ai/failover-policy.ts | Started callback placement, accurate events/role, terminal exhaustion propagation |
| src/level-generator/client.ts | Local bounded reader/UTF-8/abort/cleanup only |
| tests/security/provider-attempt-budget.test.ts (new) | Unit atomicity and no-refill expectations |
| tests/security/admission-budget.test.ts (new) | Budget precheck, denied timestamps, lease/counter/sync-throw cleanup |
| tests/security/session-budget.test.ts (new) | Mixed real-HTTP operations, windows, failover, cancellation/draining |
| tests/security/budget.test.ts | Retain/re-run per-operation timing and actual-start expectations |
| tests/server/failover-policy.test.ts | Denied primary/backup hooks/events and unchanged deadlines |
| tests/server/advice-service.test.ts | Both modes, denied retry, safe unavailable and real starts |
| tests/server/level-generator-service.test.ts | Both modes, counters/context, fallback/final/cancel |
| tests/server/fixtures/w08-server.ts | Optional synthetic injected admission/budget for small-limit scenarios |
| tests/level-generator-client.test.ts (new) | Controlled streams through actual requestGeneratedLevel |
| e2e/security.pw.ts | Reload keeps process budget; proof/Play/advice positive regressions through real fake-backed server |
| e2e/level-generator.pw.ts | Oversized/aborted/stale response cannot preview or change active game |
| AGENTS.md, docs/CONTEXT_MANIFEST.md | Narrow010 pointer/context added during the authorized implementation session |
| README.md | Describe allowance/session/reset/limits and generic unavailable behavior |
| docs/EVIDENCE_W08.md, docs/AI_USAGE_LOG.md | Append actual slice/check results; retain existing edits |
| specs/010-ai-resource-bounds/REGRESSION_EVALS.md, tasks.md | Record only executed results and completed work |

Read-only dependencies: server/index.ts, server/security/active-work.ts,
server/level-generator/model.ts, server/advice/gemini-provider.ts,
shared/*-contract.ts, src/advice/*, src/level-generator/controller.ts/lifecycle.ts,
src/game/, src/config/, tests/fixtures/golden-paths.ts and existing browser configs.
No new DTO enum/error guard, telemetry field, SDK owner, npm script or config reader needed.
If later evidence requires expanding this file set, document the concrete reason first.

## Execution and validation

Recorded owner decisions -> later implementation authorization -> fresh baseline -> test composition/expectations -> US1 red unit/
integration tests -> budget/admission -> service/phase accounting -> HTTP and browser proof.
Independently US2 red stream tests -> local reader -> browser lifecycle regressions.
US3 remains manual documentation: no account setting work is authorized by implementation.

Each slice records claim, observed failing signal, smallest change and repeated result in
docs/EVIDENCE_W08.md. Do not manufacture failures for already-correct safeguards.
Run focused tests after each slice, then all AGENTS.md gates plus test:security sequentially
for the browser suites sharing port4173. Preserve original expectations and golden paths.

## Complexity Tracking

No constitution violations. One small server budget and one private browser reader are
the only new runtime abstractions. No database, reset service, token-price estimator,
general provider framework, shared browser utility or dependency upgrade is justified.
