# Tasks: Bounded backup model failover

**Input**: spec.md, plan.md, research.md, data-model.md, contracts/ and AI_EVALS.md.
**State**: All implementation and verification tasks T001–T030 completed; live calls remain separately unauthorized.
**Workflow**: User authorized implementation for both features; tests before behavior and fake transports for routine verification.
Task paths are project-relative. Expected source paths can change only with a recorded,
consistent update. No task contains source or paste-ready tests.

## Phase 1: Setup and acceptance

- [X] T001 Read AGENTS.md and existing features006/007 including current debug evidence; inspect current working tree, reproduce baseline checks and record actual state in docs/EVIDENCE_008.md without overwriting docs/EVIDENCE_W05.md or unrelated work. (FR-018)
- [X] T002 Record explicit implementation/scope acceptance and reconcile only the proposed amendments from specs/008-model-failover/contracts/compatibility.md in .specify/memory/constitution.md, docs/GAME_SPEC.md, specs/006-ai-feature/spec.md, specs/007-agent-level-generator/contracts/agent-run.md, AGENTS.md and docs/AI_USAGE_LOG.md; preserve history and do not invent student-pair contributions. (FR-020)
- [X] T003 Record the actual selected backup provider/model, required generation/advice capabilities, official documentation, quota/access independence and justified transport/dependency decision in specs/008-model-failover/research.md; update this package consistently if scope differs from its drafting defaults. (FR-001, FR-019)
- [X] T004 Re-run Spec Kit analysis and retain the unchanged F01–F28 expectations in specs/008-model-failover/AI_EVALS.md before behavior; record readiness or blockers in docs/EVIDENCE_008.md. (FR-018, FR-020)

## Phase 2: Foundation and one-attempt adapters

- [X] T005 [P] Write failing disabled/default, invalid enabled profile/key/capability and zero-startup-call expectations in tests/server/provider-config.test.ts; cover F01/F24 and application-owned allowlists. (FR-001, FR-002, FR-003, FR-019)
- [X] T006 [P] Write failing failure-matrix, timing, cancelled handoff and request-local routing tests in tests/server/failover-policy.test.ts: "Primary cap8,000ms, backup cap7,000ms" and "15,000ms" shared phase, no switch delay, one250ms backup-only retry. (FR-004–FR-007, FR-010, FR-011, FR-015)
- [X] T007 Implement safe provider categories and strict opt-in profile validation in server/ai/failover-policy.ts and server/ai/provider-config.ts, matching data-model.md and F01/F24; no raw exception text, arbitrary endpoint/model input or startup live probe. (FR-001–FR-005, FR-019)
- [X] T008 Implement only the shared classified routing/remaining-time helpers in server/ai/failover-policy.ts; keep timers and counted calls owned by services and enforce F05/F06/F15/F16. (FR-004–FR-007, FR-010, FR-011, FR-015)
- [X] T009 [P] Write failing clipped transport timeout, categories, envelope/output bounds and sole-attempt tests in tests/server/level-generator-provider.test.ts and tests/server/advice-service.test.ts for the existing Gemini adapters; preserve existing generator envelope regression. (FR-005, FR-006, FR-012)
- [X] T010 [P] Write failing selected-backup wire schema, outputs, error mapping, signals and disabled-construction tests in tests/server/gemini-backup-provider.test.ts using fake transport; verify both operation capabilities from T003. (FR-001, FR-003–FR-006, FR-012)
- [X] T011 Extend operation attempt options in server/level-generator/model.ts and server/advice/service.ts; update server/advice/gemini-provider.ts for application-owned transport limits and safe errors, retaining one underlying attempt, current Gemini model and sole SDK ownership. (FR-005–FR-007, FR-012)
- [X] T012 Implement the selected backup's generation/advice single-attempt adapters in the existing sole Gemini SDK owner, server/advice/gemini-provider.ts; honor generator24,576-byte context/8,192-byte output/2,048-token cap and advice120-token/nonempty160-character tip contract; update package.json/package-lock.json only if T003 justified a dependency. (FR-001, FR-002, FR-006, FR-012, FR-019)

## Phase 3: US1 — Generator failover (P1, MVP)

**Independent test**: TraceA uses fake providers and the actual local solver to return a verified preview.

- [X] T013 [US1] Write failing quota/timeout/success/late-response/sticky-context expectations in tests/server/level-generator-service.test.ts, including TraceA and F02–F07/F10–F15; assert steps2/attempts3/recovery1/model tools1/total tools2/revisions0 for the quota-success trace. (FR-004, FR-006–FR-012)
- [X] T014 [US1] Integrate explicit counted primary/backup selection and clipped15s phase deadlines in server/level-generator/service.ts and server/level-generator/policy.ts; preserve "five decisions/six total attempts/two attempts per decision/three candidates/two revisions/eight solver executions" and40s/45s limits. (FR-004, FR-006–FR-011)
- [X] T015 [US1] Preserve existing candidate/evaluation identities, bounded copied task/evidence, final verification and verified recovery in server/level-generator/service.ts; no duplicate accepted solver call solely to switch providers, no automatic Play or rating relaxation. (FR-009, FR-012, FR-013)
- [X] T016 [US1] Prove equal rejection for invalid primary/backup decisions, whitelist/arguments/final selection and explicit refusal in tests/server/level-generator-service.test.ts; F18–F23 must not trigger another model or fabricate proof. (FR-005, FR-012, FR-013)

