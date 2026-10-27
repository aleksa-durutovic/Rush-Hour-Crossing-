# Week 08 Evidence: Secure the Arcade

## 1. Scope and checkpoint

Planning date:2026-10-27. User accepted generator-focused hardening, shared API/browser
protection, advice regressions and a code-free cheaper-model handoff. No optional challenge.
This file distinguishes historical baseline observations from executed implementation and final evidence.

- Project: Rush Hour Crossing; chosen W05 flow: level generation and solveLevel.
- Branch: codex/ai-level-generator-feature.
- Initial commit:06ff2534aa4e28abf65c3822d5f6695f3855103d.
- Worktree:C:/Users/AleksA/.codex/worktrees/feature-007-generator-publish/Rush hour crossing.
- Initial worktree status: clean before Feature009 documentation.
- Final implementation checkpoint: 2026-10-27 on codex/ai-level-generator-feature at 06ff2534aa4e28abf65c3822d5f6695f3855103d; local changes remain uncommitted by instruction.
- Observed environment: Nodev24.14.0, npm11.12.1, Windows PowerShell.
- Browser: Playwright Chromium with existing Desktop Chrome configuration.
- Team members/driver/reviewer contributions: not supplied; do not infer.

The older codex/ai-level-generator checkout has unresolved merge conflicts. The original
main checkout contains separate uncommitted work. The older conflicted worktree was not used. One patch helper briefly wrote exact bounded-output hunks to the original checkout; they were removed after detection with pre-existing local work preserved. All later edits and checks used the requested worktree explicitly.
App attachment was rejected because another chat owns the selected checkout; commands used
its explicit directory. No branch switch/reset/stash/commit/push/merge was performed.

### Actual planning baseline

Commands ran in the selected worktree with existing installed dependencies.

| Command | Actual result on2026-10-27 | Limitation |
|---|---|---|
| node --version; npm --version | v24.14.0 /11.12.1 | No runtime upgrade. |
| npm ci | NOT RUN in planning | No fresh clean-install claim. |
| npm run typecheck | PASS, exit0; both projects | No new security behavior tested. |
| npm run test:run | PASS, exit0;29 files/305 tests | Existing suite, not future matrix completion. |
| npm run build | PASS, exit0;119 modules; JS110.64kB,CSS5.30kB | No new CSP/sentinel proof. |
| npm audit --audit-level=high | FAIL, exit1;4 vulnerabilities:2 moderate,2 high | Historical clean audits are not current evidence. |
| npx playwright install chromium | NOT RUN in planning | Browser was already available. |
| npm run test:e2e | PASS, exit0;29 tests,25.2s | Some AI tests stub HTTP; not full backend security proof. |
| npm run test:security | NOT RUN; script not implemented | New controls/evals remain planned. |

For the existing browser run, the child shell set GEMINI_API_KEY empty and
AI_FAILOVER_ENABLED=false. Provider tests use existing fakes; no new live provider run
was authorized or made. NO_COLOR/FORCE_COLOR warnings did not fail assertions.

### Reproduced implementation baseline before T002

Checkpoint: 2026-10-27, branch `codex/ai-level-generator-feature`, HEAD
`06ff2534aa4e28abf65c3822d5f6695f3855103d`. The pre-existing local changes listed in
the initial Git status were preserved. No Feature009 runtime source was changed before
these checks.

The preserved baseline tag resolves to `809148289ad45f4c9a7eaadb6014b1fd8cc5e5e3`;
it was only read. Initial status was `M AGENTS.md`, `M README.md`, `M docs/AI_USAGE_LOG.md`,
`M docs/CONTEXT_MANIFEST.md`, plus untracked `docs/EVIDENCE_W08.md` and
`specs/009-secure-the-arcade/`.

| Command | Actual result | Observation |
|---|---|---|
| `node --version`; `npm --version` | PASS: v24.14.0 / 11.12.1 | Meets project engines. |
| `npm ci` | PASS, exit 0; added 87 packages, audited 88 | npm reported the same four audit findings. |
| `npm ls vite vitest @vitest/mocker zod` | PASS, exit 0 | Vite 8.3.0; Vitest 5.0.1; mocker 5.0.1; Zod 4.6.5. |
| `npm run typecheck` | PASS, exit 0 | Browser and server TypeScript projects. |
| `npm run test:run` | PASS, exit 0; 29 files / 305 tests | Existing suite only. |
| `npm run build` | PASS, exit 0; 119 modules | Vite 8.3.0; JS 110.64 kB, CSS 5.30 kB. |
| `npm audit --audit-level=high` | FAIL, exit 1; 4 vulnerabilities (2 moderate, 2 high) | Same listed GHSA advisories as planning; blocker reproduced. |
| `npx playwright install --list` | PASS, exit 0 | Chromium 1243 and headless shell are installed; no install/download needed. |
| `npm run test:e2e` | PASS, exit 0; 29 tests / 11.0s | Child-process `GEMINI_API_KEY` was empty and `AI_FAILOVER_ENABLED=false`; no provider call. |

