# Tasks: 006-ai-feature — Delayed Post-Game AI Advice

**Gate**: Implementation was authorized by the user’s request to complete the W04 assignment on 2026-09-29. The selected Option C categories and student-pair approval are recorded in the feature spec.

## Phase 1 — Test-first expectations

- [x] T001 [US1] Add run-summary shape and active-run expectations in tests/advice/summary.test.ts.
- [x] T002 [US1] Add delay, hidden-ready, one-time display, reset, pending supersession, and stale-response expectations in tests/advice/lifecycle.test.ts.
- [x] T003 [US2] Add fake-provider retry, malformed output, timeout, and abort expectations in tests/server/advice-service.test.ts.
- [x] T004 [US2] Add API validation, zero-provider-call, size, method, and safe-error expectations in tests/server/advice.test.ts.
- [x] T005 [US3] Add two-run, restart/difficulty, unavailable-supersession, and late-response browser expectations in e2e/advice.pw.ts.
- [x] T006 [US2] Add temporary-file environment loader expectations in tests/server/environment.test.ts and provider/environment boundary expectations in tests/server/boundaries.test.ts.

## Phase 2 — Shared contract and unit behavior

- [x] T007 Implement summary, focus, provider-tip, DTO, and error runtime validators in shared/advice-contract.ts. Reject unknown properties and invalid cross-field combinations.
- [x] T008 [US1] Implement the completed-run summary builder in src/advice/summary.ts using the exact Option C fields; return no summary for active states.
- [x] T009 [US1] Implement the pure delayed-advice state machine in src/advice/lifecycle.ts; preserve hidden advice through in-run resets, consume once at the following end, show unavailable when a pending job is superseded, and ignore stale job IDs.
- [x] T010 [US1] Connect summary creation and lifecycle events to game completion, R restart, and difficulty selection in src/advice/controller.ts without changing src/game/turn.ts.

## Phase 3 — Bounded server analysis

- [x] T011 [US2] Implement server/advice/service.ts with deterministic focus/evidence, structured-output validation, 15-second attempt deadlines, at most two attempts, bounded transient-only retry, abort handling, and fixed safe errors.
- [x] T012 [US2] Implement server/advice/gemini-provider.ts using @google/genai, server-only key access, structured nextTip output, minimal output tokens, no tools/history, and no sensitive logging.
- [x] T013 [US2] Extend server/app.ts with POST /api/advice, JSON and 4,096-byte enforcement, runtime validation before service invocation, stable status mapping, and request-disconnect cancellation.
- [x] T014 [US2] Implement server/environment.ts and call it from server/index.ts before provider creation; load .env only when present using process.loadEnvFile and never print values.
- [x] T015 [US2] Add the justified @google/genai production dependency and update package-lock.json after rechecking the current official SDK/model guidance.

## Phase 4 — Browser integration and accessibility

- [x] T016 [US3] Implement a same-origin, runtime-validating advice client in src/advice/client.ts; reject malformed DTOs and ignore results for obsolete job IDs.
- [x] T017 [US3] Add an initially empty polite status region in src/main.ts and render validated advice via textContent only; preserve existing game controls and end messages.
- [x] T018 [US3] Wire e2e/advice.pw.ts into the test:e2e script in package.json without removing existing smoke coverage.

## Phase 5 — Verification and evidence after implementation

- [x] T019 Run npm run typecheck and npm run test:run; record actual output in docs/EVIDENCE_006.md and specs/006-ai-feature/AI_EVALS.md.
- [x] T020 Run npm run build and npm audit --audit-level=high; record actual output only.
- [x] T021 Run npm run test:e2e against npm start and confirm existing golden paths plus the new delayed-advice flows.
- [x] T022 Review browser bundle, request/response bodies, tracked files, and diagnostics for secret or raw-provider-data exposure; record the result.
- [ ] T023 (W04 submission requirement; pending authorization) Perform one limited live-provider confirmation after fake-provider tests pass, only if the user explicitly authorizes the external request; record safe model/attempt/token metadata. No live request has been authorized or made.

## Dependencies

- T007 precedes T008–T013 and T016.
- T008–T010 precede T017.
- T011 precedes T012–T013.
- T012–T018 precede T019–T023.
- T019–T022 complete the automated implementation validation. The W04 submission still requires T023, a limited live confirmation, which is pending explicit user authorization.
