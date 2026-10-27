# Prewritten Security Expectations: T00-T17

Written before Feature009 behavior/tests. Every new group initially NOT RUN.
Keep these expectations and fixtures unchanged for before/after comparisons.
Policy numbers/errors are owned by [security-policy.md](contracts/security-policy.md).
Actual commands/results belong in docs/EVIDENCE_W08.md.

## Execution rules

- Exercise production validators, admission, tool dispatch and budget policy. Fakes replace
  provider transport, time and deliberately faulty dependency output, not security controls.
- Use the real solver for successful integration/generation and independent final proof.
- Track actual started provider attempts and solver executions; HTTP status alone is not proof.
- Compare state/traffic/settings before and after read-only runs. Explicit Play is a separate
  approved state transition and must use exact verified traffic.
- Each principal control needs an allowed positive case. Rejecting everything is a failure.
- Keep tests isolated with fresh controller/ring/fake clock state. Never sleep45s or flood
  a service; use fake time, deferred promises and a few local requests.
- Exact initial-denial expectations are providerAttempts=0 and executedToolCalls=0.
  Later malicious decisions may have provider attempts; only actual executions are counted.
- A previously passing test is reusable evidence only for the claim it actually measures.
  HTTP-service stubs and browser route stubs do not prove the full backend flow.

## Shared fixtures and observation points

Place bounded synthetic fixtures in tests/security/fixtures.ts and the reusable actual
server composition in tests/server/fixtures/w08-server.ts.

- Valid request: targetDifficulty1,lives3,crossingsToWin1. Also test allowed min/max settings.
- Normal model script: propose getGeneratedLevelTemplate(1) through solveLevel, then select
  actual same-run candidate/evaluation IDs read from the next context. Do not hardcode proof.
- Solver observation: requested solve plus independent final verification, normally2 total.
- Initial browser state: capture board accessible state, config and active traffic; no
  generated traffic applies until Play. Use existing golden actions to show gameplay works.
- Marker text: <img src="/w08-missing.png" onerror="window.__w08XssMarker=true">.
- Link-like text: javascript:window.__w08XssMarker=true and literal Markdown/raw HTML.
- Positive text: Čekaj, Đorđe — igrač kaže 'sad'; a < b.
- Sentinel: W08_SERVER_SECRET_DO_NOT_EXPOSE.
- Injection-like tool name: a newline followed by a JSON-looking fake security event.
- Keep that malicious name within the existing40-character tool-name limit so the
  log-injection case reaches dispatch rather than being masked by a length rejection.
- Captures: fake SDK invocation count/context, actual solver starts, event sink, logical
  lease count and pending underlying work, response bytes/status and browser DOM/state.
- SDK client creation must be injected. Unexpected calls throw; there is no live fallback.

## Required scenario groups

