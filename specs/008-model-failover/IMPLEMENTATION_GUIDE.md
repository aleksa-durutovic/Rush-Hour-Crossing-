# Luna 6 implementation instructions: Bounded model failover

This is a code-free handoff. Implement only after the user authorizes feature008 behavior
and its scope/profile preflight is recorded. Do not paste documentation as source code.

## Read and preserve the current project

Read AGENTS.md, constitution, GAME_SPEC and CONTEXT_MANIFEST first. Then read accepted
features006/007, the recent generator debug section in EVIDENCE_W05, and every file in this
package. Use speckit-implement and dependency-ordered tasks.md, followed by analysis and
convergence where appropriate. Task checkboxes record implementation and verification state;
the current tasks.md marks T001–T030 complete based on the final offline checks and convergence review.

Inspect current work before editing. Feature007 and debugging changes are local/uncommitted;
do not overwrite them, restart the implementation from old main or delete unrelated assets.
Verify actual baseline checks and record failures before expanding behavior. Preserve
s003-baseline-v1 and existing game/preset/golden-path invariants.

## Complete scope/profile preflight

The user approved both AI features and selected Gemini 2.5 Flash (`gemini-2.5-flash`) as the
backup for both operations. The official model/schema evidence is in research.md. Do not
claim account access or quota independence; no live request is authorized. Use the installed
Gemini SDK and do not add a provider dependency without new evidence.

The narrow amendments in contracts/compatibility.md have been accepted and reconciled into
the authority files. Preserve every other authority rule and do not infer student-pair
acceptance, account access, or credential availability. Implementation is authorized;
live calls are not.

## Keep routing visible to the services

Use a small server-only classified policy and fakeable one-attempt adapters. Generator and
advice services must count/select every invocation. Do not hide two requests in a composite
adapter, recursive retry or SDK automatic retry. Retain the exact Gemini SDK import owner;
give the selected backup an equally narrow transport boundary.

Keep request/model input unable to select profiles, endpoints, keys, budgets or tools. Enabled
configuration is explicit and strict; absent means disabled with the original behavior intact.
No startup health probe spends quota. Invalid enabled setup fails safely without printing values.

## Implement the exact enabled policy

Use contracts/failover-policy.md rather than inventing timing. Each logical decision/advice
job has one15s provider phase; primary gets at most8s, backup at most7s, all clipped to remaining
outer time. Switching is immediate after classified quota/timeout/temporary failure, with
no artificial delay. Later backup-only transient retry can wait250ms inside the phase.

Generation keeps its existing5 decisions/6 total attempts/2 per decision/3 candidates/2 revisions/
8 solver executions and40s/45s cutoffs. Switch is a second attempt of the same decision:
count recovery/attempt, not another step. Preserve original run time, IDs and verified context.
After selecting backup, stay on it for that run; next independent job starts primary.

Count invocations when actually started. Refresh remaining budgets for backup without
changing task/settings/evidence. Pass clipped deadlines into transport as well as the
application timer. Invalidate/abort the old attempt before switching, but never block waiting
for an uncooperative abort acknowledgement. Reject late settlements using identity, signal,
terminal state and deadline checks. Cancellation wins before/after every asynchronous boundary.

## Preserve equal validation and recovery

Retain the recently fixed Gemini concrete decision envelope; test the actual backup schema
encoding against its official interface. Normalize provider wire data only, then apply the
same strict operation schemas. Unknown tool/invalid arguments/results/final selection do
not get another model. Refusal/auth/config/permanent/invalid output cannot trigger failover.
Explicit output-token truncation retains existing operational recovery, not another model.

Backup traffic still needs the actual deterministic solver and independent final verification.
No new tools, guessed proof, changed target, automatic Play or increased search budget.
Successful backup-generated traffic can complete normally; returning last_verified/template
remains an incomplete application recovery with measured rating and original reason.

Advice input stays eight fields; focus/evidence are server-derived and only a validated
nextTip is accepted. Preserve one-completed-run delay and existing restart/generated-origin/
supersession behavior. No technical provider controls or provider metadata in public DTOs.

## Prove it before live use

Write failing tests/eval signals first, then the smallest slice of behavior. F01–F28 define
acceptance. Prove actual local solver integration, strict rejection, late/cancel behavior,
disabled compatibility, exact counters, both service lifecycles and independent routing.
Keep diagnostics at most32 safe events; no raw prompts/responses/exception text or credentials.

Run all AGENTS.md gates and record actual outputs in EVIDENCE_008 and AI_USAGE_LOG. Routine
tests must never call live providers. A later live switch demonstration needs new explicit
permission; the three earlier debug runs were already used. No commit/push/merge/deployment
without the relevant user request. Report unbuilt work and delivery status honestly.
