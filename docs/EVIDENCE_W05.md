# Week 05 evidence for verified level generation

## Current status

2026-10-06: Feature 007 is implemented locally. The initial implementation record below
used fake evaluations only. Later, the user reported a generation failure and explicitly
authorized up to three bounded live generation requests. Those diagnostics reproduced the
failure, demonstrated one successful live revision flow, and exposed a missing operational
fallback. Corrections and actual verification are recorded in the final section of this file.
Changes remain local and uncommitted.

## Approved hypothesis and verification signal

Claim: model-generated traffic can be accepted safely by validating bounded proposals and
proving complete safe wins through the unchanged deterministic turn engine.
Signal: actual tool evidence and replayable no-life-loss paths, strict rejection with zero
execution, bounded model/attempt/tool/revision/time counts, and player approval before play.
Change: feature007 adds a separate generation workflow; original preset game remains stable.
Result: initial fake evaluations passed; subsequent authorized live diagnostics identified
integration defects corrected below. Expectations remain fixed in
specs/007-agent-level-generator/AI_EVALS.md.

## Baseline observations from the preceding feasibility assessment

- Node v24.14.0 and npm11.12.1 observed.
- npm run typecheck exited0.
- npm run test:run exited1: 147 tests passed, one failed; 15 files passed, one failed.
- Failure: tests/server/boundaries.test.ts:54 compares server/advice/gemini-provider.ts with
  the Windows-form actual path. The assertion needs portable comparison, retaining SDK isolation.
- The documented boundary failure was freshly reproduced and fixed before feature behavior;
  the clean baseline then passed every listed AGENTS.md gate. Final post-feature checks remain
  recorded separately below.
- No application/test source was changed during planning. No real provider was called.

## Planning research observations

Read-only Spec Kit research used the actual pure engine to evaluate 80 single-lane rotations.
Measured template first-crossing lengths6/9/11/13/15 show five bands are feasible. Existing
preset full-target lengths at targets3/10 were easy24/84, normal31/95, hard42/137.
These are ephemeral feasibility measurements; production solver tests/evals remain pending.
See specs/007-agent-level-generator/research.md for derivations, limits and source links.

## Implementation evidence to record when work runs

### T001–T002 — starting state and Windows boundary prerequisite — 2026-10-06

- **Claim**: The known SDK-owner boundary failure is caused only by Windows path separators.
- **Signal**: On Node v24.14.0 / npm 11.12.1, `npm exec vitest -- run tests/server/boundaries.test.ts`
  failed before the fix: 1 failed / 4 passed. Actual importer was
  `server\\advice\\gemini-provider.ts`; expected was `server/advice/gemini-provider.ts`.
- **Change**: Normalize backslashes to forward slashes only in the importer's path before
  the existing exact sole-owner assertion. The five architecture checks and owner path remain.
- **Result**: The focused rerun passed 5/5. Baseline tag `s003-baseline-v1` exists and was not
  modified. Checkout was `main...origin/main`; existing user changes include modified
  constitution, AGENTS.md, AI usage log, context manifest and game spec, plus untracked Week 05
  planning, evidence, skill, brag and weekly-report artifacts. All were preserved.

### T003 — green prerequisite baseline — 2026-10-06

- **Claim**: After the Windows path fix, the current project baseline passes every AGENTS.md gate.
- **Signal**: Clean dependency install; browser/server typecheck; unit suite; production build;
  high-severity audit; Chromium install; and the existing browser suites.
- **Change**: The clean audit exposed `source-map-js@1.2.1` beneath `vite > postcss`, affected
  by GHSA-68fv-2mgg-jv7q (`>=1.0.0 <1.2.2`). The compatible declared range already allowed
  1.2.2, so `npm update source-map-js` changed only its resolved package-lock entry. A second
  `npm ci` then installed 86 packages and reported zero vulnerabilities.