| ID | Fixture and expectation before execution | Planned proof / primary locations |
|---|---|---|
| T00 | Valid normal model script: >=2 decisions, >=1 real model-requested solve, independent final verification, validated preview. State identical until Play, exact verified traffic after Play; normal gameplay/restart works. | tests/security/flow.test.ts; e2e/security.pw.ts; reuse actual solver/service/golden-path tests. |
| T01 | Direct malformed JSON, wrong types, out-of-range/domain-inconsistent values: controlled400 before work;0/0 counters. Exact valid min/max fields accepted. | tests/security/http.test.ts through real handler/services. |
| T02 | Independently send declared/streamed oversized bodies and valid-sized bodies with role, ownerId, maxSteps, provider, model or correlationId.413 for bytes;400 for extra fields;0/0 work. Exact valid body limit variant accepted where schema allows whitespace. | tests/security/http.test.ts; selected before/after case. |
| T03 | No private resource store exists. Unknown API resource path404 with0/0 work. Valid-shaped foreign and nonexistent candidate/evaluation references are unavailable with no final verification/preview. Own solved reference succeeds. | tests/security/agent.test.ts and flow.test.ts. |
| T04 | Existing advice nextTip and generator unavailable message receive marker text through valid production output contracts. Browser marker stays false AND no injected img/onerror DOM appears; text is literal. Positive Unicode/apostrophe/a < b text preserved. | e2e/security.pw.ts; retain existing literal-text browser regressions. |
| T05 | Raw HTML, Markdown and javascript: strings remain text or are rejected; no anchor/image/script insertion or unsafe navigation. Normal plain text still works. | e2e/security.pw.ts. |
| T06 | Fake transport returns invalid JSON, wrong envelope/decision/final fields, invalid DTO or excessive UTF-8 text. Reject before unsafe continuation/preview. Boundaries tested separately and valid exact limits preserved. | tests/security/agent.test.ts and output.test.ts, production adapters and schemas. |
| T07 | Fake model requests unknown tool, constructor and toString. Actual forbidden tool executions0, no mutation or security fallback; record actual attempts. Valid solveLevel positive control succeeds. | tests/security/agent.test.ts; exact dispatcher. |
| T08 | solveLevel with extra settings/limits, wrong lane rows, overlap or invalid starts fails before execution. Separately valid-shaped wrong-run evidence fails scope checks without confusing this with schema rejection. Valid tool/same-run final succeeds. | tests/security/agent.test.ts and existing tool tests. |
| T09 | Generator has no free user-text channel. Deliberately malicious fake decisions propose set_score, file/URL access or limit escalation despite fixed rules. Execution policy denies without forbidden action or state mutation. | tests/security/agent.test.ts; state/context snapshots. |
| T10 | Inject oversized/invalid compact evidence and an extra evidence field containing sentinel; reject before next model call. Separately an otherwise-valid internal wrapper has a sentinel sibling: explicit projection excludes it from model context. | tests/security/output.test.ts; actual service validator/projection. |
| T11 | Reordered repeat candidate stops before repeated solver work. Separately distinct candidates/transient retries exhaust actual total6 attempts without resetting on switch/recovery; no seventh request. Keep step/tool/revision ceilings and explain any earlier independent bound. | tests/security/budget.test.ts plus existing service/failover suites. |
| T12 | Independently prove per-call timeout, total45000ms deadline,40000ms cutoff and late settlement. In total-deadline fixture individual calls stay below their call limits; accumulate time across legitimate decisions/solver/final verification. No later step/success; cancellation/cleanup measured. | tests/security/budget.test.ts; fake monotonic time and deferred work. |
| T13 | Hold one generation and one advice; excess work denied before provider. Separately admit five completed jobs then sixth429; advance window and admit success. Test timeout/disconnect while provider ignores abort: response terminal but lease draining, no replacements beyond capacity; eventual settlement releases once. | tests/security/admission.test.ts and http.test.ts; selected before/after case. |
| T14 | Prove synthetic key reaches injected SDK factory. Separately throw error containing sentinel, return forbidden tool field containing it, and request a newline-bearing tool name. No sentinel/raw content in HTTP/model contexts/events; no forged extra log event. Allowed and denied event shapes both verified. | tests/security/privacy.test.ts; actual adapters/services/event sink. |
| T15 | Forge browser summary score/state/settings and URL values. Invalid summaries reject; valid-shaped synthetic summaries remain unverified and cannot change provider/tool/admission limits. localStorage poison has no effect because app does not read it. Read-only generation leaves active state untouched. | tests/security/integrity.test.ts; e2e/security.pw.ts; README trust explanation. |
| T16 | Built frontend served by actual handler with synthetic fake-backed server config. Confirm key loaded, sentinel absent from dist/maps if any, actual CSP/nosniff/referrer headers present, available forbidden script blocked by matching browser policy event, gameplay/fake AI still work. | tests/security/privacy.test.ts; e2e/security.pw.ts; security Playwright fixture/config. |
| T17 | New chain: malicious fake final references valid-shaped evidence from another run and includes marker-like summary after a real valid solve. Run-local selection rejects, final verification does not start, HTTP cannot offer playable traffic, browser keeps active game and Play disabled. | tests/security/flow.test.ts and e2e/security.pw.ts with shared scripted fixture; at least model scope -> API result -> browser authority boundaries. |

## Isolation details that prevent false positives