## Phase 4: US2 — Delayed advice failover (P2)

**Independent test**: Valid backup advice remains hidden until the next completed game.

- [X] T017 [US2] Write failing primary quota/hang/backup failure/cancellation/shared15s expectations in tests/server/advice-service.test.ts; assert at most2 invocations across roles and unchanged server-derived focus/evidence. (FR-004–FR-007, FR-014, FR-015)
- [X] T018 [US2] Integrate explicit counted routing, shared enabled-phase time and equal tip validation in server/advice/service.ts; disabled mode retains original retry/timing behavior, enabled exhaustion retains existing unavailable response. (FR-003–FR-007, FR-012–FR-015)
- [X] T019 [US2] Verify unchanged eight-field summary/generated origin and delayed reset/supersession/visibility in tests/advice/lifecycle.test.ts, tests/advice/summary.test.ts and tests/server/advice.test.ts; add only a meaningful missing assertion, without changing src/advice/ behavior. (FR-014, FR-015, FR-017)
- [X] T020 [US2] Extend e2e/advice.pw.ts only where needed to demonstrate backup-ready advice retains the one-completed-run delay and late superseded advice cannot appear; use intercepted fake responses only. (FR-014, FR-015, FR-017)

## Phase 5: US3 — Controlled stops, isolation and evidence (P2)

**Independent test**: F09/F16/F17/F27/F28 prove bounded failure without late updates or unsafe previews.

- [X] T021 [P] [US3] Write failing exact backup transport/SDK/environment ownership expectations in tests/server/boundaries.test.ts while preserving the sole Gemini importer assertion and all browser/pure-module prohibitions. (FR-002, FR-017)
- [X] T022 [P] [US3] Write failing disconnect/cancel-between-roles/late-output/concurrent-request expectations in tests/server/level-generator-api.test.ts and tests/server/advice.test.ts using fake services/transports; preserve existing request/response/body/security contracts. (FR-015, FR-017)
- [X] T023 [US3] Add bounded safe attempt/switch/terminal evidence to server/ai/failover-policy.ts or the smallest injected observer and both services; test in tests/server/failover-policy.test.ts that events are "at most32" and exclude credentials/prompts/summaries/outputs/exception text. (FR-016)
- [X] T024 [US3] Wire validated enabled/disabled profiles and services in server/index.ts; prove no hidden backup construction in disabled mode and no shared routing/counters across operations in tests/server/provider-config.test.ts and service tests. (FR-001–FR-003, FR-010, FR-014, FR-017)
- [X] T025 [US3] Complete F09/F13/F14/F16/F17/F28 regressions in tests/server/level-generator-service.test.ts and tests/server/advice-service.test.ts; ensure terminal cancellation and ordinary verified recovery retain original budgets/reasons. (FR-008, FR-011, FR-013, FR-015)
- [X] T026 [US3] Run unchanged e2e/level-generator.pw.ts/e2e/smoke.pw.ts with offline provider configuration; confirm exact preview/Play/preset behavior and unchanged UI/DTO fields, adding only missing assertions justified by FR-017. (FR-012, FR-017)

## Phase 6: Verification and handoff

- [X] T027 Run all AGENTS.md checks on current source and record actual results in docs/EVIDENCE_008.md: clean install, both typechecks, unit tests, build, high-severity audit, Chromium availability and browser suite; map F01–F28 to real tests. (FR-018)
- [X] T028 Update README.md, docs/CONTEXT_MANIFEST.md, docs/AI_USAGE_LOG.md and docs/EVIDENCE_008.md with accepted configuration/how-to-run notes, claim/signal/change/result, safe routing evidence and honest delivery status; never include credentials or invented usage/cost. (FR-016, FR-019, FR-020)
- [X] T029 Prepare a bounded separately authorized manual provider-switch procedure in specs/008-model-failover/quickstart.md after fake checks pass; do not execute without fresh explicit permission or reuse the prior three-run authorization. (FR-018)
- [X] T030 Re-run Spec Kit analysis/convergence as appropriate against specs/008-model-failover/spec.md, plan.md and tasks.md; inspect actual diff, preserve s003-baseline-v1 and record any unbuilt work/uncommitted delivery state in docs/EVIDENCE_008.md. (FR-018, FR-020)

## Dependencies and implementation strategy

Setup -> foundation -> generator MVP -> advice -> cross-cutting integration -> verification.
T002 and T003 are preflight gates; both are complete before provider-specific implementation.
Within a service, write tests before behavior. Shared interfaces from T011 precede service
integration; T024 injection depends on both integrations. US3 safety assertions are mandatory
for the MVP too: do not postpone cancellation/validation protections until a later phase.

Parallel opportunities: T005/T006 use separate test files; T009/T010 use separate provider
tests; T021/T022 use separate boundary/route tests after prerequisite behavior contracts.
US1 and US2 service work can be separate after foundation, but do not concurrently edit
shared interfaces/index. These are implementation opportunities, not an instruction to spawn agents.

MVP is foundation plus generator and its applicable safety cases. Full two-feature scope
also needs US2 and all cross-cutting gates. No commit/push/merge/deployment is implied.
