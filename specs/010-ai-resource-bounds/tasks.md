# Tasks: AI resource bounds

Input: [spec.md](spec.md), [plan.md](plan.md), research, data model, contract and
REGRESSION_EVALS.md. Implementation was explicitly authorized for local application/tests.
Checked tasks mean implemented and verified; they do not authorize publication or live calls.

## Phase 1 - Setup

- [X] T001 Verify the P1/P2/P3 approvals recorded 2026-10-28 in specs/010-ai-resource-bounds/spec.md and docs/AI_USAGE_LOG.md (60 attempts/process, restart reset and agreed exhaustion handling), then record the separate implementation instruction and preflight. Preserve current Git branch and all existing changes. [FR-001,FR-002,FR-017,SC-006]
- [X] T002 Inspect target branch/HEAD/status/remote refs again and reproduce fake-only baseline gates from specs/010-ai-resource-bounds/quickstart.md; record actual results/blockers in docs/EVIDENCE_W08.md. Resolve any measured baseline failure before functional changes; no unrelated upgrades. [FR-017,SC-006]

## Phase 2 - Foundational expectations and measured probes

- [X] T003 Freeze specs/010-ai-resource-bounds/REGRESSION_EVALS.md; write B00 through the existing tests/server/fixtures/w08-server.ts API in tests/security/session-budget.test.ts and S03 through the existing client in tests/level-generator-client.test.ts. Run both before new runtime modules: measure cumulative starts beyond approved N across minute boundaries, and whole-body consumption of128KiB. No nonexistent-import failure counts as either measurement. Record actual red signals in docs/EVIDENCE_W08.md. [FR-005,FR-011,FR-017,SC-003,SC-006]

## Phase 3 - US1: cumulative attempts (P1)

Goal: shared finite provider starts without counter, retry, failover or lease leaks.
Independent check: B00/B01-B18 through actual handler/services/solver and fake transport.

- [X] T004 [US1] Write budget/admission failing tests in tests/security/provider-attempt-budget.test.ts and tests/security/admission-budget.test.ts for B02/B07-B09/B11/B12: one final-token winner, denied counters0, cancellation, sync throw, pending/release-once and no refill. Keep per-job counters separate from process totals. [FR-003,FR-004,FR-006,FR-007,SC-002]
- [X] T005 [US1] Implement server/security/provider-attempt-budget.ts with the owner-approved default and the constraints "positive safe integer; approved default60; immutable after construction", "integer0..limit; monotonic; never refunded after an invocation starts", "derived limit-started; never negative; no public endpoint/DTO field", and "one serving Node process; new process resets; no other reset operation"; use the approved production default60. Expose only trusted construction and synchronous start authority/empty inspection, plus a server-only exhaustion sentinel. Rerun its red tests. [FR-001,FR-002,FR-003,FR-005]
- [X] T006 [US1] Integrate one budget into server/security/admission.ts: empty precheck before lease/timestamp; final atomic gate in lease.start('provider') before counters/callback/track; solver work untouched. Extend synthetic injection in tests/server/fixtures/w08-server.ts for later small-N cases. Rerun T004 including no lost token/no phantom pending on denial and actual synchronous-throw accounting. [FR-001,FR-003,FR-004,FR-005,FR-007]
- [X] T007 [US1] Write failing actual-start/exhaustion tests in tests/server/advice-service.test.ts, tests/server/level-generator-service.test.ts and tests/server/failover-policy.test.ts for B04-B06/B08/B12-B14. Assert projected context, per-job attempt/retry counts, no false started/switch event, non-transient marker, permitted local fallback and final successful last-token proof. [FR-003,FR-006,FR-008,FR-010,SC-002]
- [X] T008 [US1] Align disabled-mode starts/counters in server/advice/service.ts and server/level-generator/service.ts with the authorized thunk, prepare validated projected generator context before the gate, and handle exhaustion before provider-error normalization. Preserve provider_attempt_limit operational fallback and AdviceServiceError; rerun disabled T007 cases. [FR-003,FR-006,FR-008,FR-010]
- [X] T009 [US1] Align enabled started callback/accounting/events/sticky-role in server/ai/failover-policy.ts and both service files from T008; invoke the phase's started callback only inside authorized tracked provider work. Preserve exhaustion before timeout/provider classification, cancellation precedence and8s/7s/15s/current ceilings. Rerun enabled T007 and existing failover tests, with sync throw and denied backup. [FR-003,FR-006,FR-008,FR-010]
- [X] T010 [US1] Extend tests/security/session-budget.test.ts with B01/B03/B05/B07/B10-B14/B16/B17 mixed real-HTTP traces and small injected limits. Reproduce early-denial503 mismatch before T011; characterize already-correct guards without weakening them. Include rejected input/reset fields, draining work, no timestamp/counter leaks, and immutable secret/event projection. [FR-001,FR-003,FR-004,FR-005,FR-006,FR-007,FR-008,FR-009,SC-001,SC-002]
- [X] T011 [US1] Map the budget admission variant in server/app.ts to503 ADVICE_UNAVAILABLE or GENERATION_UNAVAILABLE without Retry-After, public counters or exception text; reuse PROVIDER_UNAVAILABLE event reason and unchanged event schema. Preserve finally/lease cleanup; rerun T010 and existing HTTP/privacy tests. [FR-004,FR-009]
- [X] T012 [US1] Add B15 reload/delayed-unavailable browser proof in e2e/security.pw.ts with one real fake-backed process, and run B00/B01-B18/G01-G03 including tests/security/budget.test.ts. Only revise counter assertions to describe actual starts; do not alter accepted limits, proof, Play, advice delay, presets or golden paths. Record measured results in docs/EVIDENCE_W08.md. [FR-001,FR-007,FR-008,FR-009,FR-010,FR-016,SC-001,SC-005]

