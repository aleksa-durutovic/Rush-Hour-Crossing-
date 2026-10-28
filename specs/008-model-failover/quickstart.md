# Validation guide: Backup model failover

**Current state**: Implementation and offline verification are complete. Live requests remain
unauthorized. Follow IMPLEMENTATION_GUIDE.md; record only checks actually run.

## Prerequisites

Read AGENTS.md and contracts/compatibility.md. Preserve uncommitted feature007/debug work.
The accepted profile is Gemini 2.5 Flash (`gemini-2.5-flash`) for generation and advice.
Use Node24+/npm11+. Credentials remain local server environment inputs, never documentation
examples or browser settings. Routine tests inject fake providers and work with no credentials.

## Expected configuration behavior

Absent explicit enablement: original primary-only app works unchanged and constructs no
backup. Enabled with invalid/partial backup profile/access: safe configuration failure before
provider calls. Enabled with valid approved profile: bounded primary-to-backup routing.
Set `AI_FAILOVER_ENABLED=true` in the server process environment and provide the existing
`GEMINI_API_KEY` through the same server-only mechanism used by the primary provider. The
backup model and operation allowlist are fixed in code, not supplied by browser input or an
environment-selected endpoint. An absent enable flag keeps failover disabled; enabled mode
without the key fails startup safely. Never place credentials in this guide, source control,
browser settings or diagnostics. No key value is needed for automated tests.

## Automated validation

Use the AGENTS.md commands: npm ci, npm run typecheck, npm run test:run, npm run build,
npm audit --audit-level=high, Chromium installation once if needed, npm run test:e2e.
Record only observed results in docs/EVIDENCE_008.md. Freeze F01–F28 before implementation.
Ensure browser tests cannot contact a real provider; intercept requests or explicitly disable
real access using validated server configuration without inspecting or copying keys.

Demonstrate primary success, quota switch,8s timeout/7s backup, sticky next decision,
both-provider failure, clipped cutoff, invalid output, refusal, cancellation/late output,
disabled behavior and configuration errors. TraceA must use actual local solver and separate
final verification; template recovery alone is not successful model failover.

## Manual demonstration after fresh permission

Prepare only after fake/regression checks pass. Earlier three-run permission was exhausted.
Ask for a new explicit small run/attempt cap with named selected profiles. Prefer one normal
primary request and one deliberate switch scenario using a local test-only injected primary
availability failure; do not intentionally consume quota to force429 or modify production
routing/settings to disguise the demo. The injected trigger is not proof of actual quota detection;
that classification is covered by adapter fixtures or observed real safe error metadata.

Start the app with npm run dev, or build then npm start. Request a rating3 challenge with
ordinary current settings; inspect safe server evidence and verify explicit Play behavior.
For accepted advice scope, complete the next game to confirm the unchanged delay.
Record role/profile labels, reason, attempts/timings, solver verification and reported numeric
usage when available. Never record prompts, raw outputs, keys or exception payloads.

If no authorized provider access exists, record live verification pending. Do not count a
verified template as proof that the backup model worked, or imply billing stopped on abort.
