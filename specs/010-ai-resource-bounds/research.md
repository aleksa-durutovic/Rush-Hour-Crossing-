# Research: AI resource bounds

Date: 2026-10-28. Baseline and checked remote branch:779cd397b4797a551607c69169f96d88b586e835.
Research is read-only; no provider/account probe. Local Spec Kit plan explicitly dispatched
one research agent for official Google controls; primary agent checked the cited pages too.

## R1 - Process session and approved allowance

Decision: one budget owned by the existing production admission-controller composition.
Default60 attempts; owner approved P1/P2/P3 on2026-10-28. Restart/watch restart/crash resets;
a separate process has a separate allowance. Reload or new tabs do not.
Rationale: smallest bounded addition to a single-process local app, with no account/database.
At minimum healthy usage, generation2 plus advice1 gives about20 cycles. A worst-case
five generation admissions consuming six attempts each can use30 attempts in one minute;
60 is finite but is not a strong long-duration or account-wide spending guarantee.
Alternatives:30 is stricter (about10 minimum cycles),120 more permissive (about40).
Durable/user/account sessions add identity/persistence outside this scope. No dollar estimate.

## R2 - Use the actual start boundary

Observed: server/security/admission.ts has fixed1/1/2 capacity and five rolling-minute
timestamps; lease.start tracks provider and solver work. server/index.ts shares one
controller across the two real routes. No cumulative counter exists.
Decision: one budget per controller in the existing process composition; early empty
precheck plus authoritative synchronous reservation in provider lease.start.
Alternatives rejected: charging admissions undercounts retries/backup; reserving six
attempts per generator overcharges; per-service or per-request budgets multiply allowances;
settlement-based charging can oversubscribe concurrent calls and refund costly cancelled work.

Observed: generator disabled counters increment before context/call; enabled
runEnabledProviderPhase calls onAttemptStart/attempt_started/role_switched before run;
advice enabled also counts at this earlier callback.
Decision: move actual accounting/role/events into the authorized provider thunk and preserve
the local exhaustion sentinel before normalizers erase it. Prepare validated projected
generator context first, so its counter includes the current allowed invocation.
Generic transient classification would incorrectly invite another model; do not use it.

## R3 - No refill or early lease release

Decision: started invocation debit is permanent even after synchronous throw, timeout,
disconnect or refusal. Denied start adds no lease attempts, retry count or pending work.
Already running work may complete; draining capacity follows actual settlement, not budget
availability. Existing active-work.ts is reused unchanged.
Alternatives: refund-on-cancel cannot establish whether remote work already billed;
blind timeout release reopens the orphan-work problem already corrected by009.

## R4 - Safe response and fallback compatibility

Decision: initially empty budget denies admission with503 ADVICE_UNAVAILABLE or a narrow
generation503 GENERATION_UNAVAILABLE, no Retry-After/refill prediction. Use existing fixed
PROVIDER_UNAVAILABLE event reason and the existing eight-field event schema.
During a generator job map local exhaustion to existing provider_attempt_limit, explicitly
covering the additional shared ceiling. Existing stored verified candidate or one freshly
verified template may be used inside solver/time limits; completed stays false. No new
stop-reason enum or shared DTO change. Advice retains safe delayed unavailability.
Alternative:429 AI_RATE_LIMITED misleadingly suggests time-based recovery; a new detailed
public remaining-budget/status API adds unnecessary exposure/UI/contract changes.

## R5 - Local bounded browser reader

Observed: generator client awaits response.text(), re-encodes and only then compares16,384;
the user supplied a review probe reporting a fully consumed128KiB body. This session did
not rerun that probe. Advice already uses chunk counting, reader finally-release and fatal
UTF-8 decoding. Production server caps generation JSON at16,384 bytes.
Decision: focused local generator reader, actual byte counting, fatal decode after EOF,
best-effort cancellation, abort listener cleanup and strict existing schema.
Alternatives: Content-Length alone is optional/untrustworthy; text()/json() still fully
materialize the response; extracting advice's reader changes a second working path.
Residual limit: stream/network layers may deliver or buffer a large chunk before the client
sees it. Promise-level cancellation cannot guarantee remote stop or undo that allocation.

## R6 - Current provider-account controls

Decision: separate [manual checklist](PROVIDER_ACCOUNT_CHECKLIST.md), dated official Google
sources; all actual account settings pending. No account changes, new provider or service.
Primary references: Gemini [keys](https://ai.google.dev/gemini-api/docs/api-key),
[rate limits](https://ai.google.dev/gemini-api/docs/rate-limits),
[billing](https://ai.google.dev/gemini-api/docs/billing), Cloud
[key management](https://docs.cloud.google.com/docs/authentication/api-keys),
[restrictions](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys),
[alerts](https://docs.cloud.google.com/billing/docs/how-to/budgets) and
[spend-cap budgets](https://docs.cloud.google.com/billing/docs/how-to/budgets-spend-caps).
Account availability/scope must be verified; do not infer it from docs or repository names.
No SDK/model migration follows from newer model examples in those docs.

## Existing-source status discrepancy

009 spec.md and plan.md still describe a pending implementation/old audit blocker.
Higher-priority AGENTS.md, completed009 tasks, current source and today's checks establish
the implemented baseline. Preserve the old files; list stale status as documentation drift.
Earlier guides' historical branch/baseline instructions do not replace this user's explicit
010 request/current779cd39 target. No new gameplay/constitution exception is needed.