The E2E run emitted the existing NO_COLOR/FORCE_COLOR warning. This checkpoint does not
replace the new T02/T13/T16 probes; their before and after results are recorded in Sections 5 and 6.

### Measured baseline blocker

Observed installed versions: Vite8.3.0, Vitest5.0.1, @vitest/mocker5.0.1, Zod4.6.5.
Audit reports Vite/Zod high severity and mocker/Vitest moderate dependency findings.
IDs/exposure/researched patch floors are in
[research.md](../specs/009-secure-the-arcade/research.md).
No package or lockfile was changed during planning. The reproduced audit again reported
GHSA-698v-4r3x-3vcv, GHSA-r825-w8mm-5pxw, GHSA-587h-7wmj-h5pm, GHSA-9jrq-w75r-8gcw,
GHSA-rq7h-c2jc-7f22 and GHSA-vfpm-58rq-9qcg for Vite; GHSA-mrhx-c7xc-m3w5 for Zod;
and GHSA-qxg6-89mg-rqv8 plus GHSA-xp26-3454-mjgp through Vitest/mocker.

### T002 targeted repair and post-repair checkpoint

Registry metadata reconfirmed the researched compatible floors: Vite8.3.3,
Vitest5.0.3 with `@vitest/mocker`5.0.3, and Zod4.6.6. The direct dependency ranges in
`package.json` were raised only to those floors; `package-lock.json` was regenerated without
`audit fix --force`. The lock resolves to newer compatible patch releases:
Vite8.3.5, Vitest5.0.5, mocker5.0.5 and Zod4.6.7. The other lock changes are their
dependency graph, not new direct dependencies.

| Command | Actual result after repair |
|---|---|
| `npm ci` | PASS, exit0; added85 packages, audited86; npm reported0 vulnerabilities. |
| `npm ls vite vitest @vitest/mocker zod` | PASS, exit0; resolved versions listed above. |
| `npm run typecheck` | PASS, exit0; browser and server projects. |
| `npm run test:run` | PASS, exit0;29 files/305 tests. |
| `npm run build` | PASS, exit0;119 modules; JS111.06kB, CSS5.30kB. |
| `npm audit --audit-level=high` | PASS, exit0; `found0 vulnerabilities`. |
| `npx playwright install --list` | PASS, exit0; Chromium1243/headless shell already installed. |
| `npm run test:e2e` | PASS, exit0;29 tests/9.9s, with child-process provider access disabled. |

This clears the measured baseline blocker before functional hardening. These are dependency
and regression results only; they do not establish any new T00-T17 result.

## 2. Architecture and data inventory

Browser settings -> same-origin HTTP -> generator service -> provider adapter/fake ->
strict decision -> allowlisted solveLevel -> real deterministic evaluator -> compact evidence
-> next model decision -> separate final verification -> validated preview -> browser ->
player Play. Advice receives an unverified eight-field summary, derives focus/evidence and
returns delayed coaching; it has no tool privilege or certified score.
Shared admission, active-work leases and fixed-shape events now wrap those existing boundaries; their measured behavior is mapped below.

| Data/capability | Controller, validation and use | Sent to model? | Storage |
|---|---|---|---|
| URL config | Browser-controlled; existing runtime validator | Captured settings/approved summary only | URL/current game |
| Generator rating1..5 | Browser input; exact schema/server capture | Yes | Current run |
| Active state/score | Browser-owned; unverified, deterministic local game | No full state | Memory only |
| Advice summary | Browser eight fields; exact semantic validator | Required summary plus derived focus/evidence | Current advice lifecycle |
| Model decision | Provider-controlled; strict application schema | Validated prior evidence only | Current run |
| Tool arguments | Proposed lanes; runtime/domain validator | Validated copied lanes | Current run |
| Candidate/evaluation IDs | Application-created references; same-run lookup | Yes | Current run, not credentials |
| Solver proof | Actual evaluator and replay/final checks | No | Internal run evidence |
| Compact metrics | Runtime schema/bytes/projection | Bounded parsed subset | Current run |
| Provider key/config | Server adapter/entrypoint only | Never | Server process; no value inspected |
| localStorage/sessionStorage | No application reader found | No | Not an app data source |
| Errors/events | Fixed public errors; fixed event projection after route checks | Never raw exception content | Process-only 128-event ring; no endpoint or disk persistence |

No accounts, private saved sessions, access cookies, database or leaderboard were found.
This is local single-user scope, not authentication or multi-process security.

## 3. Threat model and priorities

Six local-demo risks are retained. Likelihood and impact are qualitative and tied to the
executed proof below; they are not claims about internet deployment.

