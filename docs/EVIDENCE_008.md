# Feature 008 implementation evidence

**Date started**: 2026-10-06 (Europe/Budapest)
**Scope**: Bounded opt-in backup routing for existing level generation and delayed advice.
**Live providers**: No calls made or authorized. All feature verification uses fakes and the real local solver.

## T001 — inspected working tree and baseline

- **Claim**: Establish the current local baseline before Feature 008 changes.
- **Signal**: The starting branch was `main...origin/main`. The working tree already contained uncommitted Feature 007 generator code, W05 debugging corrections, advice updates, documentation changes, and unrelated assets/skills. These were preserved. The baseline tag `s003-baseline-v1` was not changed.
- **Environment**: Node v24.14.0; npm 11.12.1.
- **Results** (current starting tree, before Feature 008 behavior changes):
  - `npm ci`: passed; 87 packages added, 88 audited, zero vulnerabilities.
  - `npm run typecheck`: passed (browser and server TypeScript projects).
  - `npm run test:run`: passed; 25 files / 260 tests.
  - `npm run build`: passed; 119 client modules.
  - `npm audit --audit-level=high`: passed; zero vulnerabilities.
  - `npx playwright install chromium`: passed.
  - `npm run test:e2e`: passed; 29/29 browser tests.
- **Limitations**: These baseline results validate the existing Feature 006/007 working tree only. They are not Feature 008 results.

## T002 — authority reconciliation

- **Claim**: Record the user-approved Feature 008 scope before behavior changes.
- **Signal**: The user explicitly authorized both AI operations and the narrow compatibility amendments in `specs/008-model-failover/contracts/compatibility.md`.
- **Change**: Amended the constitution to v1.4.0, `docs/GAME_SPEC.md`, Feature 006's scope/timing contract, Feature 007's bounded run contract, `AGENTS.md`, and `docs/CONTEXT_MANIFEST.md`. Feature 008 is opt-in and disabled by default; enabled policy is primary 8s / backup 7s / shared phase 15s. Existing outer budgets, validation, security, solver proof, explicit Play, advice input and delayed lifecycle remain unchanged. No student-pair approval or individual contribution is inferred.
- **Result**: The authority conflict was reconciled. The user subsequently selected Gemini 2.5 Flash (`gemini-2.5-flash`) for both operations. No credentials were read or printed.

## Test-first routing expectations — 2026-10-06

- **Claim**: Fixed the provider-neutral policy/configuration and both operation-integration expectations before their implementation.
- **Signal**: The new policy and provider-config test files were run against missing modules: each failed at import as expected. After the shared policy/config modules were added, 18 tests passed. An initial config-test assertion attempted to compare a message against an empty string; that test-only assertion was corrected to use a nonempty sentinel, then the focused 18 tests passed.
- **Failing service/transport signal**: `npx vitest run tests/server/level-generator-service.test.ts tests/server/advice-service.test.ts tests/server/level-generator-provider.test.ts` returned exit 1 with exactly 3 expected failures and 55 passing tests: generator quota switch produced only the existing verified `provider_failed` fallback; advice had no enabled backup route; Gemini generator adapter retained the 15,000ms transport timeout instead of accepting the application-clipped 8,000ms option.
- **Change**: No service/adapter behavior was changed before those expected failures were recorded. The shared provider-phase policy, service routing, transport-option support and backup adapter were then implemented against these expectations.
- **Additional boundary regression**: A fake primary and backup that both hang for their full 8s/7s caps initially produced the stop reason `deadline` before the generator's actual40s cutoff. The failing test led to a narrow mapping correction: only the actual run decision cutoff yields `deadline`; exhausted provider attempts keep the pre-existing `provider_failed` reason. The red test then passed with the existing verified template recovery.

## T003 — approved provider profile recorded