- **Result**: `npm run typecheck` exit 0; `npm run test:run` exit 0 (16 files / 148 tests);
  `npm run build` exit 0; `npm audit --audit-level=high` exit 0 (zero vulnerabilities);
  `npx playwright install chromium` exit 0; `npm run test:e2e` exit 0 (22 passed).
  Before the lockfile fix, the first audit returned 1 high finding; after it, audit passed.
  The boundary test fix passed 5/5. No golden paths or preset data changed.

### T004 — dependency and SDK review — 2026-10-06

- **Claim**: Zod is the only new runtime dependency and the installed Gemini SDK supports the
  existing adapter pattern needed for a separate structured decision operation.
- **Signal**: `npm ls zod`, installed `@google/genai` declarations and current adapter.
- **Change**: Added `zod@4.6.5` (`^4.6.5`) as the sole new runtime dependency. Reviewed the
  installed SDK's `GenerateContentConfig` and `HttpRetryOptions`: JSON MIME/schema, max output,
  abort signal, HTTP timeout and explicit `retryOptions.attempts` are typed. Existing adapter
  uses `GEMINI_MODEL = gemini-3.1-flash-lite` and disables internal retries with attempts 1.
- **Result**: `npm install zod` exit 0; npm reported zero vulnerabilities. No provider code or
  live request was made in this prerequisite task.

### T005–T006 — strict shared DTO contracts — 2026-10-06

- **Claim**: Requests, model decisions, compact evidence and client responses can be rejected
  at runtime when exact keys, ranges or proof/completion relationships are invalid.
- **Signal**: `tests/level-generator-contract.test.ts` was run before the module existed and
  failed to load it; after implementation, 6/6 tests pass and browser/server typecheck passes.
- **Change**: Added strict Zod 4 schemas with exact request and decision variants, bounded
  evidence/counters, five-row lane snapshots, outcome-specific nullability and cross-field
  checks for solver rating and completed/unavailable preview safety.
- **Result**: Focused tests pass 6/6. Initial implementation test run exposed only fixture
  construction errors (spread order and expected measured rating); corrected fixtures and
  reran. `npm run typecheck` passes after corrections. No game behavior has changed.

### T007–T010 — generated lane policy and traffic metrics — 2026-10-06

- **Claim**: Generated traffic can be normalized and rejected without changing preset data,
  while gap/density descriptions and objective difficulty bands remain deterministic.
- **Signal**: New tests first failed because the policy and metric modules did not exist; after
  implementation, generated-level tests pass 12/12, metric/rating tests pass 14/14, and the
  browser/server typecheck passes.
- **Change**: Added strict five-lane range/overlap validation, normalized candidate identity
  including settings/rules version, cloned five research-derived templates, rating bands, and
  pure circular gap/density measurements. Original preset constants were not edited.
- **Result**: `tests/generated-level.test.ts` 12 passed; `tests/level-metrics.test.ts` 14
  passed; `npm run typecheck` exit 0. A first typecheck identified use of ES2023 `toReversed`
  in a test under the ES2022 project target; replaced it with a copied array and `reverse()`.

### T011–T012 — pure safe search — 2026-10-06

- **Claim**: Incremental BFS using the unchanged `applyAction` can distinguish shortest safe
  first crossings, full-target wins, exhaustive impossibility and resource exhaustion.
- **Signal**: Solver tests first failed to load the absent module. After implementation,
  `tests/solve-level.test.ts` passes 14/14 and typecheck passes.
- **Change**: Added periodic state keys (x/y/tick phase/crossings), fixed action order,
  predecessor-linked witnesses, shared state/action ceilings across first/full searches,
  and incremental batches capped at 256 expansions. Life-losing successors are rejected.
- **Result**: Existing first-win minima are easy6/normal11/hard15. Production solver full
  target minima match the frozen research values: target3 easy24/normal31/hard42 and target10
  easy84/normal95/hard137. Witnesses replay through `applyAction` to exact target/score with
  all three lives. Impossible fixture exhausts; reduced state/action budgets report their
  respective `budget_exceeded` reasons. No game engine, preset or golden path was edited.

