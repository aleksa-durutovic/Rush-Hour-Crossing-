# Prewritten failover evaluations

**Fixed**: 2026-10-06, during documentation and before feature008 execution.
**Execution state**: Not run. Fake providers, clocks and transports only by default.
Record actual red/green results later in docs/EVIDENCE_008.md; do not rewrite requirements
to fit implementation. Existing feature006/007 suites remain regression requirements.

| ID | Scenario | Required signal |
|---|---|---|
| F01 | Disabled, no backup configuration | No backup constructed/called; current15s attempt/250ms retry policy preserved |
| F02 | Enabled primary success | One primary attempt; zero backup; unchanged operation output |
| F03 | Primary quota error | Backup is second counted attempt immediately, no primary retry/250ms switch delay |
| F04 | Primary temporary network/service failure | Same bounded switch as F03; sanitized category only |
| F05 | Hung primary | Abort/invalidate at8s; backup up to7s; phase ends by15s |
| F06 | Primary late success/failure ignoring abort | Cannot settle backup, execute tool, alter counters or resurrect terminal state |
| F07 | Backup generated success | Actual local solver evaluation and separate final verification; exact full-target proof and ordinary completed preview |
| F08 | Backup advice success | Valid nextTip; original server-derived focus/evidence; no added response fields |
| F09 | Both roles fail operationally | Two attempts only; current verified generator recovery or advice unavailable, no third provider/call |
| F10 | Generator sticky backup | Next decision starts backup; primary stays unused in that run; new run starts primary |
| F11 | Backup-only retry | At most two7s attempts with250ms interruptible delay inside15s; total run attempts still at most6 |
| F12 | Shared counters/identities | Switch increments attempt/recovery only, not decision/tools/revisions; all prior IDs and original start/deadline retained |
| F13 | Sixth attempt consumed | No seventh/failover attempt, no reset; controlled existing recovery |
| F14 | Generator40s cutoff/45s deadline | Clip attempts at40s; no models in reserve; final/recovery may finish before45s, none late |
| F15 | Not enough logical phase time | No call if expired; attempt timeout clipped when positive; equality at deadline is late |
| F16 | Cancel/disconnect between roles | Zero backup start, no generated recovery/preview; cancellation wins |
| F17 | Cancel during backup or retry delay | Active signal aborts; no further invocation/late result; existing guard released |
| F18 | Invalid local request | Both providers zero calls; existing safe4xx |
| F19 | Invalid JSON/shape/oversized output | Zero model failover; no solver request from rejected decision |
| F20 | Unknown tool/bad arguments/bad final | Equal application rejection after either provider; no bypass or manufactured preview |
| F21 | Explicit refusal/blocked content | Zero model switch; existing safe refusal behavior preserved |
| F22 | Missing/auth/permanent provider failure | Zero model switch; safe categories only; existing operation recovery retained where allowed |
| F23 | Provider MAX_TOKENS | output_limit; no model switch; generator ordinary verified recovery, never treated as validated proposal |
| F24 | Invalid/partial enabled configuration | Zero provider calls/probes; safe configuration error without rejected values |
| F25 | Fake transport options | One underlying SDK/HTTP attempt; clipped transport timeout and signal; correct provider wire envelope; bounded outputs |
| F26 | Advice timing/lifecycle | Enabled at most2 attempts/15s; original one-completed-run delay, restart/supersession/generated-origin behavior |
| F27 | Boundaries and diagnostics | Exact SDK/transport ownership; no browser env/SDK, no raw data; evidence at most32 events |
| F28 | Independent requests | One generator's selected role/counters do not route or affect separate advice or later runs |

## Required bounded traces

TraceA: primary quota on decision1 -> backup proposes solved target -> next decision starts
backup and selects existing IDs -> final verification. Expected steps2, attempts3, recovery1,
model tools1, total tools2, revisions0. Exact target match gives completed true.

TraceB: primary hangs8s -> backup hangs7s -> no third attempt. Fake clock shows provider
phase ended at15s, then only permitted generator recovery before45s; advice unavailable.

TraceC: primary returns unknown tool -> zero backup/solver calls. A schema-valid unknown
name is rejected by application whitelist rather than routed to another model.

TraceD: primary quota then caller cancels before backup invocation -> primary attempt1,
recovery0, backup0, solver0, cancelled terminal and no playable preview.

TraceE: disabled transient primary failure -> existing primary-only retry behavior and
timings; zero backup construction/calls. This protects backwards-compatible setup.

No live success is inferred from fake traces. A future live model switch must be separately
authorized and honestly identified; application/template recovery is not a successful model-switch demonstration.