- **Claim**: Record provider/model choice, both operation capabilities, access limits and dependency decision before adapter work.
- **Signal**: The user selected Gemini 2.5 Flash for both generation and advice. Google's official model catalog identifies `gemini-2.5-flash`; official structured-output documentation lists Gemini 2.5 Flash as supported. Official rate-limit documentation says limits are project-scoped and vary by model/tier. The 2.5 model page currently notes access is limited to users who actively used 2.5 models.
- **Decision**: Keep the existing `@google/genai` dependency; no added provider SDK or transport dependency. Both operations retain their already-tested strict schemas and token/output ceilings. No credential or account access check was made.
- **Result/limitation**: Model identity and documented structured-output capability are recorded. Actual account access is unverified, and same-project quotas can be shared; failover cannot guarantee recovery from project-wide exhaustion. No live request was made.
- **Official documentation**: [Gemini model catalog](https://ai.google.dev/gemini-api/docs/models); [structured outputs](https://ai.google.dev/gemini-api/docs/generate-content/structured-output); [rate limits](https://ai.google.dev/gemini-api/docs/rate-limits).

## T004 — Spec Kit analysis

- **Claim**: Cross-check the accepted spec, plan, tasks and constitution before proceeding.
- **Signal**: Prerequisites resolved Feature Dir `specs/008-model-failover`; the required spec, plan and tasks exist. `.specify/extensions.yml` is absent, so no extension hooks are registered. F01–F28 in `AI_EVALS.md` were preserved unchanged.
- **Findings**: All twenty functional requirements are referenced by dependency-ordered tasks. The analysis found stale preflight/status text and planned filenames that did not match the existing single Gemini SDK owner (`server/advice/gemini-provider.ts`) or the implemented fake adapter test path. No constitution/gameplay conflict remains after T002.
- **Resolution**: Updated the plan, tasks, profile references and quickstart to the accepted model, implementation paths and current authority. Provider-specific code reuses the existing SDK owner; no dependency is added. Fake expectations and red signals were recorded before the respective behavior changes.
- **Result**: Ready to complete implementation and checks. Live provider access remains separately unauthorized.

## Current targeted verification

- `npm run typecheck`: passed (browser and server TypeScript projects).
- Focused server suites: 11 files / 121 tests passed before the final timeout, status-classification and request-isolation coverage was added; the updated final counts are recorded below after the full run.
- All validation used fake transports/clocks and the local deterministic solver. No live provider request was made.

## Final implementation and required checks

- **Configuration**: `AI_FAILOVER_ENABLED` absent or `false` keeps failover disabled. `true` requires the fixed approved profile and a present server-side `GEMINI_API_KEY`; the key value is only checked for presence and never copied into diagnostics. Both providers use one SDK attempt with the clipped timeout and abort signal. Existing `@google/genai` is reused; Feature 008 adds no dependency.
- **Routing**: Enabled primary-to-backup switching uses one 8,000ms primary cap, one 7,000ms backup cap and one shared 15,000ms phase. No switch delay; later backup-only retries use the existing 250ms interruptible delay. Generator role/counters stay request-local and sticky only for that run. Existing solver calls, full-target proof, final verification, fallback and Play requirements remain unchanged. Advice continues to use the unchanged validated input and delayed lifecycle.
- **Safe evidence**: At most 32 allowlisted events per request/job; operation, role, event, attempt/provider-attempt counts, generator decision number when available, elapsed time and fixed failure category only. No exception text, API key, prompt, summary, lane content, tip, proof, model output or new browser DTO fields. Evidence sink exceptions are isolated from routing.
- **Verification** (final source): `npm ci` passed (87 packages added; 88 audited; 0 vulnerabilities); `npm run typecheck` passed; `npm run test:run` passed (29 files / 305 tests); `npm run build` passed (119 client modules); `npm audit --audit-level=high` passed (0 vulnerabilities); `npx playwright install chromium` exited 0; `npm run test:e2e` passed (29/29). `git diff --check` exited 0. The focused failover/provider/service suites also passed. Browser tests use intercepted/stubbed responses; no live provider request was made.
- **Repository state**: The pre-existing dirty Feature 006/007, debugging, package and unrelated files remain in the working tree. No commit, push, merge or deploy was made. `s003-baseline-v1` still points to `daa46329d91a5a95e1a3bde2a78c962fca82cb47`.
- **Limitations**: Gemini account/model access was not checked. Gemini limits may be shared at project level, so failover cannot recover from all project-wide quota exhaustion. Live verification remains unauthorized and is not counted as a feature check.

### Fixed F01–F28 expectation coverage

| Eval | Verified by |
|---|---|
| F01 | `provider-config.test.ts`; disabled primary behavior in both service suites |
| F02–F04 | Both service failover tests; `gemini-backup-provider.test.ts` error-classification matrix |
| F05–F06 | `failover-policy.test.ts` hung 8s+7s, deadline-equality and late-response cases; generator late/cancel cases |
| F07 | TraceA in `level-generator-service.test.ts` with the real solver, existing IDs, final verification and exact counters |
| F08–F09 | `advice-service.test.ts` valid backup input/output and shared-phase exhaustion; generator dual-failure recovery test |
| F10–F12 | Generator sticky role/later-run-primary tests and TraceA counter/context assertions |
| F13–F15 | Generator six-attempt, 40s/45s, outer-deadline clipping and deadline equality tests |
| F16–F17 | Policy cancellation between roles, during backup and during retry delay; API disconnect and advice supersession tests |
| F18–F20 | Generator invalid request/output/tool/final-selection tests, including invalid backup decision; route validation tests |
| F21–F23 | Refusal/permanent/output-limit policy matrix and provider output-limit/status tests |
| F24–F25 | `provider-config.test.ts` and `gemini-backup-provider.test.ts` fake wire schema, caps, signal and one-attempt settings |
| F26 | Advice service/lifecycle/summary/server and 5 delayed-advice E2E cases |
| F27 | `boundaries.test.ts` and `failover-policy.test.ts` bounded allowlisted diagnostic events |
| F28 | `ai-isolation.test.ts` overlaps a generator switch with an independent advice primary; generator later-run reset tests |

## T030 — final convergence and handoff state

- **Spec Kit analysis**: Re-ran prerequisites and cross-artifact review. The 20 functional requirements and three user stories have task and test coverage; F01–F28 remain unchanged. Authority, selected profile, source paths and task sequencing are consistent. No actionable unbuilt work was found, so no convergence tasks were appended.
- **Repository review**: Inspected the implementation diff and final dirty status. Existing uncommitted Feature 006/007/debugging and unrelated work remains present. The baseline tag still resolves to `daa46329d91a5a95e1a3bde2a78c962fca82cb47`. No commit, push, merge or deployment was performed.
- **Delivery limitation**: Failover is implemented but disabled by default. To enable it, the server process needs `AI_FAILOVER_ENABLED=true` and the existing server-only `GEMINI_API_KEY`; Gemini 2.5 Flash access remains unverified. Live provider calls require fresh explicit authorization.