### T013–T014 — yielding, bounded solveLevel driver — 2026-10-06

- **Claim**: Server-controlled tool execution can cancel or time out between bounded pure
  search batches and only expose compact, replay-verified evidence.
- **Signal**: Driver tests first failed to load the absent module; after implementation,
  `tests/server/level-generator-tool.test.ts` passes 5/5 and typecheck passes.
- **Change**: Added the single local solveLevel driver with injected monotonic time, event-loop
  yield, and search factory. It enforces the two-second/per-run deadline, checks abort before
  and after each ≤256-state batch, replays witnesses through the real engine, verifies metrics
  and schema, and keeps paths in a separate internal proof object.
- **Result**: 5/5 pass, including normal target10 within shared 35,000-state/175,000-action
  ceilings and a compact result under 4,096 bytes; fake timeout, run-deadline and cancellation
  cases return `budget_exceeded`; a tampered witness is rejected. No provider/network call.

### T015–T017 — provider-neutral propose/evaluate/finalize service — 2026-10-06

- **Claim**: A completed run requires two model decisions, a real local evaluation between
  them, same-run evidence selection and separately counted exact final verification.
- **Signal**: Service tests first failed to load the absent module; after implementation,
  `tests/server/level-generator-service.test.ts` passes 6/6 and typecheck passes.
- **Change**: Added a provider-neutral model interface, immutable run policy/context, request
  preflight, explicit run state/counters, generated candidate/evaluation identities, a fixed
  solveLevel-only dispatch, canonical repetition detection, and final exact-candidate verify.
- **Result**: E01 success has steps2/attempts2/model tool1/total tool2; E02 returns exhausted
  impossible evidence before a distinct revision; invalid request executes zero model/tools;
  early final and wrong evidence reference fail without preview; rating mismatch is marked
  stopped/target_not_met with a verified non-completed preview. Tests use fake model plus the
  actual local solver. Retry/fallback/deadline matrix remains for later ordered tasks.

### T018–T019 — isolated Gemini decision adapter — 2026-10-06

- **Claim**: The existing SDK-owning adapter can provide structured generation decisions
  without replacing or expanding delayed coaching behavior.
- **Signal**: Fake-transport tests passed 5/5; typecheck passed. Existing advice service and
  provider code remain available unchanged alongside the new operation.
- **Change**: Added a separate model factory in the same sole SDK importer. It sends only the
  bounded fixed context, uses the configured `GEMINI_MODEL`, strict three-variant JSON schema,
  2,048 output-token cap, 8,192-byte output cap, abort signal, 15-second HTTP timeout and one
  SDK attempt. It classifies transient/permanent/configuration errors without raw detail.
- **Result**: Fake requests asserted SDK settings and signal propagation; oversized output
  returns no proposal; context over 24,576 bytes is rejected; transient and permanent messages
  are safely classified. No live request occurred.

### T020–T021 — same-origin generation endpoint — 2026-10-06

- **Claim**: The local API accepts only a bounded exact request, runs one injected generation
  service at a time, and returns only a validated bounded preview/unavailable DTO.
- **Signal**: Route tests first failed against the old router (9 failed); after implementation,
  API, existing app and advice route suites pass 45/45, then the expanded generator API suite
  passes 10/10. Browser/server typecheck passes.
- **Change**: Added only `POST /api/levels/generate`, 2,048-byte declared and streamed UTF-8
  handling, strict schema preflight, stable method/media/size/busy errors, 16,384-byte response
  validation, response disconnect abort and a `finally`-released one-run guard. The existing
  Host allowlist, security headers and no-CORS policy remain. `server/index.ts` injects the
  service with the generator adapter; no provider request happens at startup.
- **Result**: All malformed/extra/numeric-string/invalid-UTF8/oversize cases reject before
  service work; bad Host gets 403; busy gets 409; disconnected work sees abort and a late
  result is not written; advice/app regression suites remain green. No generic tool route.