| ID | Scenario and affected resource | Current control and evidence | Priority |
|---|---|---|---|
| R1 | Repeated/concurrent AI requests consume provider quota or solver CPU; an abort-ignoring transport outlives its HTTP response. | Shared one-per-operation/two-combined admission, five-per-minute rolling window, draining leases and unchanged run budgets; T11-T13, T16. | 1 |
| R2 | A model proposes unauthorized tools, malformed lanes or foreign evidence. | Strict DTO/domain validation, exact solveLevel dispatch, run-local evidence and independent final proof; T03, T07-T10, T17. | 2 |
| R3 | Advice text or a second-origin script executes in the player browser. | Existing textContent output plus enforcing production CSP and real policy-violation proof; T04-T05, T16. | 3 |
| R4 | Provider keys, raw failures, tool fields or newline-bearing names leak or forge diagnostics. | Synthetic-only sentinel checks, fixed public errors, eight-field event projection and JSON-line sink; T10, T14, T21-T23. | Supporting |
| R5 | Browser score, summary, URL or storage values are treated as proof or policy authority. | Exact summary/request validation; local score remains unverified and generated traffic still requires solver verification and Play; T01-T03, T15, T17. | Supporting |
| R6 | Runtime/development dependency advisories weaken the boundary. | Targeted compatible dependency floors; final high-severity audit reports zero vulnerabilities; T001-T002/T033. | Supporting |

Top three priorities are shared resource limits, model/tool authority and browser execution.
No account, private saved resource, database, access cookie or leaderboard exists. Credential
CSRF and two-account ownership are conditionally N/A; local Host, exact supplied Origin,
body/domain and run-local evidence checks remain executable and were tested. SQL, remote
deployment and internet-facing abuse are outside this local-only scope.## 4. Invariants and limits

| Invariant | Executed enforcement | Verification |
|---|---|---|
| I1 | Host/method/Origin/media-type/body/domain checks precede admission and work. | tests/security/http.test.ts; T01-T03/T07 |
| I2 | Strict request/summary schemas and server-captured settings preserve unverified browser state. | tests/security/http.test.ts; tests/security/integrity.test.ts; T15 |
| I3 | Exact solveLevel dispatch, validated lanes, same-run selection, projection and final replay. | tests/security/agent.test.ts; flow.test.ts; output.test.ts; T03/T07-T10/T17 |
| I4 | Read-only generation returns a verified preview; only explicit Play changes active game state. | tests/security/flow.test.ts; e2e/security.pw.ts; T00/T15/T17 |
| I5 | Dynamic text is rendered literally; production dist responses carry the enforcing CSP. | e2e/security.pw.ts; tests/security/http.test.ts; T04-T05/T16 |
| I6 | Shared capacity/rate policy counts unresolved underlying provider/solver promises and preserves existing operation budgets. | tests/security/admission.test.ts; active-work.test.ts; budget.test.ts; existing service/failover suites; T11-T13 |
| I7 | Advice/output DTOs are bounded; diagnostics use a projected fixed schema and synthetic-key tests. | tests/security/output.test.ts; privacy.test.ts; T06/T10/T14/T21-T23 |
| I8 | Existing game rules, deterministic solver, delayed advice and disabled/enabled failover routing remain covered. | full unit/E2E regressions plus security T00/T04/T11-T12/T24-T27 |

Numeric policy and public errors remain linked to
[security-policy.md](../specs/009-secure-the-arcade/contracts/security-policy.md).
Actual cases and residual limits are in
[SECURITY_EVALS.md](../specs/009-secure-the-arcade/SECURITY_EVALS.md).## 5. T00-T17 actual results

The accepted expectations and unchanged pre/post fixtures are in
[SECURITY_EVALS.md](../specs/009-secure-the-arcade/SECURITY_EVALS.md).
The final aggregate was run after clean installation. Focused commands below are additional
executions from the same worktree; counters are captured by the fake SDK fixture and real
solver, not inferred from HTTP status alone.

