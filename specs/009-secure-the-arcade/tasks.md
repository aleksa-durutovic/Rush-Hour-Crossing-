# Tasks: Secure the Arcade

Input: spec.md, plan.md, research.md, data-model.md, security-policy contract and
SECURITY_EVALS.md. Original implementation and review-correction tasks are tracked below.
Each checkbox requires implementation AND executed verification, with actual evidence.
Record one claim -> failing signal -> smallest change -> same-test result per slice.

## Phase 1 - Setup and baseline repair

- [X] T001 Verify branch codex/ai-level-generator-feature and current changes; reproduce the initial Node/npm/typecheck/test/build/browser/audit checkpoint and record actual results and baseline SHA in docs/EVIDENCE_W08.md. Never use the conflicted worktree or rewrite s003-baseline-v1. [FR-016]
- [X] T002 Resolve the measured audit blocker with targeted package.json/package-lock.json updates in existing lines: researched floors Vite8.3.3, Vitest5.0.3 with mocker>=5.0.3, Zod4.6.6; recheck current advisories, run npm ci and all AGENTS.md gates, and record exposure/actual results in docs/EVIDENCE_W08.md before functional changes. No audit fix --force. [FR-016,SC-007]

Checkpoint: existing baseline gates must be green before functional hardening. If package
repair introduces another failure, fix only its measured cause; do not expand scope.

## Phase 2 - Foundational test composition and before measurements

- [X] T003 Create tests/security/fixtures.ts and tests/server/fixtures/w08-server.ts using actual handler/services/validators/solver with injected fake SDK and synthetic config. No .env loading, real key access, live fallback, normal-runtime fake switch or diagnostics route. In tsconfig.json exclude tests/security; in tsconfig.server.json include tests/security alongside tests/server, retaining Node-only libraries and all strict checks. [FR-017]
- [X] T004 Add playwright.security.config.ts and an initial fixture in e2e/security.pw.ts serving dist at127.0.0.1:4173, one worker, reuse disabled and bypassCSP false. Include the new config in tsconfig.json for typechecking. Keep server controls real and configure fake scenarios programmatically in the test composition. [FR-014,FR-017]
- [X] T005 Add unchanged pre/post probes for T02 privilege fields, T13 rate allowance and T16 production CSP in tests/security/http.test.ts, admission.test.ts and e2e/security.pw.ts; run them before those behavior changes and record actual baseline results in docs/EVIDENCE_W08.md. Do not weaken an existing control. [FR-015,SC-006]

Checkpoint: test composition and pre-change observations exist. Newly failing tests express
the approved changes; they are distinct from unresolved pre-existing baseline failures.

## Phase 3 - User Story 1: Verified flow and authority (P1)

Goal: normal generation remains useful and invalid HTTP/model/tool data never gains authority.
Independent check: full HTTP fake-backed two-decision/real-solver success plus initial denial.

- [X] T006 [US1] Write T00/T01/T02/T03 full HTTP assertions in tests/security/flow.test.ts and http.test.ts, including zero-work denial, positive field limits, read-only snapshots, own/foreign evidence and valid public errors. [FR-001,FR-002,FR-003,FR-013,SC-001,SC-002]
- [X] T007 [US1] Add failing Origin cases in tests/security/http.test.ts, then implement exact configured-origin checking in server/app.ts/server/config.ts/server/index.ts and pinned loopback port5173 in vite.config.ts as needed; preserve absent-Origin direct clients, Host/no-CORS and existing body/schema enforcement. [FR-003]
- [X] T008 [US1] Add T07/T08/T09 cases in tests/security/agent.test.ts for constructor/toString, unknown tools, valid-name bad arguments and valid-shaped foreign evidence; capture actual provider/solver calls and unchanged state. Prove valid solveLevel/same-run selection passes. [FR-004,SC-002]
- [X] T009 [US1] Make only measured missing enforcement fixes in server/level-generator/service.ts or shared/level-generator-contract.ts after T008 fails. If existing code passes, keep it and record regression-only coverage. Never alter proof, gameplay or tool scope. [FR-004,FR-001]
- [X] T010 [US1] Write T06/T10 output tests in tests/security/output.test.ts: independently invalid/oversized provider text, invalid final DTO, forbidden compact-evidence fields and projected wrapper siblings. Quote limits: "2048 UTF-8 bytes" advice provider, "4096 UTF-8 bytes" advice HTTP/browser, "8192 UTF-8 bytes" generator output, "4096 UTF-8 bytes" compact evidence. [FR-005]
- [X] T011 [US1] Add the advice pre-parse text bound in server/advice/gemini-provider.ts and server/browser advice response bounds in server/app.ts/src/advice/client.ts; narrowly fix missing projection/validation in server/level-generator/service.ts only if T010 demonstrates a gap. Preserve "at most160" nextTip and120 tokens, strict DTOs and sole SDK owner. [FR-005,FR-001]
- [X] T012 [US1] Add T15 integrity assertions in tests/security/integrity.test.ts and e2e/security.pw.ts; prove forged summaries/URL/localStorage cannot grant policy authority and generation leaves active play unchanged. Explain unverified local scores in README.md. [FR-013]
- [X] T013 [US1] Implement T17's shared malicious foreign-final fixture in tests/security/flow.test.ts and e2e/security.pw.ts: no final verification, playable result, injected summary or active-state replacement; Play stays unavailable. [FR-014,SC-002]

