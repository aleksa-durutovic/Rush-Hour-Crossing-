# Failover policy contract

This is the detailed policy authority for feature008 enabled mode. Existing public DTOs stay unchanged.

## Configuration modes

| Mode | Behavior |
|---|---|
| Disabled, default | Existing primary-only15s attempts and250ms transient retry; no backup call/factory; no shared15s phase |
| Enabled and valid | One primary/backup pair; primary8s/backup7s inside shared15s phase |
| Enabled and invalid/partial | Safe configuration failure before provider calls; setting names/categories only; no silent downgrade |

Server configuration owns enablement and approved profile IDs. Enabled missing backup access
is a configuration failure. Disabled mode does not introduce a primary-key startup requirement:
retain existing absent-primary-access handling. Configuration validation never spends quota.

## Routing matrix

| Primary outcome | Action |
|---|---|
| Valid complete response | Continue ordinary validation; zero backup calls |
| rate_limit / timeout / temporary_unavailable | Abort/invalidate primary; immediately use configured backup if budgets remain |
| configuration / permanent | No failover; existing safe handling |
| refusal / blocked content | No second provider to bypass refusal |
| invalid_output / rejected tool/arguments/final | No failover or manufactured verified preview |
| output_limit | No failover in v1; ordinary operational provider-failure recovery |
| cancelled / disconnect / supersession | Cancel operation; no recovery or late display |

No backup starts after cancellation, phase expiry, two started attempts, generator attempt6
or generator elapsed40s. Resource failure is a controlled stop, not a fresh budget. Keep
explicit refusal separate from availability. Backup may not select another provider.

## Limits and accounting

| Enabled-mode limit | Value |
|---|---|
| Primary attempt |8,000ms maximum |
| Backup attempt |7,000ms maximum |
| Logical provider phase |15,000ms including overhead/delays |
| Generation attempts |2 per decision;6 in whole run |
| Advice attempts |2 in whole job |
| Delay when switching roles | None |
| Transient retry on a later backup-only decision |250ms; interruptible, inside shared phase |
| Generation decision/total deadlines | Existing40,000/45,000ms |
| Final/recovery reserve | Existing5,000ms; no model calls |

Attempt deadline is the earliest of role allowance, phase deadline and outer cutoff. Set
transport timeout as well as application timeout race to that clipped limit; use monotonic
time only in server control. Primary8s leaves at most7s minus overhead for backup. Quota
failure after100ms still gives backup at most7s, not14.9s. At run elapsed39s only1s remains
for provider work; at40s only existing final/proof/template recovery is eligible until45s.

Switch is the second attempt of the same decision: increment providerAttemptCount and
retryCount when invocation starts, not stepCount. No reset of request, elapsed time, evidence,
candidate/evaluation IDs, revisions or solver ceiling. SDKs make one underlying attempt only.

## Sticky selection and retry

After eligible primary failure selects backup, remaining generator decisions start backup.
Never switch back within that run, even after backup failure. Later backup-only decisions
may use two7s attempts for transient categories, with250ms delay inside15s. The original
six-attempt ceiling still applies. New runs/advice jobs start primary; no shared cooldown.
An advice primary+backup pair uses both available attempts and cannot make a third call.

## Context, cancellation and late results

Backup receives the same captured task and validated same-run candidate/evaluation evidence;
refresh remaining time/counters to reflect its actual attempt. Task semantics stay unchanged.
Do not send raw failed responses/errors or hidden reasoning to backup.

Invalidate attempt identity and locally abort before switching. Never wait indefinitely for
an uncooperative primary to acknowledge abort. A late primary result cannot settle backup,
execute tools, alter counters or reopen a terminal run. Caller cancellation wins at every
boundary, including between primary failure and backup startup.

## Validation and recovery

Provider role cannot change schema/whitelist/argument/result/identity/proof/final gates.
Successful backup output can yield completed/goal_completed/source generated after ordinary
verification. Returning a verified last-level/template instead stays stopped/completed false,
with actual rating and original reason. These are different events in safe evidence.

Both-provider operational failure or exhausted recovery retains current generation recovery
and advice unavailable behavior. Never invent proof, relax ratings, change captured settings,
apply a level automatically or manufacture recovery after cancellation/security rejection.