| ID | Fixture, actual result, counters/state | Status |
|---|---|---|
| T00 | tests/security/flow.test.ts and e2e/security.pw.ts. Two generation decisions, two actual solver starts (requested solve plus final verification), validated preview. Browser active board/traffic stayed unchanged before Play; Play applied the exact verified preview, Space advanced a tick and R reset. | PASS |
| T01 | tests/security/http.test.ts. Malformed JSON, wrong types, inconsistent fields and out-of-range values returned fixed 400 with 0 provider/solver work. Valid minimum and maximum settings both reached the real solver. | PASS |
| T02 | Unchanged T02 case: npx vitest run tests/security/http.test.ts -t 'T02 privilege and body-size probe': 9 passed. Declared/streamed 2,049-byte bodies were 413; six privilege extras were 400; all denials 0/0. Exact 2,048-byte valid JSON plus whitespace was accepted with 2 provider decisions and 2 solver executions. | PASS before and after |
| T03 | tests/security/flow.test.ts and agent.test.ts. Unknown private-resource path returned 404/0 work; valid-shaped foreign and nonexistent candidate/evaluation IDs failed before final verification. Own same-run solved evidence succeeded in T00 with 2 solver executions total. | PASS |
| T04 | e2e/security.pw.ts. Marker nextTip was displayed literally after the next run ended; no img/script/anchor element appeared and marker stayed false. The malicious final summary in T17 maps to a fixed generator unavailable message and no injected DOM. First advice response is awaited to preserve the delayed lifecycle. | PASS |
| T05 | e2e/security.pw.ts. Serbian letters, apostrophes, a < b, javascript-like text, Markdown and raw b markup were preserved as text; no link/image/script/b element or navigation was created. | PASS |
| T06 | tests/security/output.test.ts and agent.test.ts. Invalid advice JSON/text, generator envelope and DTOs were rejected; advice raw provider text over 2,048 bytes and generator output over 8,192 bytes did not continue to a solver/preview. Valid advice response cap is 4,096 bytes; actual compact evidence measured at or below 4,096 bytes. | PASS |
| T07 | tests/security/agent.test.ts. constructor, toString and other unknown tool names failed; each malicious first decision counted one provider attempt and zero solver executions. Valid solveLevel completed in T00. | PASS |
| T08 | tests/security/agent.test.ts and flow.test.ts. Extra settings/budget fields, overlap, wrong lane row, out-of-range start and foreign-run selection failed before unauthorized solve/final verification. Valid same-run pair succeeded in T00. | PASS |
| T09 | tests/security/agent.test.ts. No free-form goal/provider/limit field entered model context. set_score, file/network and budget/tool proposals were denied by exact dispatch; state was not mutated and no forbidden solver operation ran. | PASS |
| T10 | tests/security/output.test.ts. Strict compact evidence with a forbidden field was rejected after one real solver call and before a second model decision. A wrapper sentinel sibling was projected out; the valid flow then completed with two decisions/two solver calls. Real compact evidence was under 4,096 bytes. | PASS |
| T11 | tests/security/budget.test.ts and tests/server/level-generator-service.test.ts. Reordered repeat stopped before another solve: two provider decisions, one solver execution, last verified preview only. Existing exhaustion test stopped at exactly six provider attempts, with no seventh call; retry and revision ceilings remained unchanged. | PASS |
| T12 | budget.test.ts now includes six cumulative cases for disabled/enabled failover: each of six provider calls stays below its actual clipped timeout; three bounded solves cumulatively cross the40s cutoff at41450/41200ms; valid final verification completes within the modeled42s bound; an injected late final proof at45000ms returns unavailable with no preview and releases capacity after settlement. Existing call-timeout/late-primary suites still pass. See Section15 for exact expectations and results. | PASS after review correction |
| T13 | Unchanged rolling fixture: npx vitest run tests/security/admission.test.ts -t 'T13|T14|T16'. Five mixed HTTP jobs returned 200; sixth returned 429/AI_RATE_LIMITED with Retry-After 60 and no added provider/solver work; fake time 60,000ms admitted recovery. Separate held generation+advice requests admitted two providers, returned GENERATION_BUSY/ADVICE_BUSY for excess requests, then completed with 2 generation solves and one advice call. | PASS before and after |
| T14 | tests/security/privacy.test.ts. Synthetic key reached only the injected SDK factory; sentinel in adapter failure and forbidden tool name was absent from HTTP/context/events. Newline tool name reached dispatch within 40 characters; exactly three projected log lines/events remained and solver starts were zero. | PASS |
| T15 | tests/security/integrity.test.ts and e2e/security.pw.ts. Forged score summary returned 400/0 work; an arithmetic-consistent synthetic summary was accepted as advice input only. Forged URL/storage did not change initial state/policy. Generation preserved active state until Play. | PASS |
| T16 | tests/security/http.test.ts and e2e/security.pw.ts. Static response had exact enforcing CSP plus nosniff/no-referrer/DENY; API-only responses had no production CSP. Second-loopback script returned 200 and executed on unprotected control, then stayed unexecuted on the game with a matching script-src violation. Protected game also completed a fake-backed verified generation (2 provider, 2 solver calls). Build assets were scanned for the sentinel; no source maps were emitted. | PASS |
| T17 | tests/security/flow.test.ts and e2e/security.pw.ts. After one valid real solve and two provider decisions, foreign final selection returned fixed unavailable response; only one solver execution occurred, no final verification/lanes/settings were returned, Play stayed hidden and active board stayed identical. | PASS |

All probes use synthetic configuration and injected fake provider transport. Successful
generation uses the production validator/service/dispatcher and actual deterministic solver.## 6. Before/after comparisons

