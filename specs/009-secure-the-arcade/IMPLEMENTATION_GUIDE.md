# Cheaper-model implementation instructions: Week 08

Implement only the user-approved Secure the Arcade scope in this package. This guide
contains instructions and expectations, not implementation source. Write the code yourself.

## Start in the correct checkout

Use branch **codex/ai-level-generator-feature**, baseline
06ff2534aa4e28abf65c3822d5f6695f3855103d.
Current checkout:
C:/Users/AleksA/.codex/worktrees/feature-007-generator-publish/Rush hour crossing.

Do not use the similarly named codex/ai-level-generator worktree: it had unresolved
merge conflicts when planning ran. The original main directory contains separate local
work. Do not stash/reset/delete that work or copy old source over this implementation.
Check Git branch/status/HEAD before writing. Preserve new legitimate work if HEAD moved.

The desktop app cannot attach this existing checkout to the planning chat because another
chat owns it. Use the actual branch directory explicitly, or open the branch's owning chat.
Do not silently implement in the original main directory. A filesystem workdir does not
change a chat's sidebar attachment.

Read AGENTS.md, constitution, GAME_SPEC and CONTEXT_MANIFEST. Then read accepted006/007/008,
starting with their implementation guides, and this package in this order:
spec.md -> plan.md -> research.md -> data-model.md -> contracts/security-policy.md ->
SECURITY_EVALS.md -> tasks.md -> quickstart.md -> docs/EVIDENCE_W08.md.

Use the local .agents/skills/speckit-implement/SKILL.md workflow. Ensure local Spec Kit
metadata selects specs/009-secure-the-arcade; it is separate from the Git branch name.
The metadata may be ignored by Git, so verify it again in any fresh checkout.
Do not rerun specify to create feature010 or switch branches merely to match feature009.

## Baseline repair comes first

Planning actually ran on2026-10-27: Node24.14.0/npm11.12.1, both typechecks PASS,
29 unit files/305 tests PASS, production build PASS,29 browser tests PASS.
Audit FAILED:4 vulnerabilities,2 moderate and2 high. npm ci was not rerun during planning.
Those are historical planning observations, not your implementation checkpoint.

Reproduce baseline and record actual outputs before expanding behavior. Targeted dependency
repair is the first required slice. Researched compatible floors are Vite8.3.3,
Vitest5.0.3 with mocker>=5.0.3, Zod4.6.6. Verify current advisories and actual resolved
versions. Avoid blind/forced upgrades or unrelated cleanup. Run npm ci and every AGENTS.md
gate after that repair; a still-failing baseline blocks functional feature work.

## Keep the approved behavior

- No game rules, preset data, golden paths, board dimensions, difficulty semantics,
  solver proof rules or approval flow changes.
- Model can request only solveLevel with validated lanes. Settings, IDs, routing and
  budgets belong to the server. Final selection must reference this run's solved evidence.
- Keep the real incremental solver and separate final verification. A budget limit is
  inconclusive, not proof of impossibility. Play requires the exact verified configuration.
- Preserve generated-origin summaries and the one-completed-run advice delay.
- Preserve primary/backup model choices, disabled-default failover, phase/run limits,
  classifications, cancellation and actual attempt accounting.
- No new user input, rich text, accounts, database, deployment, write tool or optional challenge.

## Follow tests before each change

Execute tasks.md in dependency order, without marking a task done until its checks ran.
SECURITY_EVALS.md already defines T00-T17. First run T02/T13/T16 probes before their
changes and save the actual observations. A missing-module test failure is not a measured
HTTP/CSP weakness: probes must reach the existing behavior they intend to measure.
Do not alter fixtures/acceptance criteria between baseline and final runs.

Where a boundary is already correct, add the regression and record PASS before/after.
Do not insert a vulnerability or rewrite working code to manufacture a fix.
Document one claim, signal, smallest change and repeated result for each behavior slice.

## Compose real controls with fake transport

