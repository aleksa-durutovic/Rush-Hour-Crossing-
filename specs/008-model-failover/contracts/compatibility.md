# Compatibility and proposed scope amendments

Accepted user-authorized scope amendment dated 2026-10-06. The changes below authorize
implementation of server-side failover; they do not authorize live provider calls or alter
gameplay, validation, security, proof, player-approval or advice-lifecycle requirements.

| Existing source | Current restriction | Proposed narrow amendment before behavior |
|---|---|---|
| Constitution Technical Constraints | Accepted scope and existing server provider boundary only | Permit one approved server-only backup for existing AI operations after acceptance; preserve all principles |
| GAME_SPEC / feature006 scope | Gemini-only advice, no other provider/fallback | Opt-in availability recovery; preserve summary/focus/evidence/visibility contracts |
| Feature006 timing | Two15s attempts plus250ms retry | Enabled8s/7s within shared15s; disabled unchanged |
| Feature007 plan/run contract | One provider; "Do not add another provider." | One application-approved backup; no new tool or model-selected routing |
| Feature007 retry rule | Same-provider request retry with250ms delay | Enabled role switch uses same task/evidence with refreshed budgets and no artificial delay; still second counted attempt |
| SDK ownership assertion | Sole Gemini importer in existing adapter | Keep exact restriction; add equivalent exact backup transport ownership |

## Reconciled sources before behavior changes

1. The user authorized both existing AI operations and the narrowly scoped amendments in
   this file. This records no student-pair agreement or individual contribution.
2. The constitution is amended to v1.4.0 and GAME_SPEC now records the opt-in exception.
   Gameplay, architecture and prior evidence are preserved.
3. Feature006, feature007's run contract, AGENTS.md and CONTEXT_MANIFEST.md now record
   enabled/disabled behavior, timing and unchanged requirements.
4. Spec Kit analysis ran before behavior. The user selected Gemini 2.5 Flash
   (`gemini-2.5-flash`); official structured output is documented and the existing SDK is
   reused. No new dependency or live provider call was introduced.

## Preserved behavior

No changes to R1–R7, grid, presets, golden paths, solver metrics/outcomes/proofs, public
request/response keys/routes/body limits, same-origin local security or browser authority.
No model picker, new tools, automatic Play, increased budget or earlier advice display.

## Drafting defaults

The accepted scope covers both AI operations with Gemini 2.5 Flash. Google projects may
share quota across models, so failover is availability recovery, not an assertion of
independent quota. This profile choice does not authorize a live call.