## Phase 4 - User Story 2: Bounded admission and work lifetime (P1)

Goal: no excessive underlying work, even after timeout/disconnect; legitimate recovery works.
Independent check: fake-time capacity/rate/draining HTTP cases and exact existing budgets.

- [X] T014 [US2] Write failing tests/security/admission.test.ts for "maxGeneration=1; maxAdvice=1; maxCombined=2; maxAdmissions=5; windowMs=60000", atomic acquisition, window edge, denied-request non-accounting and legitimate recovery. [FR-007,SC-003]
- [X] T015 [US2] Implement the fixed shared policy/controller in server/security/admission.ts using monotonic injected time and no new environment readers, client scope keys or queue. Rate timestamps are bounded to five; capacity is checked before rate acceptance. [FR-007]
- [X] T016 [US2] Write unresolved/late/synchronous-error tests in tests/security/admission.test.ts and budget.test.ts: a provider ignoring abort keeps a draining lease after response completion; eventual settlement releases exactly once; primary timeout cannot block permitted timely backup. [FR-008,FR-006]
- [X] T017 [US2] Implement server/security/active-work.ts and narrow injected tracking hooks in server/level-generator/service.ts and server/advice/service.ts around actual primary/backup invocation promises before race wrappers. Preserve all routing/counters and SDK attempts1; no silent early release. [FR-008,FR-006]
- [X] T018 [US2] Integrate shared admission/leases in server/app.ts/server/index.ts with exact busy/rate errors and Retry-After from security-policy.md; add only needed error guard values in shared/advice-contract.ts. Prove T13 through real HTTP with both operations. [FR-007,FR-008]
- [X] T019 [US2] Add independent T11/T12 cases in tests/security/budget.test.ts and reuse tests/server/level-generator-service.test.ts/failover-policy.test.ts: repeated candidate, total attempts, call timeout, cutoff, total deadline and late cleanup must reach their intended boundary. [FR-006]
- [X] T020 [US2] Fix only measured lifecycle/accounting gaps in server/level-generator/service.ts, server/advice/service.ts or server/ai/failover-policy.ts, then rerun T11-T13 and existing disabled/enabled routing/isolation suites. Keep40s/45s generator and8s/7s/shared15s enabled budgets unchanged. [FR-006,FR-001]

## Phase 5 - User Story 3: Browser protection and private diagnostics (P2)

Goal: inert output, actual production CSP and useful minimal security events.
Independent check: real DOM/policy tests plus sentinel and log injection through real paths.

- [X] T021 [US3] Write tests/security/privacy.test.ts for exact event projection, allowed/denied/terminal events, zero-work denied counters, diagnostic sink failure and newline log injection. Constraints: exact eight keys from data-model.md; providerAttempts integer0..6; executedToolCalls integer0..8; correlationId nonempty<=64; max32/job and128-event ring. [FR-011]
- [X] T022 [US3] Implement server/security/events.ts and narrow event hooks in server/app.ts/services/index.ts; use fixed enums/actual counters, UTC timestamps and server-owned IDs. Keep default history last128 events, process-only, no public endpoint or raw output. Preserve existing safe failover events separately. [FR-011]
- [X] T023 [US3] Add independent sentinel scenarios in tests/security/privacy.test.ts: synthetic key reaches injected SDK factory; adapter error/tool field/model contexts/HTTP/events/dist/maps do not disclose it. Keep capture data synthetic and show both allowed and denied event examples. [FR-012,SC-005]
- [X] T024 [US3] Write browser T04/T05 in e2e/security.pw.ts through existing advice nextTip and generator unavailable text; check marker, no executable DOM, no unsafe navigation, Serbian/apostrophe/a < b positive text and existing advice delay. [FR-009,SC-004]
- [X] T025 [US3] Change dynamic display in src/main.ts only if T024 proves a defect; retain textContent/static-template separation and original game wiring. Do not add a sanitizer, rich-text renderer or extra user input just to satisfy tests. [FR-009,FR-001]
- [X] T026 [US3] Extend T16 in e2e/security.pw.ts with a second-loopback available marker script, unprotected execution control, actual policy violation observation and real game/AI positive control; assert actual response headers in tests/security/http.test.ts. [FR-010,SC-004]
- [X] T027 [US3] Add enforcing production CSP in server/app.ts for dist-serving responses per security-policy.md, preserving nosniff/no-referrer and a separate dev/HMR profile. Re-run T04/T05/T16 and all existing browser flows without bypassCSP. [FR-010,FR-001]