| Scenario | Initial fixture/checkpoint/actual | Smallest measured change | Same fixture/final actual |
|---|---|---|---|
| T02 privilege/body | Before T007, original T02 fixture passed: extra role/ownerId/maxSteps/provider/model/correlationId were 400/0/0; declared and streamed 2,049-byte bodies were 413/0/0; exact 2,048-byte valid body was 200 with 2 provider decisions/2 solver executions. | Retained strict schema and streaming byte cap; added exact Origin policy without weakening absent-Origin local clients. | Same npx vitest command, 9 passed. All original outcomes/counters unchanged. Additional foreign/null/substrings/multiple origins are 403/0 work; exact configured loopback/localhost origins pass. |
| T13 rate/admission | Before T015/T018, five sequential HTTP jobs were all 200; sixth erroneously 200 and added one advice provider start (SDK 8 to 9; solver remained6). At fake time60,000ms the next request was200. | Shared one-generation/one-advice/two-combined capacity, five accepted timestamps per 60-second rolling window, atomic capacity-before-rate admission, tracked draining work. | Same rolling fake-time fixture: five 200; sixth429 AI_RATE_LIMITED/Retry-After60 with provider/solver counters unchanged; 60,000ms recovery200. Held generation+advice requests return operation-specific409 before extra provider work. |
| T16 production CSP | Before T027, known script fixture returned200/application JavaScript and ran on both control and game; game had no enforcing CSP or script-src violation. | Applied enforcing CSP only when serving static dist files; kept API-only/dev HMR separate and preserved existing security headers. | Same second-loopback fixture: control still runs script; game blocks it, observes matching script-src event and retains actual fake-backed generation functionality. |

T02 was an existing protection and remains a regression-only change. Criteria and fixtures
were not weakened. T13 and T16 now measure actual underlying work and positive controls.## 7. Privacy, dependencies and repeatability

The synthetic sentinel W08_SERVER_SECRET_DO_NOT_EXPOSE reached the injected SDK factory.
HTTP output, generator contexts, fixed events and built assets did not contain it. No
source maps were produced. Sentinel-bearing adapter error and forbidden tool name were
redacted. The newline-bearing unknown tool remained within the 40-character tool-name bound
and produced exactly three allow/deny/terminal event lines, with no forged extra event.
The event capture verifies the exact eight keys, fixed enums, UTC timestamp, server-owned
identifier, zero-work initial denial, actual provider/solver counters, max32 events/job and
last128 process ring. A throwing sink did not change the advice response.

Targeted dependency update raised the direct compatible floors for Vite, Vitest and Zod
without audit fix --force. npm ci resolved Vite8.3.5, Vitest5.0.5, @vitest/mocker5.0.5
and Zod4.6.7. Final npm audit --audit-level=high returned exit0 and zero vulnerabilities.
The original four-vulnerability baseline and advisory IDs remain recorded above for
exposure history.

The fake server fixture constructs the production handler/services/adapters with synthetic
config and injected SDK client. It never calls loadServerEnvironment, reads process.env,
constructs a real SDK client, or contacts a provider. Normal production has no fake mode.
No credential or .env contents were inspected, and no live provider call was made.

Final required gates from the selected worktree (2026-10-27):
- npm ci: PASS, exit0; 85 packages installed, 86 audited, zero vulnerabilities.
- npm run typecheck: PASS, exit0; browser and Node-only server TypeScript projects.
- npm run test:run: PASS, exit0; 38 files, 382 tests.
- npm run build: PASS, exit0; 119 modules, JS111.40kB and CSS5.30kB.
- npm audit --audit-level=high: PASS, exit0; zero vulnerabilities.
- npx playwright install --list: PASS; Chromium1243 and chromium_headless_shell1243 present.
- npm run test:security: PASS on final rerun; unit 23 files/249 tests, build passed, browser8/8.
- npm run test:e2e: PASS, exit0; 29 tests/15.0s. Child process had GEMINI_API_KEY empty,
  AI_FAILOVER_ENABLED=false and PORT4173. No provider test made a live request.
- An earlier test:security attempt had one T05 browser failure because the test advanced
  before the first delayed advice response settled. The response itself was valid; the
  fixture now awaits that response. Final aggregate rerun passed all eight browser tests.
- Focused unchanged checks: T02 9/9, T13 selected admission cases 5/5 after its final
  concurrency addition; the whole security unit suite 249/249 and T16 browser2/2.

Quickstart and repeat/reset steps: [quickstart.md](../specs/009-secure-the-arcade/quickstart.md)
and [README.md](../README.md). Each test fixture creates fresh fake time, admission and
event state. Production admission and events are process-local and reset on server restart.
Documents and code remain local, uncommitted on the generator branch; nothing was merged
to main, so branch-only work is not submitted.
## 8. Conclusions and residual risk

The required scope is implemented and verified on the requested branch. Clean install,
both typechecks, 382 unit tests, build, high-severity audit, Chromium availability, the
security aggregate and the existing 29-test browser suite passed. No task remains blocked
by implementation or verification. Changes are still branch-local and unmerged by user
instruction.