For each meaningful slice, add claim, prewritten signal, smallest change, actual test/eval
result and tested revision. Retain failures and their measured causes. Record each required
command's status/counts; do not copy expected results into the actual-results column.

For run traces, record run ID, terminal status/reason, decisions, attempts/retries,
model-requested tool count, total solver count, validation categories, candidate/evaluation
IDs, verification purpose and elapsed time. Keep at most32 safe events. Include success,
revision, unknown-tool zero execution, failure and deadline/cancellation evidence.

### T022–T025 — browser lifecycle and generated advice identity — 2026-10-06

- **Claim**: A generation preview stays separate from active play until explicit approval,
  ignores stale/invalid results, and keeps Week 04's delayed advice semantics for generated runs.
- **Signal**: Lifecycle tests first failed to load the absent module and then pass 5/5;
  generated advice expectations initially failed (3 tests) against the preset-only contract,
  then advice/lifecycle/route suites pass 37/37 and typecheck passes.
- **Change**: Added pure request identity/state transitions, captured settings, validated DTO
  lifecycle and exact-preview consumption; added a thin same-origin capped client and aborting
  controller. Added `generated` as advice-summary origin while retaining default preset labels,
  eight existing fields and hidden/pending advice semantics.
- **Result**: Stale and canceled results cannot become ready; Play extraction requires matching
  settings and verified DTO. Generated summary and advice request preserve exactly eight keys;
  previous ready advice remains hidden through generated resets until the next completed run.

### T026–T028 — preview UI, explicit Play and generated advice browser regression — 2026-10-06

- **Claim**: A verified preview is isolated from play until approval, and preset/delayed-advice
  behavior survives generated runs.
- **Signal**: New Playwright expectations failed before the panel existed. After wiring, focused
  generator browser tests passed 3/3; after safety extensions, 6/6 passed. The generated-run
  delayed-coaching case passed within the advice suite; browser/server typecheck passed.
- **Change**: Added the accessible rating selector, generation/cancel status, snapshot canvas,
  traffic metrics, source label, generated-active notice and explicit Play control. Active origin
  is separate from remembered preset difficulty; R keeps generated lanes, a preset button restores
  original preset traffic, reload clears generated state, and panel key events cannot play. Added
  generator browser tests to `npm run test:e2e` and generated advice identity coverage.
- **Result**: Generator Playwright suite passed 6/6; generated advice E2E passed. Pixel equality
  confirms the active initial board matches the preview. A first attempt exposed that ArrowUp
  changes the focused native rating selector while leaving game state unchanged; the test resets
  the requested rating before starting generation.

### T029–T036 — rejection matrix, retries, fallback and boundary checks — 2026-10-06

- **Claim**: Rejected proposals cannot execute arbitrary work, bounded retries/cancellation
  cannot escape policy, and operational fallback is a separately verified exact-rating level.
- **Signal**: Service tests cover unknown tool, invalid arguments/model/tool result/final selection,
  transient retry, six-attempt cap, two revisions, canonical reordered-repeat rejection, cutoff,
  cancellation in provider/fallback, final verification, target mismatch, and operational fallback.
  Latest service suite passed 28/28; boundary plus service suites passed 27/27 before the
  final timeout/cancellation cases; focused browser
  generator tests passed 6/6; browser/server typecheck passed.
- **Change**: Added a bounded provider attempt timeout linked to caller cancellation, one transient
  retry per decision, fresh bounded context/counters per attempt and a six-attempt global ceiling.
  Service gates schema/identity evidence. Operational fallback requires reserve, re-solves either
  the last solved matching candidate or a configured exact-rating template, counts that solve,
  and reports stopped/completed false with the original operational reason. Security rejection,
  cancellation and expired reserve do not fallback. Added SDK/environment and pure-module boundary
  checks.
