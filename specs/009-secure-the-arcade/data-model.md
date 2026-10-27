# Data Model: Security Boundaries

Numerical policy is authoritative in [contracts/security-policy.md](contracts/security-policy.md).
Existing game, generated-level and advice success DTOs are unchanged.

## Admission policy and state

Application-owned operation enum: generation or advice.
Policy: maxGeneration=1; maxAdvice=1; maxCombined=2; maxAdmissions=5; windowMs=60000.
These constants are not HTTP/model fields or new environment settings.

A controller is created once per production server composition and shared by both routes.
It retains at most five accepted monotonic timestamps in the active rolling window.
Prune timestamps at or before now-windowMs. Busy/invalid/rate-denied requests add none.
Capacity/rate check and lease creation are one synchronous atomic action, with no await.
Clock is monotonic; test clocks are non-decreasing. HTTP handlers cannot supply timestamps.

## Job lease and work tracker

A lease has an application-generated correlation ID, operation, acquired monotonic time,
logical terminal flag, pendingWork count and release flag. None are client authority.

Transitions:
- admitted -> running;
- running -> logically_terminal after success/error/cancel/deadline;
- logically_terminal with pendingWork>0 -> draining;
- logically_terminal with pendingWork=0 -> released;
- draining -> released only after the final started work promise settles.

Track actual provider invocation promises before service timeout wrappers, for both primary
and backup and both enabled/disabled modes. On sync throw, start/settle accounting is still
correct. Attach settlement handlers to prevent unhandled rejections. Do not wait for a
draining promise before sending a safe HTTP terminal response or routing permitted backup.
Do not release on signal.aborted alone, response close alone or Promise.race alone.
All started attempts remain subject to the unchanged operation budgets; there is no queue.
A never-settling transport can retain its slot until local server restart.

## Security event

Exact keys:
event, timestamp, correlationId, operation, outcome, reasonCode, providerAttempts,
executedToolCalls.

- event: request_allowed | request_denied | tool_denied | run_finished.
- timestamp: application-generated UTC ISO8601 text.
- correlationId: application-generated nonempty identifier, at most64 characters; not a token.
- operation: generation | advice.
- outcome: allowed | denied | completed | failed | cancelled.
- reasonCode: closed enum defined by the security contract; no raw external value.
- providerAttempts: integer0..6 (advice actual maximum2).
- executedToolCalls: integer0..8 (advice always0).

Max32 events per admitted job. One fixed denial event per rejected request. Default local
ring retains the last128 events globally, evicts oldest first, resets on process restart,
and has no HTTP read endpoint or file persistence. Injected test sinks receive only this
projected schema; they may capture synthetic events for assertions. Existing failover
events retain their separate approved bounded schema; never spread raw exceptions into either.

## Run-local tool evidence

Reuse existing strict candidate/evaluation IDs, traffic, metrics and proof. Only accepted
same-run candidate/evaluation pairs can be finalized. The server creates IDs and captures
settings; model arguments cannot choose lives, crossings, dimensions, budgets or providers.
The application retains proof internally and projects only validated compact evidence into
the next model decision. Unknown fields inside compact evidence are rejected. Extra
siblings on an internal tool wrapper are never forwarded wholesale.

## Untrusted displayed data

Advice nextTip: nonempty string, at most160 existing string-length units, within2048
UTF-8 bytes of complete provider text before JSON parsing. Preserve current string counting.
Advice HTTP/browser response: at most4096 UTF-8 bytes. Browser measures during bounded
consumption before parsing, not only after response.json has materialized an unbounded body.
Generator limits and strict DTO schemas remain unchanged.
All rendered dynamic fields are text-only. There is no HTML/Markdown/link interpretation.

## Evidence case

ID T00..T17; fixture reference; expected result recorded before execution; checkpoint;
command/test; actual result; provider/tool counters; state before/after; PASS/FAIL/NOT RUN
or justified conditional N/A; limitations. No fabricated student contribution or live result.