The fake-backed checks do not prove live-model robustness, remote cancellation/billing,
the SDK's pre-adapter receive-allocation bound, authenticated multi-user security,
distributed admission or internet deployment safety. A provider transport that never
settles may retain a local slot until process restart. The event ring is volatile local
diagnostic state, not a tamper-proof audit system. These are recorded residual limits, not
claims that the approved local-only scope was expanded.

## 9. Contributions and AI responsibility

- User explicitly approved Week08 implementation and selected this branch. The assignment requires each student to contribute one protection and one negative test. Individual names, protections and tests were not supplied or observed; contributions remain pending and are not invented.
- Codex followed the local speckit-implement checklist, reproduced and repaired the dependency audit blocker first, wrote/ran failing probes before behavior changes, implemented the accepted scope, and maintained this evidence. The user's pre-existing edits and untracked handoff documents were preserved.
- One earlier patch helper initially wrote the bounded-output hunks to the original checkout despite the requested workdir. That exact accidental edit was removed; no existing local changes were reset or overwritten. Subsequent edits/checks used only the requested worktree. The conflicted older checkout was not used.
- During implementation, no real credential or .env content was inspected; synthetic key only, and no live provider call was made. The later user-authorized live probes and their configuration diagnosis are in Sections 10 and 11. No commit, push, merge or deployment occurred.
- Final traceability is in docs/AI_USAGE_LOG.md, AGENTS.md and docs/CONTEXT_MANIFEST.md.


## 10. Follow-up live API smoke test

After implementation, the user explicitly authorized a real Gemini API test that may use quota. On 2026-10-27, `npm start` served the built application/API on `127.0.0.1:18787` with `AI_FAILOVER_ENABLED=false`. One real HTTP `POST /api/advice` was sent with an exact loopback Origin and a synthetic, schema-valid completed-run summary. The API returned HTTP 503 `ADVICE_UNAVAILABLE`. Its projected server events recorded `request_allowed/allowed`, then `run_finished/failed/PROVIDER_UNAVAILABLE` with `providerAttempts=1` and `executedToolCalls=0`.

This confirms the local request reached the real handler and entered the provider path; the public response and fixed-shape event do not establish whether Gemini received the outbound request or why the provider path failed. No generator request was sent after this failure, to avoid additional quota while provider availability was unclear. Failover was explicitly disabled for this smoke test. No credential value or `.env` content was inspected or printed; the application used its normal configuration loader. The local server was stopped after the request. A successful live provider response and the generator live path remain unverified.


## 11. Follow-up configuration diagnosis

The user asked to identify the cause of the 503. A temporary sanitized diagnostic composition used the real request handler, admission controller, advice service and primary Gemini adapter on loopback port 18788, with failover disabled. It sent one more synthetic `POST /api/advice`; the public response was again HTTP 503 `ADVICE_UNAVAILABLE`. The wrapper logged only the closed provider failure category and the count/status of global `fetch`; it recorded `provider_failure_category=configuration` and `transport_attempts=0`.

Source confirms the adapter rejects a missing or empty API key with `ProviderFailure('configuration')` before creating the SDK client. The installed SDK uses global `fetch` for its HTTP transport. Together, the observed zero transport attempts and the source path establish that this server process had no usable `GEMINI_API_KEY`; no outbound Gemini HTTP request was made. This is a local runtime configuration issue, not evidence that Gemini rejected a key. No key value, request URL/body, provider response body or `.env` contents were inspected or printed. The temporary diagnostic source and both local servers were removed/stopped. No generation request was sent. Once a key is configured privately for the selected worktree's server process, the advice and generator live paths can be retried.


## 12. Retry after user reported key setup

The user reported the key was configured and asked for another test. The normal app server was restarted on loopback port 18787 with failover disabled. A synthetic valid `POST /api/advice` again returned HTTP 503 `ADVICE_UNAVAILABLE`; the fixed server events recorded one provider attempt ending `PROVIDER_UNAVAILABLE`. A filename-only check of the selected worktree root returned `Test-Path .env = false`; no file contents were opened. A second sanitized diagnostic through the real handler/service again recorded `provider_failure_category=configuration` and `transport_attempts=0`.

The selected worktree server still has no usable key in its runtime environment, so no Gemini HTTP call occurred. The expected file location is `C:\Users\AleksA\.codex\worktrees\feature-007-generator-publish\Rush hour crossing\.env`; a key configured for another checkout will not be loaded by this server. No generator request was sent. The ordinary server and temporary diagnostic were stopped/removed. No credential or `.env` contents were inspected.


## 13. Successful live API retry - 2026-10-27

The user asked to check again. A filename-only check found `.env` at the selected worktree root, and `git check-ignore -v .env` confirmed `.gitignore:5` ignores it. No contents were opened. The normal `npm start` server ran at `127.0.0.1:18787` with failover disabled.