- **Result**: Tests verify exact-request fallback, mismatched candidates withheld, invalid proof
  withholds preview, cancellation prevents late preview, and unknown-tool execution remains zero.
  Full post-feature AGENTS.md gates passed as recorded under T038 below.

### T037 — fixed fake-provider evaluation set — 2026-10-06

- **Claim**: The prewritten AI_EVALS.md scenarios are exercised locally without a live provider.
- **Signal**: The full Vitest suite and Playwright suite exercise the contract, pure search,
  driver, provider fake transport, run service, API, browser lifecycle, generated preview and
  advice identity. E01/E02 were also executed directly through the provider-neutral service and
  actual solver to capture safe run traces below.
- **Change**: Added service cases for target-rating-three/three-crossing success, one/two
  revisions, third-revision rejection, six provider attempts, per-attempt 15-second timeouts,
  retry, final-verification failure, exact fallback, cutoff/deadline and cancellation.
- **Result**: E01–E26 covered by tests listed in the scenario map below; live call count is zero.
  These are fake-model/fake-transport tests with the production local solver, not provider demos.

#### Bounded run traces

The following IDs and counters are actual development-service responses from `tsx` traces or
the assertions in the named test run. Evidence is limited to measured outputs; no prompt, key or
provider payload is included.

| Eval / run | Terminal result | Decisions / attempts / retries | Model tools / total solves / revisions | Verification |
|---|---|---:|---:|---|
| E01 `run-1` | completed / goal_completed | 2 / 2 / 0 | 1 / 2 / 0 | Candidate `c1` evaluation `e1`; final recheck `e2`; requested rating3, first crossing11, full target3 minimum31, elapsed37ms. Actual solver. |
| E02 `run-1` (fresh trace process) | completed / goal_completed | 3 / 3 / 0 | 2 / 3 / 1 | `c1/e1` impossible evidence, `c2/e2` distinct solved candidate, final evaluation `e3`; elapsed32ms. Actual solver and revision. |
| E04 `run-2` (trace process) | failed / unknown_tool | 1 / 1 / 0 | 0 / 0 / 0 | Rejected before dispatch; no candidate, final check or preview; elapsed0ms. |
| E17 `run-2` (fresh trace process) | stopped / provider_failed; completed=false; source last_verified | 2 / 2 / 0 | 1 / 2 / 0 | Candidate solve plus separately counted same-run fallback verification; elapsed1ms. |
| E12 cutoff assertion | stopped / deadline | 1 / 1 / 0 | 0 / 0 / 0 | Fake monotonic time at40,000ms; result elapsed40,000ms; no solver work. Separate 45,000ms absolute-deadline assertion also passes. |

**Scenario coverage map**: E01–E02/E20 use actual service/solver cases; E03 and E26 use API
request, Host, no-CORS, concurrency and disconnect tests; E04–E07/E15/E21 use exact schemas,
zero-dispatch service tests, adapter fakes and tampered-proof tests; E08–E09/E11–E12 use fake
attempts, ceilings, retries, clocks and cancellation; E10 uses normalized repeated candidates;
E13–E14/E22 use solver cutoff/exhaustion, frozen target3/10 minima and real-engine witness
replay; E16–E18 use final verification and fallback tests; E19/E23–E25 use service/API/browser
lifecycle, preview/Play/reset/reload, malicious text and generated delayed-advice regressions.
The complete suites passing below are the execution record for these fixed expectations.

### T038 — final AGENTS.md verification — 2026-10-06

- **Claim**: The complete local worktree passes the repository's required quality gates and
  documented quickstart/browser flow.
- **Signal**: The following exact post-feature commands were run from Node v24.14.0 / npm 11.12.1.
- **Change**: Corrected the documented Windows SDK-import path comparison before feature work;
  moved the generator panel after the existing board controls to preserve keyboard Tab order;
  synchronized delayed-advice browser assertions to completed fake responses.
