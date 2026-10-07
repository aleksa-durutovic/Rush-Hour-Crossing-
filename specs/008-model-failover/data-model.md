# Data model: Provider routing and recovery

These are contracts to implement, not source code.

## Provider profile

Application-owned primary/backup identity contains approved provider/model labels, operation
capabilities, one-attempt adapter and external credential configuration. Exactly one primary
and at most one backup per covered operation. Never include key values in diagnostic/model/browser data.
Profiles are source-controlled/allowlisted; requests cannot supply arbitrary models or URLs.

Enablement is an explicitly parsed boolean; missing means disabled. Unsupported values or
partial enabled configuration are safe configuration errors. Both-operation scope requires
generation and advice capabilities. Configuration validation makes no startup provider call.

## Routing session and provider phase

One session belongs to an existing generator run/advice job: selected role, failoverUsed
boolean, immutable validated profile identities and categorized switch reason. It starts
primary, can switch once to backup and cannot switch back. Sessions are not shared or persisted.

Existing generator candidates/evaluation IDs, keys, settings, solver proofs and counters stay
in the original run. Routing neither starts a new run nor repeats accepted solver evaluations.

Enabled logical provider phase starts immediately before its first attempt, with deadline
15,000ms later, clipped to generator's original40s cutoff. Each attempt gets a monotonically
increasing identity, role, start/deadline, abort controller and sanitized outcome. Primary
cap8,000ms, backup cap7,000ms; every cap is shortened by remaining phase/outer time. At the
deadline a result is late and cannot be accepted. Disabled mode retains current policy.

## Safe failure categories

| Category | Meaning | Model failover |
|---|---|---|
| rate_limit | Classified quota/capacity/rate exhaustion | Eligible |
| timeout | Attempt deadline or confirmed transport timeout | Eligible |
| temporary_unavailable | Classified temporary network/service failure | Eligible |
| configuration | Invalid profile or missing/auth/access configuration | Never |
| permanent | Invalid provider request or unsupported operation/model | Never |
| refusal | Explicit refusal or blocked content | Never |
| invalid_output | Malformed/oversized/contract-invalid structured output | Never |
| output_limit | Explicit provider output-token cutoff | Never; existing application recovery only |
| cancelled | Caller cancelled/disconnected/superseded | Never; takes precedence |

Translate provider status/codes in adapters, not from arbitrary exception text. Never add
raw failed output or provider errors to backup context.

## Counters

Reuse generator counters. stepCount increments once per logical decision; providerAttemptCount
increments immediately before each adapter invocation. The second invocation increments
retryCount at the same point whether switching or retrying backup. Cancellation before a
planned call does not count that call. Here retryCount means second recovery attempts.

Keep five decisions/six total attempts/two attempts per decision/three candidates/two revisions/
eight solver executions. Routing itself changes no tool/revision/candidate counter. Advice
has at most two invocations per enabled job and adds no counter fields to its public DTO.

## Evidence and terminal states

Keep at most32 safe events per run/job: attempt start/outcome, categorized switch, cancellation
and terminal/recovery state. Fields: operation, safe profile/role, decision/attempt numbers,
elapsed duration and bounded category/status. Optional numeric usage is recorded only if supplied;
missing usage stays unknown. Drop additional evidence after32 without changing behavior/budgets.

No keys, prompts, summaries, lane payloads, proof actions, tips, raw outputs, exception text
or hidden reasoning in diagnostics. No provider metadata in browser response schemas.

Valid provider output returns to existing operation validation. Successful backup-generated
traffic can complete normally; switching models is distinct from application/template recovery.
Operational exhaustion retains verified generator recovery or advice unavailable behavior.
Cancellation prevents more calls/recovery/late updates. No new model calls in the40–45s reserve.
