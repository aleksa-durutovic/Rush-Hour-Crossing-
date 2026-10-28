# Bounded agent run contract

## Limits and counters

| Policy | Fixed initial value |
|---|---|
| Model decisions | At most 5, including final/refusal decisions |
| Provider attempts | At most 6 across the run |
| Attempts per decision | At most 2 across primary and backup; one retry/switch only |
| Disabled retry delay | 250 ms; interruptible, consumes remaining time |
| Disabled provider attempt timeout | At most 15 seconds, shortened by available decision time |
| Enabled Feature 008 provider phase | Shared 15 seconds; primary at most 8 seconds, backup at most 7 seconds, all shortened by outer time |
| Solver executions | At most 8 total, including final and template verification |
| Candidate proposals | At most 3 distinct candidates, meaning initial plus 2 revisions |
| Total deadline | 45 seconds from start of accepted run |
| Decision phase cutoff | 40 seconds; final/fallback handling reserves remaining 5 seconds |
| Solver invocation | At most 2 seconds, 35,000 states and 175,000 actions |
| Model context | At most 24,576 UTF-8 bytes; at most 3 compact evaluations |
| Model output | At most 8,192 UTF-8 bytes and 2,048 configured output tokens |
| Evidence events | At most 32 |

Increment stepCount before the first attempt of a decision. Increment providerAttemptCount
immediately before each SDK request, including failed ones. A retry repeats the exact same
request and increments attempt/retry counts, not steps. SDK internal retries must be disabled.
Increment toolCallCount only immediately before a validated invocation starts. Increment
modelToolCallCount for model-requested evaluations only. Increment revisionCount when a
new distinct candidate after the first is accepted. Do not reset counters for recovery.

Before accepting model-directed evaluation, reserve at least one unused solver execution
for final verification. At the 40-second decision cutoff, abort decision work and enter
bounded completion/fallback handling; do not begin another model decision. In disabled
mode an attempt's timeout is min(15 seconds, remaining time before that cutoff). In enabled
Feature 008 mode, one decision has a shared 15-second provider phase; primary and backup
attempts are capped at 8 and 7 seconds respectively and are further shortened to remaining
phase and decision time. Switching is immediate. A run stays on backup after its first
eligible switch and cannot switch back. All invocations share the existing per-decision
and six-attempt run ceilings. The actual total deadline
aborts all work at 45 seconds. Check the injected clock again after async results so late
settlements cannot resurrect a terminal run.

## Run transitions

Created -> running after valid preflight. Running accepts a structured solveLevel proposal,
validates and evaluates it, validates its result, stores evidence and asks the next decision.
Solved, too-easy, too-hard and unsolvable evidence all return to the model while budget
remains; an unsolvable candidate is a legitimate domain result, not a tool exception.

Final is legal only after at least two decisions and one executed model-requested tool.
It selects an existing solved candidate/evaluation pair. The application revalidates its
immutable lanes/settings and executes final solveLevel verification, counted against the
same budgets. Exact requested-rating match yields completed/goal_completed. A valid solved
selection missing the requested rating yields stopped/target_not_met with a fallback preview.

No terminal state may transition back to running. The model cannot choose a provider,
new tool, budget, traffic rule, request settings or terminal success status.

## Repetition and revisions

Store canonical candidate keys independent of JSON object order, lane order, start order
and candidate ID. A repeated model proposal stops before another execution. Initial
candidate plus two different revisions is the maximum. Final application verification
deliberately evaluates the same exact candidate and is exempt from model repetition checks.

## Safe stop taxonomy and fallback

| Stop reason | Terminal handling |
|---|---|
| goal_completed | completed; exact verified target match |
| target_not_met | stopped; verified selection, clearly marked fallback |
| step_limit / provider_attempt_limit / tool_call_limit / revision_limit | stopped; operational fallback may be attempted |
| repeated_action / deadline / provider_refusal | stopped; operational fallback may be attempted |
| provider_failed / tool_failed / tool_timeout | stopped if verified fallback exists, otherwise failed |
| invalid_model_proposal / unknown_tool / invalid_tool_arguments | failed; no fallback solver or preview |
| invalid_tool_result / invalid_final_selection / final_verification_failed | failed; no preview |
| cancelled | stopped; no fallback, no late display |

Fallback order: last solved candidate (most recently evaluated) first; otherwise a template
for the requested rating. For a stored solved candidate, revalidate identity, settings,
rules version and its existing proof; do not rerun an identical search solely for operational
fallback. A template requires a fresh counted solver verification for this run's actual
crossing target. The five templates are defined in research.md; they do not modify presets.
Do not try multiple fallback templates. If remaining time/calls are insufficient, return
unavailable. After the absolute deadline, start no verification work; already validated
same-run evidence may be packaged only if identity/proof checks completed before it.

Retain the original stop reason even if fallback succeeds. completed remains false and
requested/measured ratings remain separate. Cancellation, invalid schema, unknown tools,
bad arguments/results and invalid final selection must not manufacture a fallback.

Use an application-owned abort controller for each attempt/tool and one for the run.
Client disconnect, supersession and cancellation abort child work. Authentication/config
and permanent errors get no retry. Retry only classified transient transport/5xx/rate-limit
or per-attempt timeout while global ceilings and deadline permit. Under accepted Feature 008,
at most one application-selected backup may receive the second counted attempt; backup
failure cannot route to another model. Feature 008 is disabled by default; when enabled its
approved backup is Gemini 2.5 Flash (`gemini-2.5-flash`) under the separate shared-phase
policy documented in `specs/008-model-failover/`.

## Bounded context and evidence

Supply the canonical goal, necessary R1-R5 rules including collision A+B, validated lane
schema, only solveLevel descriptor, remaining budgets, and at most three compact validated
evaluations. Treat all data/model text as untrusted; it cannot alter instructions/registry.
Fresh provider requests also carry the authoritative first-crossing rating bands and at
most three copied, normalized prior lane configurations linked by candidate/evaluation IDs.
This bounded same-run memory allows revisions without exposing internal solution paths.
The Gemini adapter uses a strict single-field decision envelope for its provider wire schema,
then returns one of the same three exact provider-neutral decision variants to the service.
No repository, lesson documents, credentials, raw history, solution paths or hidden reasoning
are sent. Evidence records events, identities, validation categories, safe provider/model
labels, timing and actual counts. Usage may be recorded when supplied, never invented as zero.

## Success demonstration

A fake first decision requests solveLevel; the actual local tool executes; the fake second
decision selects its candidate/evaluation. Final verification then executes independently.
Assertions: stepCount2, providerAttemptCount2, modelToolCallCount1, toolCallCount2,
revisionCount0, completed true and goal_completed. Merely returning a template on provider
failure is a useful fallback but does not meet this successful agent-flow criterion.