- **Result**: `npm ci` exit0 (87 packages added, 88 audited, zero vulnerabilities);
  `npm run typecheck` exit0; `npm run test:run` exit0 (25 files / 254 tests);
  `npm run build` exit0 (typecheck plus Vite production build, 119 modules);
  `npm audit --audit-level=high` exit0 (zero vulnerabilities);
  `npx playwright install chromium` exit0; `npm run test:e2e` exit0 (29/29 passed).
  The first full browser run after the UI addition failed 2/29: generator controls changed the
  preexisting Tab order, and an advice test restarted before its fake response settled. The
  panel was moved after the board/footer and the test now waits for the response; rerun passed
  29/29. Existing preset and golden-path files are unchanged. After the final timeout/cancellation
  test was added, the complete Vitest suite passed 25 files / 254 tests; browser source was
  unchanged after its 29/29 pass.

### T039–T041 — notes, manual live procedure and delivery record — 2026-10-06

- **Claim**: Implementation notes match the UI/API, delivery state is explicit, and the live
  confirmation path is ready without making an unauthorized provider request.
- **Signal**: README, quickstart, AI usage log, feature task markers and current Git state were
  reviewed after the passing local checks.
- **Change**: Reconciled README/quickstart descriptions and recorded contributors, limitations,
  results and pending live state. Prepared the bounded procedure below.
- **Result**: Current branch is `main`, tested HEAD is `fdf5df444e05963a688e2dcb56e12d4f3de9f831`,
  and feature changes are uncommitted local modifications/untracked files. No push, merge or
  deployment; `s003-baseline-v1` still exists; original presets, pure turn engine and golden
  paths are unchanged. Reviewer delivery is pending because no change has been committed or
  merged. `git diff --check` passed. `.specify/extensions.yml` is absent, so no post-implementation
  hook was registered. Every Feature 007 task is complete except the live call, which remains
  unauthorized.

#### Pending live confirmation procedure — not executed

After separate explicit user authorization only: confirm the user has configured the provider
key locally without reading or printing its value; start the local app; make at most three demo
requests, initially rating3/lives3/crossings3; record provider/model label, safe configuration
category, run ID, decision/attempt/retry/tool counts, elapsed time, stop reason, source and
requested/measured rating. For a completed exact-rating preview, inspect the snapshot and use
**Play this level** once to confirm the approval boundary. A fallback or unavailable response
is not a completed live agent demonstration. Do not retain raw prompts, outputs, screenshots
containing credentials, or key values. No live provider request was authorized or made here.

## Live confirmation

Not authorized or executed in planning. Prepare a small procedure only after fake tests
pass; request separate explicit live permission under the preserved feature006 policy.
Maximum final-demo runs3; development guardrail15 authorized runs. Record provider/model,
safe configuration category, counters/status and elapsed time; never key values/raw prompts.
Fallback on unavailable access does not count as a completed live agent demonstration.

## Contributions and delivery

The user selected and approved the scope. Codex prepared planning artifacts, with read-only
research agents required by speckit-plan. Luna6 implementation and human driver/reviewer
contributions must be recorded from actual work; no contribution by the second student
is asserted. Planning changes are local and uncommitted. Reviewers read main; future branch
work remains unsubmitted until reviewed and merged. No push, merge or deployment was made.

## Debugging the rejected live generation — 2026-10-06

### Claim, signal, change and result

- **Claim**: The reported message, "The level request could not be verified.", comes from
  invalid_model_proposal in the server service, before solver execution. Passing fake SDK
  tests did not establish that Gemini could complete the original response schema.
- **Signal**: Baseline checks passed 25 files / 254 tests and typecheck. Authorized live run1
  ended with MAX_TOKENS, 4,062 output bytes, incomplete JSON, invalid_model_proposal and zero
  solver calls. Run2 changed only the provider schema to a concrete root object containing
  a decision union and unwrapped that decision before passing it to the unchanged service.
  All three responses finished with STOP and the actual solver/revision/final flow completed.
  Run3 using the applied adapter reached repeated_action, exposing a second missing recovery
  path. These are observed runs, not a claim that Gemini rejects every root-level union.
