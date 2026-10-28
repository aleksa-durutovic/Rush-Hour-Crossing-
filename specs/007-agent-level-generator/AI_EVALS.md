# Prewritten Week 05 agent evaluations

**Expectations fixed**: 2026-10-06, before feature implementation/execution.
Use fake models/transports/clocks. Record actual results later in docs/EVIDENCE_W05.md,
including test names, tested revision and bounded traces. Do not rewrite expectations to
match output. These are future evals, distinct from research.md feasibility observations.

| ID | Scenario | Required signal |
|---|---|---|
| E01 | Two-decision exact-rating success using real local solver | completed/goal_completed; steps2, attempts2, model tools1, total tools2; full-target witness replay wins with unchanged lives |
| E02 | Impossible candidate -> distinct revision -> final | impossible result returned to model; revision1; only solved full-target candidate offered |
| E03 | Initial request invalid/extra fields | stable400; attempts0, tools0 |
| E04 | Unknown first tool | failed/unknown_tool; attempts1, tools0; no fallback or Play |
| E05 | Invalid tool ranges/overlap/extra arguments | rejected before execution; tools0; no preview |
| E06 | Malformed model JSON/shape | invalid_model_proposal; no tool; no raw provider text in response |
| E07 | Invalid tool result or bad internal proof | invalid_tool_result; not sent as trusted model evidence; no preview |
| E08 | Transient failure then retry | same decision request repeated; attempts increase, step unchanged; one retry ceiling; global limits preserved |
| E09 | Missing/auth/permanent provider error | no retry; safe classified terminal reason; fallback only under operational policy |
| E10 | Repeated equivalent candidate with reordered fields/lanes/starts | repeated_action before second model-tool execution; canonical identity wins over JSON order |
| E11 | Third revision or reduced step/attempt/tool ceiling | no new operation beyond respective ceiling; preserve stop reason; verified operational fallback only |
| E12 | Provider/retry work at decision cutoff and absolute deadline | abort at40s cutoff; no new decisions; all work ends by45s policy; final/template work shares reserve |
| E13 | Solver reduced state/action/time budget | budget_exceeded with safe reason; never impossible or playable without proof |
| E14 | Finite exhaustive impossible moving-gap lane | unsolvable distinct from E13, despite nonblocking/no-overlap static invariants |
| E15 | Early final, nonexistent IDs, other candidate IDs or added traffic/metrics | invalid proposal/selection; no preview; final cannot invent evidence |
| E16 | Final verification fails | final_verification_failed; no playable preview, even after a prior solved result |
| E17 | Operational failure after solved candidate | stopped fallback, completed false, actual measured rating, original failure reason, exact same-run proof |
| E18 | Operational failure before candidate and verified template allowed | one counted template verification for actual target; stopped fallback; no search after deadline |
| E19 | Cancellation/disconnect/supersession during provider or solver | terminal cancelled; no fallback/late preview; guard released; current game unchanged |
| E20 | Valid final rating differs from target | stopped/target_not_met; requested/measured ratings differ visibly; completed false |
| E21 | Prompt/tool data asks to change whitelist/budget or reveal secret | only fixed solveLevel can execute; immutable policy; no credential/raw-prompt evidence |
| E22 | Full target3/10 and first-crossing rating | proof wins entire target; no life loss; rating remains based on first crossing; unchanged original6/11/15 paths |
| E23 | Browser preview/Play/restart/preset/reload | preview changes zero active state; explicit Play exact lanes; R same generated; any preset restores original; reload clears generated |
| E24 | Browser focus, stale and malicious response | controls do not play turns; stale/invalid DTO cannot enable Play; untrusted strings render literally |
| E25 | Generated advice compatibility | exactly eight fields with generated difficulty; delayed previous-run advice and original preset behaviors preserved |
| E26 | Concurrent generation and local boundaries | busy409 with no extra provider calls; advice independent; Host/no-CORS/SDK/environment checks pass |

## Frozen solver expectations

Existing one-crossing minimums are easy6/normal11/hard15. Research-derived whole-target
expectations are easy24/84, normal31/95 and hard42/137 for targets3/10. Confirm independently
through the production solver and witness replay. If an expectation disagrees, diagnose
whether research or implementation is wrong and report the measured discrepancy before
making a documented correction; do not silently rewrite either to claim passage.

Five derived template first-crossing expectations: ratings1/2/3/4/5 have minimums6/9/11/13/15.
Test actual full-target feasibility for targets1..10 rather than extrapolating from one win.

## Run evidence requirements

Distinguish logical run, decisions, provider attempts/retries, model-requested tools and
all solver executions. Include at least one success trace, revision trace, zero-execution
rejection and bounded failure. No hidden reasoning, keys, complete prompts or raw responses.
Live confirmation is an additional separately authorized check, not a substitute for this set.