## Phase 6 - User Story 4: Repeatability and evidence (P2)

Goal: all mandatory scenarios are executable and evidence is honest and explainable.
Independent check: one security command plus a complete traceable results record/demo.

- [X] T028 [US4] Add test:security:unit, test:security:browser and aggregate test:security in package.json; explicitly include relevant existing suites and the new Playwright config. Aggregate runs unit security, production build and browser security sequentially, stops on error and needs no real key. [FR-014,FR-017,FR-018]
- [X] T029 [US4] Complete T00-T17 with positive controls in tests/security/*.test.ts/e2e/security.pw.ts; confirm no production controls were replaced by fakes and record each test path/actual counters/state in docs/EVIDENCE_W08.md. [FR-014,SC-006]
- [X] T030 [US4] Repeat T02/T13/T16 using T005's unchanged fixtures/criteria and record before/after checkpoints/diffs/limits in docs/EVIDENCE_W08.md. Preserve existing-safe baseline results and actual audit exposure decisions. [FR-015,FR-016]
- [X] T031 [US4] Finish data inventory, six risks/three priorities, I1-I8 enforcement/test mapping, conditional N/A rationale and event retention/residual risks in docs/EVIDENCE_W08.md; link SECURITY_EVALS.md rather than duplicating its policy. [FR-015]
- [X] T032 [US4] Follow specs/009-secure-the-arcade/quickstart.md for the eight-minute demo and document repeatable commands/reset in README.md; add actual student contribution/AI responsibility only when supplied or observed in docs/EVIDENCE_W08.md/docs/AI_USAGE_LOG.md. [FR-018]

## Phase 7 - Polish and final gates

- [X] T033 Run npm ci, both typechecks, full unit tests, build, high-severity audit, Chromium availability, existing test:e2e and aggregate test:security from the final worktree; record actual checkpoint/results/limitations in docs/EVIDENCE_W08.md. No invented passes or live calls. [FR-016,SC-007]
- [X] T034 Review docs/AI_USAGE_LOG.md, AGENTS.md and docs/CONTEXT_MANIFEST.md for final traceability; verify no unrelated changes or secret artifacts, mark only verified tasks complete in tasks.md and report branch/delivery status. Do not commit/push/merge/deploy without a user request. [FR-018]

## Dependencies and execution strategy

T001 -> T002 -> T003 -> T004 -> T005 are prerequisites for functional slices.
US1: T006 -> T007; T008 -> T009; T010 -> T011; then T012/T013.
US2: T014 -> T015; T016 -> T017 -> T018; T019 -> T020.
US3: T021 -> T022 -> T023; T024 -> T025; T026 -> T027.
US4 and final gates follow all mandatory stories; all four stories are required for W08.

Possible independent work after T005: US1 tool/output characterization and US2 admission
unit tests use different files; US3 DOM fixtures can be prepared separately from event
tests. For a single cheaper model, execute sequentially by default. No task requires
subagents or simultaneous edits to shared services. No [P] marker is assigned to tasks
that touch common server files.

MVP milestone: US1 normal/denied generator flow after baseline repair. It is an intermediate
milestone, not a complete assignment. Finish admission, browser/privacy and evidence before
claiming completion. Run focused checks per slice and broad gates at checkpoints.

## Phase 8 - User-authorized review corrections

- [X] T035 Add failing real-HTTP recovery-event regressions in tests/security/flow.test.ts, then minimally correct server/app.ts so only a completed generation is logged as COMPLETED; preserve provider/deadline reasons for verified incomplete previews. [FR-011]
- [X] T036 Extend tests/security/budget.test.ts with cumulative bounded-call timing, final-verification and late-result cleanup for both disabled/enabled failover. Document the stronger earlier bound in SECURITY_EVALS.md without changing production budgets or original acceptance criteria. [FR-006,FR-014]
- [X] T037 Run focused and full gates, then record actual claim/signal/change/result in docs/EVIDENCE_W08.md and docs/AI_USAGE_LOG.md; mark these follow-up tasks complete only after verification. [FR-016,FR-018]