- **Change**: The Gemini-only wire format now has exactly one decision field with three anyOf
  variants. A strict Zod envelope parser returns the original provider-neutral decision.
  MAX_TOKENS is classified as a non-retryable operational provider failure, permitting a
  verified fallback rather than presenting truncated JSON as a malformed tool request.
  Each fresh context includes the authoritative rating bands, tick/start/reset rules, and
  at most three copies of validated prior traffic configurations alongside compact evidence.
  Solution paths remain internal. Repetition, revision/budget limits, refusal and decision
  cutoff use the approved operational fallback. Latest solved evidence can have a different
  measured rating; identity/settings and both stored witnesses are checked and replayed before
  packaging it, without repeating BFS. An unsolved run may verify one template within its
  remaining budget. Final verification can use the reserved 40–45s window. Invalid model/tool
  data, invalid final selection and cancellation still cannot manufacture a fallback.
- **Result**: The exact reported failure was reproduced and the schema change demonstrated a
  completed live rating3 run. Remaining context/recovery corrections pass offline regression
  checks; no fourth live generation was authorized or made. Fake tests continue to verify
  the preview/explicit-Play boundary; a manual browser Play on a real generated level was
  not performed in these diagnostics.

### Authorized live run traces

The user explicitly approved up to three bounded generation requests. All used
gemini-3.1-flash-lite with targetDifficulty3/lives3/crossingsToWin3, the existing 2,048-token
limit, 15s attempt timeout and one underlying SDK attempt. No key values, raw prompts,
raw responses or hidden reasoning were printed or retained.

| Run | Configuration | Actual result | Steps / attempts / retries / model tools / total tools / revisions | Elapsed |
|---|---|---|---|---|
| 1 | Original adapter | unavailable / invalid_model_proposal; one attempt failed before response metadata, next hit MAX_TOKENS | 1 / 2 / 1 / 0 / 0 / 0 | 25,959ms |
| 2 | Concrete decision-envelope experiment | generated preview / goal_completed / measured rating3; revised once and independently verified final selection | 3 / 3 / 0 / 2 / 3 / 1 | 14,246ms |
| 3 | Applied adapter, before context/fallback corrections | unavailable / repeated_action; no repeated solver execution | 3 / 3 / 0 / 2 / 2 / 1 | 20,134ms |

Provider-reported prompt/candidate/total token counts, in response order:
run1: 480/2032/2512; run2: 480/327/807, 591/324/915, 712/77/789;
run3: 493/321/814, 591/321/912, 658/321/979.
Eight provider attempts started; seven returned usage metadata. Usage for the failed first
attempt is unknown. Recorded totals are not total billed usage, and no cost is inferred.

### Test-first evidence and checks

- Adapter regressions failed before source changes: 5 failed / 3 passed. They cover the
  strict wire envelope, rejection of extra/nested fields, actual local solver service through
  the adapter, and MAX_TOKENS handling even when text happens to parse. After correction:
  8/8 pass in tests/server/level-generator-provider.test.ts.
- Context/fallback/reserved-window regressions failed before source changes: 7 failed /
  24 passed. Updated old assertions that contradicted the already-approved E10/E11/E12/E17
  expectations; those evaluation requirements were not changed. The service suite now passes
  31/31, including proof replay rejection and protection against provider-context mutation.
- npm run test:run: 25 files / 260 tests passed.
- npm run build: passed, including both browser/server typechecks; 119 Vite modules.
- npm audit --audit-level=high: zero vulnerabilities.
- npm run test:e2e: 29/29 passed, with an empty server GEMINI_API_KEY environment override
  to keep this automated browser run offline. Node child-process checks confirmed that an
  explicitly empty environment value is preserved on this machine.
- No dependency changes, commit, push, merge or deployment. The temporary diagnostic script
  was removed. Original game transitions and preset data were not changed.