## Phase 4 - US2: bounded browser consumption (P1)

Goal: reject during reading and release readers without changing response/lifecycle contracts.
Independent check: S01-S12 through actual generator client; existing advice reader untouched.

- [X] T013 [US2] Extend tests/level-generator-client.test.ts with S01-S11 before reader code: "16,384 delivered bytes; exact limit allowed; no retained overflowing chunk", "integer0..16,384; sum of retained Uint8Array.byteLength values", one acquired reader/release, abort listener cleanup, strict DTO/UTF-8/JSON, absent/misleading headers, truncation, rejecting/never-settling cancel and no reads after overflow. Preserve T003's S03 fixture/criteria. [FR-011,FR-012,FR-013,SC-003,SC-004]
- [X] T014 [US2] Implement the private bounded reader in src/level-generator/client.ts per contracts/resource-policy.md; remove response.text(), enforce actual bytes before retaining chunks, fatal-decode only bounded EOF, then unchanged JSON/schema validation. Best-effort cancel unfinished/non-success bodies, remove listeners/release in finally without hanging on cancellation. Rerun S01-S11; no shared advice-reader refactor. [FR-011,FR-012,FR-013,SC-003,SC-004]
- [X] T015 [US2] Add S12 oversized/cancelled/stale generation response regressions in e2e/level-generator.pw.ts, including a valid-current-preview positive control. Rerun existing generator/advice/game browser flows and verify no controller/lifecycle/game changes or automatic Play. Record actual results in docs/EVIDENCE_W08.md. [FR-014,FR-016,SC-003,SC-004,SC-005]

## Phase 5 - US3: provider-account review (P2, manual)

Goal: distinguish official control behavior from actual unverified account settings.
Independent check: official citations plus private owner review, with no live test.

- [ ] T016 [US3] Recheck the official pages linked in specs/010-ai-resource-bounds/PROVIDER_ACCOUNT_CHECKLIST.md immediately before owner use; preserve request-rejecting restrictions/quotas/spend caps versus alerts-only budgets, account-scope and enforcement-latency caveats. No key inspection or settings action. [FR-015,SC-006]
- [ ] T017 [US3] Review M1-M7 with the owner privately and record only supplied sanitized status in specs/010-ai-resource-bounds/PROVIDER_ACCOUNT_CHECKLIST.md; absent answers remain pending, not inferred. No real calls or changes; inability to verify account state is a reported limitation, not a fabricated completion. [FR-015,SC-006]

