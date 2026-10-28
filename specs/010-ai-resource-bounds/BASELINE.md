# Baseline and planning evidence

Date:2026-10-28 (client Europe/Budapest date). Runtime code/tests unchanged this session.

This is the historical initial planning checkpoint. After these observations, the owner
approved P1/P2/P3 on2026-10-28:60 attempts/process, process-restart reset and the agreed
exhaustion handling. See spec.md for current decisions. That approval did not start
implementation or verify provider-account settings; the recorded baseline results below
were not rerun for this documentation-only approval update.

## Target and preserved work

Worktree: C:/Users/AleksA/.codex/worktrees/feature-007-generator-publish/Rush hour crossing.
Git branch:codex/ai-level-generator-feature.
HEAD:779cd397b4797a551607c69169f96d88b586e835.
Previously reviewed SHA is identical: commit-range diff empty; no advanced-branch changes.
Local origin/codex/ai-level-generator-feature matches. Read-only git ls-remote confirmed
the live remote branch also at779cd397b4797a551607c69169f96d88b586e835.
Live/local remote main:ff569d6d6fc22a94f09cb88eb82762d2ac91f677. No fetch/update/publication.
Existing local branch main is a separate ref, not this implementation baseline.

Initial selected-worktree status had only modified docs/AI_USAGE_LOG.md and
docs/EVIDENCE_W08.md (the earlier report-verification entries). Preserve byte prefixes:

| File | Initial bytes | SHA-256 of initial bytes |
|---|---|---|
| docs/AI_USAGE_LOG.md |45081|9168cf68c4e01532aa27d9c0f523c05a11ed2bc47a8feb71721a1a6ae9a2f38b|
| docs/EVIDENCE_W08.md |44524|e811aa34a1a5aabbd1dbf57453ef31beea2209324cacba885172af362845b18a|

The original project on main was inspected read-only for initial context/status, then
excluded as a baseline. No reset/stash/checkout/tag/commit/push/merge/deploy command.
No other checkout was modified. No real credential or environment-file content inspected.

## Actual commands and results

Observed Node v24.14.0/npm11.12.1 meet project requirements.
Commands ran in the target worktree. npm commands that can start server/tests ran through
a Node child-process wrapper explicitly supplying empty GEMINI_API_KEY and
AI_FAILOVER_ENABLED=false. Fake-backed security composition injects a synthetic key and SDK,
does not load .env, and never falls through to real transport. No live call was made.

| Check | Actual result |
|---|---|
| npm ci | PASS,85 packages added/86 audited,0 vulnerabilities |
| npm run typecheck | PASS, browser and server TypeScript projects, exit0 |
| npm run test:run | PASS,38 files/391 tests, exit0 |
| npm audit --audit-level=high | PASS,0 vulnerabilities, exit0 |
| npm run build | PASS,119 modules; Vite8.3.5, exit0 |
| npm run test:security | PASS,23 files/258 unit tests + build +8 browser tests, exit0 |
| npm run test:e2e, first invocation | STARTUP FAILURE, exit1:4173/api/health already in use while security browser fixture still held it; no test cases ran |
| npm run test:e2e, after security suite settled | PASS,29 browser tests, exit0 |
| npx playwright install chromium | NOT RUN; installed Chromium successfully executed both browser suites |

The258-unit security subset is contained within391, not additional distinct unit tests.
Eight security plus29 existing browser cases are37 distinct cases. The initial browser
startup failure was a scheduling collision caused by overlapping suite lifetimes; it
required no source/config change. Run these suites sequentially in future checkpoints.

Informational warnings: node-domexception deprecation, NO_COLOR/FORCE_COLOR interaction.
No application failure remains from the executed baseline checks. New010 expectations
are all NOT RUN; no new security-fix behavior has been implemented or proven.

## Claim, signal, change, result

- Claim A: admission rate and per-job ceilings leave cumulative invocation count unbounded.
  Signal: current admission.ts has only five rolling timestamps/capacity; source exposes
  every primary/retry/backup start but no process-total gate. This is source review,
  not a newly executed exhaustion probe.
- Claim B: generator browser byte rejection occurs after full text consumption.
  Signal: actual response.text() precedes byte comparison. The supplied review reported
  consumption of128KiB; that probe was not rerun during this session.
- Change: documentation010, local Spec Kit feature selection, appended evidence/AI usage
  only. Two independent proposed corrections, no application/test/dependency edits.
- Result: ready for consistency analysis/owner review, with allowance60 and process-reset
  semantics still pending. Baseline passes after serial browser execution, but does not
  establish the proposed fixes or any real Google account settings.

## Source drift and Spec Kit operation

Read current AGENTS/constitution/GAME_SPEC/context and accepted001-009 materials relevant
to this work, including006-009 contracts and007/008/009 guides before their code paths.
009 spec/plan retain stale pending/audit wording; current AGENTS/tasks/source/evidence and
fresh checks show implemented009. No authoritative policy conflict was silently resolved;
the higher-priority current instructions control, and historical documents are preserved.

Scanned001-009 before choosing sequential010. No .specify/extensions.yml exists, so no
before/after workflow hooks were registered. Resolved active spec/plan/tasks templates
through local scripts. Local .specify/feature.json selects specs/010-ai-resource-bounds
and is Git-ignored; verify it in a fresh checkout. Script BRANCH is its feature label,
not a Git checkout operation. Current Git branch remains the requested generator branch.