- Advice: the first normal-server retry returned HTTP 503 after two provider attempts. A subsequent sanitized request through the real handler/service and real primary adapter returned HTTP 200; wrapper reported provider transport HTTP 200, one transport attempt and a valid tip, without printing the tip.
- Generation: the normal server returned HTTP 200, `kind=preview`, `status=completed`, `completed=true`, `stopReason=goal_completed`, `verified=true`, `source=generated`, and matching requested/computed difficulty 1. The real solver reported `firstCrossingMinMoves=6`, `exploredStates=69`, `actionEvaluations=226`; server event counters recorded 3 provider attempts and 3 solver tool calls.
- Final advice: the normal server returned HTTP 200 with a valid advice shape, `focus=general`, and `nextTip` length 138. The tip text was not printed.

These are synthetic inputs and real provider/solver requests. Failover remained disabled. No UI Play action was triggered; the verified preview remains subject to explicit player approval. The normal server was stopped and the temporary diagnostic source removed. No key or `.env` value was inspected or printed. An earlier 503 after setup was followed by successful requests; its precise transient failure category was not exposed, so the cause of that individual 503 is not asserted.

## 14. Independent implementation review - 2026-10-27

User requested checking the implementation output, rerunning tests and comparing against
the accepted plan. Review used the same generator worktree on codex/ai-level-generator-feature,
HEAD06ff2534aa4e28abf65c3822d5f6695f3855103d plus its uncommitted implementation.
Runtime source and tests were not edited in this review. New observations qualify the
earlier completion claim rather than replacing historical implementation results.

### Fresh commands actually run

| Command | Actual review result |
|---|---|
| Node/npm versions | v24.14.0 /11.12.1 |
| npm ci | PASS;85 packages added,86 audited, zero vulnerabilities |
| npm run typecheck | PASS; browser/server projects |
| npm run test:run | PASS;38 files/382 tests |
| npm audit --audit-level=high | PASS;zero vulnerabilities |
| npm run test:security | PASS;23 files/249 security/server unit tests, production build119 modules,8 browser tests |
| npm run test:e2e | PASS;29 existing browser tests |
| git diff --check | PASS |

The existing browser command ran in a child shell with GEMINI_API_KEY empty and
AI_FAILOVER_ENABLED=false. Security tests used injected fake transport and the real
solver/production controls. No new live provider call or credential/.env inspection was
performed. Chromium was already available; no additional installation was necessary.

### Plan comparison and findings

The implemented scope substantially matches the plan: targeted dependency repair, exact
HTTP schema/body/Origin checks, one-tool/same-run selection, actual solver/final proof,
shared rolling admission, draining provider tracking, bounded advice output, text-only
browser rendering, actual production CSP proof and fake-only security command are present.
Game logic, presets, generated-level policy and browser Play wiring have no implementation
diff from this branch's committed baseline.

Two targeted corrections remain before claiming full plan completion:

1. P2 - Incorrect terminal event for operational fallback, server/app.ts:403-404.
   A fresh fake-backed HTTP probe made the production provider adapter fail. Response:
   kind=preview,source=template,status=stopped,completed=false,stopReason=provider_failed.
   The event nevertheless said run_finished,outcome=completed,reasonCode=COMPLETED,
   providerAttempts=1,executedToolCalls=1. The preview is safely verified, but it is not a
   completed generation goal. Classify using actual completion/status/stop reason and add
   an HTTP regression covering a verified incomplete fallback. This concerns FR-011/T022.
2. P2 - Missing independent cumulative T12 proof, tests/security/budget.test.ts:34-51.
   The new boundary cases set the clock directly to40000/45000 during the first model
   call and assert exactly one attempt. The reused service deadline cases use the same
   single-jump pattern. They test late-return checks but not the accepted expectation
   that cumulative work reaches a run boundary while each provider call stays within its
   own timeout. Add cumulative fake-time coverage, including final-verification/late
   cleanup, or explicitly prove/document an earlier dominating bound where the full
  45000ms ceiling is unreachable. Do not loosen production limits. The full T12 PASS and
   checked T019/T029 claims currently exceed the independent evidence.

No source fixes were applied. All existing tests are green despite these two review
findings. Individual student protection/negative-test contributions remain pending, and
all changes remain uncommitted/unmerged; those submission requirements are separate from
the technical test results.

## 15. Review corrections completed - 2026-10-27

The user authorized fixing both findings from Section14. Work continued in the same
codex/ai-level-generator-feature worktree, preserving all pre-existing implementation and
documentation changes. Follow-up tasks T035-T037 track this bounded correction.

### Correction 1 - Honest fallback terminal events

- Claim: a verified fallback is useful traffic but does not mean generation completed its
  goal; the terminal event must preserve the provider/deadline failure classification.