## Phase 6 - Polish and final evidence

- [X] T018 Run all AGENTS.md gates plus npm run test:security from the final selected worktree, with fake transport/empty real key and browser suites serially; record actual outputs, new test counts and B/S/G results in docs/EVIDENCE_W08.md. Report blockers instead of changing fixtures or budget limits. [FR-010,FR-016,FR-017,SC-005,SC-006]
- [X] T019 In this authorized local implementation session, add narrow010 pointers in AGENTS.md/docs/CONTEXT_MANIFEST.md; document process allowance/reset/non-monetary limitation and fixed unavailable behavior in README.md; append actual AI involvement/decisions in docs/AI_USAGE_LOG.md without overwriting existing text. Update specs/010-ai-resource-bounds/tasks.md and REGRESSION_EVALS.md only for implemented/executed evidence. [FR-002,FR-005,FR-009,FR-017,SC-006]
- [X] T020 Review final diff and specs/010-ai-resource-bounds/IMPLEMENTATION_GUIDE.md against plan/contract; rerun read-only Spec Kit analysis and convergence review; report remaining gaps, unknown account controls and branch-only delivery. Keep src/game, presets/golden paths, SDK ownership, active-work semantics and public DTOs unchanged. No automatic commit/push/merge/deploy/live call. [FR-016,FR-017,SC-006]

## Dependencies and execution strategy

T001 -> T002 -> T003 blocks functional implementation.
US1: T004 -> T005 -> T006 -> T007 -> T008 -> T009 -> T010 -> T011 -> T012.
US2: T003 -> T013 -> T014 -> T015, independent of US1's runtime implementation.
US3: T016 -> T017 after setup; no runtime dependency and account verification may stay pending.
T018 follows US1+US2; T019 follows actual results/owner decisions; T020 is final read-only analysis.
A known pre-existing failed gate blocks expansion. Newly failing feature tests express
the approved correction and are not an excuse to loosen an unrelated guard.

Potential independent file work: T004 budget tests and T013 stream tests; later T016
documentation research can occur separately. Within US1, service and phase changes share
files and run serially. Within US2, write tests then reader then browser integration.
Within US3, source refresh precedes owner verification. Browser suites share4173 and
always run serially. No [P] markers or additional agent dispatch is required in implementation.

MVP milestone: complete US1 through T012 and validate it. It is an intermediate increment;
US2 and the account checklist/unknown-status report are still mandatory deliverables.
Incremental strategy: freeze/measure -> one smallest slice -> same expectations -> next
slice -> full checks -> final review. No publication phase is implied.

## Requirement coverage index

| Requirement | Tasks |
|---|---|
| FR-001 | T001,T005,T006,T010,T012 |
| FR-002 | T001,T005,T019 |
| FR-003 | T004-T010 |
| FR-004 | T004,T006,T010,T011 |
| FR-005 | T003,T005,T006,T010,T019 |
| FR-006 | T004,T007-T010 |
| FR-007 | T004,T006,T010,T012 |
| FR-008 | T007-T010,T012 |
| FR-009 | T010-T012,T019 |
| FR-010 | T007-T009,T012,T018 |
| FR-011 | T003,T013,T014 |
| FR-012 | T013,T014 |
| FR-013 | T013,T014 |
| FR-014 | T015 |
| FR-015 | T016,T017 |
| FR-016 | T012,T015,T018,T020 |
| FR-017 | T001-T003,T018-T020 |
| SC-001 | T010,T012 |
| SC-002 | T004,T007,T010 |
| SC-003 | T003,T013-T015 |
| SC-004 | T013-T015 |
| SC-005 | T012,T015,T018 |
| SC-006 | T001-T003,T016-T020 |

20 tasks: setup2, foundation1, US1 nine, US2 three, US3 two, final3.
All use checkbox/unique sequential ID and explicit paths; story tasks carry US labels.