Use actual HTTP handler, services, validators, dispatch and solver. Only external provider
transport/time and deliberately faulty dependency output are injected.
The normal integration run must make two model decisions and execute the actual solver
between them, then independently verify final traffic. Route-fulfilled browser success
alone is not end-to-end proof.

The tests/server/fixtures/w08-server.ts composition uses synthetic config and an injected
SDK client. It never loads local .env, reads a real key or falls back to a real provider.
It may export a test fixture factory so browser tests can start/reset an actual server and
capture safe counters/events in process. No production fake switch or test-control API.
Keep existing sole-SDK-import and environment-reader architecture assertions exact.

## Bound underlying work, not just HTTP promises

Use the shared policy from security-policy.md. One generation and one advice slot, two
combined, five admissions total per rolling minute, no queue and no caller-selected scope.
Invalid/busy/rate-denied requests consume no accepted-request timestamp.

Track actual provider promises before timeout races. Logical completion does not imply
transport settlement. After timeout/disconnect, ignore late results and hold draining
capacity until every started underlying attempt settles. Release once only. Test a
provider that ignores abort and a later legitimate request after real release.

Do not wait for primary abort acknowledgement before an allowed backup request. Keep
all actual attempts in the same existing budget. A stuck transport may retain capacity
until local restart; report the availability tradeoff instead of permitting unbounded
replacement work. Retain cooperative solver cancellation/batches and finite work limits.

## Validate and minimize output

Retain strict model, arguments, evidence, final DTO and proof checks. Unknown tool names,
including inherited-property names, cannot execute. Test valid-shaped foreign evidence
separately from schema rejection.

Add the bounded advice raw-text and HTTP/browser-response handling. Keep nextTip<=160
and120 tokens. Do not forward a whole internal tool wrapper. Test rejection of forbidden
evidence fields and projection of an unrelated secret sibling separately.
State that a post-SDK text cap does not limit all allocations made inside the SDK.

No free user text enters the generator context. Do not add a prompt-injection entry point.
T09 is malicious-provider execution rejection, not proof of live-model resistance.

## Prove the actual production browser

Use dist through the real server handler, with enforcing CSP and existing security headers.
Keep dev/HMR separate. The second-loopback fixture script must return200 and execute on
an unprotected control page. On the game page prove its actual policy violation and absent
execution. No bypassCSP or missing-resource shortcut.

Test markup through existing advice and unavailable text; inspect DOM as well as marker.
Keep Serbian text/apostrophes/a < b usable. Generator model summary is deliberately
discarded; prove that without inventing a new renderer. All normal game/AI flows still work.

## Record only safe, true evidence

Events use the exact fixed projection in data-model.md, actual counters and generated IDs.
Include allowed, denied and terminal events in disabled-failover mode too. No raw request,
stats, prompt, provider output, arbitrary tool name, exception, stack, key or private reasoning.
Default ring is bounded128/process, max32/job, no endpoint/files; document retention limits.

Use only the synthetic sentinel. First prove the fake SDK factory received it, then scan
actual dist/maps if any, HTTP, model contexts and event captures. Independently test an
adapter exception, disallowed tool field and newline log injection.

The game has no private-resource ownership system or automatic access cookie. Document
the conditional N/A branches honestly and still test real local access/run scope.
Browser score is unverified; do not claim arithmetic checks prove the game was played.
Do not invent individual student names or driver/reviewer contributions.

## Finish and report

Provide npm run test:security, covering units/integration, production build and real
browser security without a provider key. Explicitly include security browser tests;
the existing test:e2e script lists its files and does not discover every new test.
Run all AGENTS.md gates plus the security command, then fill actual EVIDENCE_W08 results.
New expectations remain NOT RUN until executed; task checkmarks are verification claims.

Do not spend live quota. Week08 needs no live call. No commit, push, merge or deployment
is requested by this handoff. Report built/unbuilt work, actual tests/audit, residual risks,
task completion and branch status. Branch-only work is not submitted to main.