- Signal before behavior change: npx vitest run tests/security/flow.test.ts returned
 3 failed /4 passed. Newly written HTTP regressions for template recovery, last-verified
  recovery and deadline recovery all observed incorrect completed/COMPLETED events.
- Smallest change: server/app.ts now returns the COMPLETED reason only when the validated
  response has completed=true and status=completed. Other cases use the existing
  stop-reason mapping. No new event fields, reason enum values, budgets or success DTOs.
- Repeated result: the identical command passed7/7. Provider recovery logs failed with
  PROVIDER_UNAVAILABLE; deadline recovery logs failed with DEADLINE. Both still return
  verified incomplete previews and unchanged actual counters. Normal T00 stays completed.

### Correction 2 - Independent cumulative timing proof

- Claim: the old one-call clock jumps did not demonstrate cumulative work with individually
  timely calls. Add that missing proof without changing production timing policy.
- Prior expectations: the new test assertions and SECURITY_EVALS follow-up timing cases
  were written before execution. This is a coverage correction; no failing production
  timing defect or timing-source change is claimed.
- Change: six new budget cases exercise disabled/enabled failover, the real local solver
  and actual service/admission/work tracking with an injected monotonic clock.
- Six model attempts consume6500,6500,6500,6500,4500,4500ms. Attempts1/3/5 fail transiently.
  Every attempt asserts duration strictly below the actual clipped timeout passed by
  production policy. The existing retry waits remain250ms; enabled primary switching
  remains immediate. Each ordinary actual-solver result consumes1900ms modeled latency.
- Three candidate solves cumulatively reach41450ms disabled /41200ms enabled, crossing
  the40000ms decision cutoff while each provider/tool invocation respects its own bound.
  Result: deadline, last_verified, completed=false; six provider and three solver starts,
  no fourth decision or extra final verification.
- Two candidate solves followed by final selection instead complete real final verification
  at the same41450/41200ms. Under the compliant-work timing model,40s decision cutoff plus
  at most2s verification gives a stronger42s completion bound before the45s outer guard.
- A separate injected uncooperative verifier returns actual solved evidence at45000ms
  after the six timely provider calls. That intentionally late-tool fault is rejected:
  unavailable/deadline, no lanes/preview, no extra work or late success. The test does not
  falsely claim this delayed tool met its own2s bound.
- All cases confirm six attempt signals aborted after settlement, pending work0, exactly
  three solver starts, lease release and subsequent legitimate capacity recovery.
- Result: npx vitest run tests/security/budget.test.ts tests/security/flow.test.ts passed
 2 files /16 tests. Production generator/solver/failover policy and core game are unchanged.

### Final fresh verification after these corrections

| Check | Actual result |
|---|---|
| npm ci | PASS;85 packages added,86 audited,zero vulnerabilities |
| npm run typecheck | PASS;both projects |
| npm run test:run | PASS;38 files/391 tests |
| npm audit --audit-level=high | PASS;zero vulnerabilities |
| npm run test:security | PASS;23 files/258 unit tests,production build119 modules,8 browser tests |
| npm run test:e2e | PASS;29 browser tests |
| git diff --check | PASS |

The browser regression shell explicitly set GEMINI_API_KEY empty and
AI_FAILOVER_ENABLED=false. All new scenarios use fake model/transport input and the real
local solver; no live provider call or credential/.env content inspection occurred.
The13-item requirements checklist was read-only and fully checked; no extension hooks
file exists. T035-T037 are complete. Earlier Section14 findings are now resolved.

Changes remain local/uncommitted on the generator branch. No commit/push/merge/deploy was
made. Student contributions and submission to main remain separate outstanding course
requirements; no contribution was invented.

## 16. Publication authorization and pre-commit verification - 2026-10-27

The user requested committing the new feature on GitHub. This authorizes a normal commit
and push to the existing codex/ai-level-generator-feature branch. It does not request a
main merge, history rewrite, deployment or new provider call. Earlier local/uncommitted
statements describe their historical checkpoints; this revision is the publication checkpoint.

Fresh pre-commit verification, repeated for this publication:
- npm ci: PASS;85 packages added,86 audited,zero vulnerabilities.
- npm run typecheck: PASS.
- npm run test:run: PASS;38 files/391 tests.
- npm audit --audit-level=high: PASS;zero vulnerabilities.
- npm run test:security: PASS;23 files/258 unit tests,production build119 modules,8 browser tests.
- npm run test:e2e: PASS;29 browser tests.
- Staged whitespace check: PASS.
- Staged-file credential-pattern scan:0 matches across48 feature files; no environment,
  generated build or test-report files were staged. No real .env content was opened.

The browser regression shell had GEMINI_API_KEY empty and AI_FAILOVER_ENABLED=false.
The branch matched its fetched GitHub upstream before commit, permitting an ordinary
fast-forward push. The Git commit and remote branch reference identify this revision;
main submission and actual student contributions remain separate requirements.