T02: keep extra-field bodies below the body cap; size and privilege cases are separate.
T03/T08/T17: IDs are valid strings and traffic/settings are valid, so syntax cannot mask scope.
T07/T09: measure solver/forbidden operation starts, not just a message that says denied.
T10: ensure the malformed result is returned by a tool that actually executed. A sibling
projection test must reach the next provider decision, while an invalid-evidence test must not.
T11: use different candidates for attempt exhaustion; repetition is a different fixture.
If step5 cannot be reached because another production ceiling ends every legal sequence
earlier, document the stronger earlier bound and test the shared budget check directly.
Do not increase a production limit to manufacture the trace.
T12: do not let attempt exhaustion, duplicate detection or call timeout mask total deadline.
Include final verification inside the45000ms outer limit. Exercise disabled/enabled routing.
T13: count underlying promises, not HTTP request handlers. A lost client cannot free a
busy slot while a non-cooperative provider remains unresolved. Rate test runs sequential
complete jobs with no capacity conflict; concurrency test does not exhaust rate allowance.
T14: log capture contains only projected metadata. Synthetic fixture strings may exist
in tests; they must not appear in operational events or client artifacts.
T15: arithmetic-consistent submitted score is still not certified game history.

## Browser proof

T04/T05 use existing real render paths, not a separate vulnerable demonstration component.
Preserve the advice one-completed-run delay when arranging text visibility. Generator
model final summary is application-discarded; test that fact separately from literal
rendering of public unavailable text. Test DOM and execution independently so CSP cannot
hide an unsafe DOM insertion.

T16: a second loopback fixture serves a marker script with200 and correct JS MIME.
It executes on an unprotected control page. In the real game page it produces a matching
securitypolicyviolation for script-src/script-src-elem and does not execute. Never use
bypassCSP, a missing file, blocked network transport or a mocked policy decision.
Include normal generation and Play under the same enforcing production header.

## Before/after comparisons

Select T02 privilege-field rejection, T13 rolling admission and T16 production CSP.
Implementer first runs the new unchanged probe at the initial baseline, records actual
PASS/FAIL, then reruns after the narrow fix. Existing-safe T02 may PASS both times.
T13/T16 are currently missing by inspection, but their new probe results are NOT RUN.
Do not mark them baseline failures until their probes have actually executed.

## Conditional branches and limits

Private-user authorization and credential-CSRF are N/A only because they do not exist.
T03 still tests unknown routes and run-local evidence. T05 still tests literal text.
T09 still tests malicious provider decisions. A positive allowed flow is mandatory.
Fakes prove execution controls, not live model robustness or remote cancellation/billing.
Post-SDK byte limits do not prove bounded SDK receive allocation. In-process admission
does not cover multiple processes, unlimited sockets or production internet exposure.

## Review-correction expectations

Fallback expectations were written in flow.test.ts before its failing run. The cumulative
expectations below were written here and in budget.test.ts before their first execution.

Incomplete template/last-verified recovery must keep completed=false and record a failed
terminal event with PROVIDER_UNAVAILABLE after provider failure or DEADLINE after cutoff.
Only an actual completed generation records COMPLETED. Real HTTP counters and verified
fallback behavior must remain intact.

T12 cumulative fixtures run with disabled and enabled failover. Six provider attempts
take6500,6500,6500,6500,4500,4500ms; attempts1/3/5 fail transiently,2/4/6 return valid
decisions. Every attempt must finish strictly within the actual clipped timeout supplied
by the service. Retries consume the original250ms delay; an enabled primary-to-backup
switch remains immediate. Every ordinary real-solver execution consumes1900ms simulated
time, below the existing2000ms limit.

- With three distinct candidate proposals, cumulative work crosses the40000ms decision
  cutoff during the third solve:41450ms disabled or41200ms enabled. Expect deadline,
  completed=false, last-verified recovery, six provider starts and three solver starts;
  no fourth decision or extra verification.
- With two proposals followed by a valid final selection, the same cumulative timing
  completes real final verification at41450/41200ms. Expect a completed verified result,
  never later than42000ms. Earlier attempts and solver work remain individually bounded.
- Separately inject an uncooperative final verifier that returns actual solved evidence
  at45000ms after those timely provider calls. Expect unavailable/deadline, no preview or
  late success, no further work, settled/aborted attempt tracking and capacity recovery.
  This is an intentional late-tool fault, not a claim that a compliant2s tool takes longer.

The earlier bound is part of the proof: new decisions stop at40s, and a compliant final
verification is bounded to2s, so normal bounded completion is at most42s, before the45s
outer guard in the compliant-work timing model. Scheduler stalls or an uncooperative
dependency can still deliver a later result; the45s guard is tested defensively against
that late completion. No production budget is increased. Existing isolated call-timeout
tests remain required.
