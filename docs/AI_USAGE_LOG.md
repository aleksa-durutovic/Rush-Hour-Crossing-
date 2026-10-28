# AI Usage Log — Session 003

## Week 05 implementation prerequisite — 2026-10-06

- Codex reproduced the documented Windows SDK-owner path assertion failure (1 failed / 4
  passed), normalized path separators only in that expected-path comparison, then confirmed
  the boundary file passed (5/5). The exact sole SDK importer and all boundary predicates stay.
- A fresh audit reported one high finding: `source-map-js@1.2.1`, transitive through Vite and
  PostCSS, advisory GHSA-68fv-2mgg-jv7q. Since the declared range allows 1.2.2, Codex updated
  only the lockfile resolution. A clean `npm ci` then reported zero vulnerabilities.
- Actual baseline results after the fix: typecheck passed; unit suite 16 files / 148 tests
  passed; build passed; audit passed with zero vulnerabilities; Chromium install returned 0;
  browser suite passed 22/22. No live provider call occurred.
- Added Zod 4.6.5 as the sole new runtime dependency. Reviewed the installed Gemini SDK types
  for structured JSON, output token limits, abort signals, HTTP timeout and retry settings;
  retained the configured model and sole provider adapter boundary. No provider code or live
  request was part of this dependency task.
- Implemented the separate generator decision adapter with fake transport coverage only. It
  remains in the current Gemini SDK owner, preserves the Week 04 tip method, uses a single SDK
  attempt and never logs raw provider details. No live provider call was made.

## Week 05 planning and scope decision — 2026-10-06

- The user requested a bounded agent that proposes traffic configurations, evaluates them
  against the deterministic engine, and revises before producing a verified level.
- After reviewing the Week 05 assignment/addendum and the repository, the user explicitly
  accepted the recommended first version: the existing nine-column, five-lane board,
  a verified preview, and a separate player-operated Play this level action.
- The user authorized a detailed Spec Kit implementation package and a prompt for a new
  Luna 6 chat. The user explicitly prohibited implementation code in the instructions.
- This approval authorizes the narrow feature 007 generation/tool-proposal scope exception
  and its documentation. It does not authorize a live provider call in this planning chat.
  No second student's contribution or separate approval is asserted by this record.
- Planning uses speckit-specify, speckit-plan, speckit-tasks and speckit-analyze, with
  read-only research agents required by the plan skill. Implementation is deferred to
  Luna 6 through speckit-implement. Repository documentation remains the destination.
- Scope: one deterministic read-only solveLevel tool, server-owned limits, at most two
  revisions, runtime validation, no automatic game-state mutation, no persistence,
  no additional provider, no six-lane layout, no arbitrary network/filesystem/shell tools.
- Prior assessment checks: Node v24.14.0, npm 11.12.1; typecheck exited 0; unit suite
  had 147 passes and one failure at tests/server/boundaries.test.ts:54 because Windows
  returns backslashes while the expected SDK-import path uses forward slashes.
  This existing failure must be reproduced, recorded, and corrected before feature code.
- Evidence and actual implementation outcomes belong in docs/EVIDENCE_W05.md. Planning
  must not mark implementation tasks, browser checks, audit, or live demos as completed.

| Phase | Why AI was called | Expected result and verification signal | Result | Next decision |
|---|---|---|---|---|
| Planning | Convert the locked game and process specifications into a bounded Spec Kit plan | Every F0–F10 phase and all eight deliverables are mapped without expanding scope | Plan produced in chat; no Spec Kit workflow was run during planning | Pair approved the proposed stack and continuation |
| Starter setup / F0 | Create the approved Vite, TypeScript, Canvas, and Vitest starter before gameplay work | `typecheck`, starter tests, and build all exit successfully; dependency audit has no high/critical findings | Initial tests ran; details and the first setup failure are recorded in `EVIDENCE_003.md` | Apply only the minimal starter configuration correction, then repeat the same checks |
| Constitution / F1 | Convert approved constraints into non-negotiable project governance | Versioned constitution contains no placeholders and expresses eight testable principles | Constitution 1.0.0 created and placeholder scan returned no matches | Commit governance, then create the feature specification from `GAME_SPEC.md` |
| Specification / F2 | Translate the authoritative game rules into one testable feature specification | R1–R7, configuration behavior, visual requirements, and out-of-scope boundaries are covered; the quality checklist has no unchecked items | `spec.md` created with 23 functional requirements and eight measurable outcomes; checklist is 16/16 | Skip formal clarification because no material ambiguity remains; proceed to technical planning |
| Technical plan / F4 | Map the approved stack to a minimal architecture and validation contract | Constitution gates pass; all technical unknowns are resolved without new infrastructure | Plan, research, data model, query contract, and quickstart created; placeholder scan returned no matches | Generate dependency-ordered implementation tasks with eval expectations before code |
| Tasks / F5 | Convert the approved design into a sequential, test-first execution list | Every requirement has a concrete file task; E1–E3 expectations exist before gameplay implementation | 33 tasks generated, 2 evidence prerequisites completed, and no parallel-agent markers used | Run read-only cross-artifact analysis before implementation |
| Analysis / F6 | Check specification, plan, tasks, and constitution alignment before code | No CRITICAL issue, no unowned task, and complete requirement coverage | 23/23 functional requirements and 8/8 success criteria mapped across 33 tasks; no clarification or TODO markers | Proceed to baseline implementation |
| Baseline implementation / F7–F8 | Implement reviewed tasks test-first and measure the first complete version | Tests fail before modules exist, then all rule/config checks pass; browser demonstrates config fallback, win, loss, lock, and restart | Initial five suites failed on missing modules; completed baseline has six suites and 40 passing tests, green typecheck/build/audit, and passing E1–E3 | Commit and tag the baseline before selecting E4 |
| Controlled change / F9–F10 | Test whether per-cell rendering caused configured vehicle lengths to look like separate cars | Only the render path changes; E1–E3 remain unchanged and E4 shows one contiguous body with one windshield | Hypothesis supported; E1–E4, 40 tests, typecheck, build, and audit pass | Record student contribution details, then publish the reviewed branch and baseline tag |
## Session 003 — Voxel Night City scope decision

- **Phase**: Visual redesign scope amendment
- **Why AI was involved**: Translate the student pair's approved visual direction into a bounded specification.
- **Asset provenance**: The decorative backdrop `public/assets/voxel-night-city-backdrop.png` was generated with OpenAI Codex (tool name recorded on 2026-09-23 from the student's statement).
- **Decision recorded**: The student pair jointly approves original generated bitmap decorations and brief, optional visual feedback for the Voxel Night City redesign. This exception is visual-only: gameplay remains deterministic and turn-based; it does not allow copied assets, audio, touch controls, automatic turns, or new mechanics.
- **Verification signal**: The redesign specification and implementation tasks preserve the original gameplay rules and explicitly test reduced motion and unchanged turn behavior.

## Post-review evidence — 2026-09-23

- **Why AI was involved**: Save the D5/D6 screenshots in the repository after the review found that `main` still pointed to the constitution commit.
- **Result**: Capturing the win/loss screenshots exposed an invisible `PRESS R TO RESTART` hint (a redesign colour regression, 1.00–1.40:1 contrast).
- **Decision recorded**: The student approved a single-line colour fix in `src/render/canvas.ts`, followed by repeated checks and new screenshots. No rule, config, or eval change.
- **Verification signal (at that commit)**: Typecheck, 40/40 tests, and build pass; the restart hint measures 10.45–14.87:1; screenshots are in `docs/evidence/` and referenced in `EVIDENCE_003.md`.

## Second review corrections — 2026-09-23

- **Why AI was involved**: Plan and apply the five corrections from the second review, one commit per correction, directly on `main` as the student decided.
- **Decisions recorded**: The student chose `GAME OVER` as the loss text, the status `Accepted — visual addendum` for both feature specifications, the addition of a root `AGENTS.md`, and direct commits to `main`.
- **Verification signal**: The end-message test fails before implementation and passes after; typecheck, all tests, and build pass; the loss screenshot shows `GAME OVER`; the audit is re-run and recorded with its date.

## Consistency pass — 2026-09-23

- **Why AI was involved**: At the student's request, re-verify the whole project against the current code, remove stale evidence, and make the documentation consistent.
- **Result**: The fresh checks exposed two defects: overlapping vehicles in normal-preset row 4 and a favicon 404 on every page load. They also exposed a nested `main` landmark and stale documentation claims (test counts, a 5 px focus outline, a 960 px max width, Node 22 in the quickstarts, and baseline screenshots that were never saved).
- **Decisions recorded**: The student chose a test-first preset fix (`7c172e7`) over only documenting the problem. The console and landmark fix went in `d42607f`. `EVIDENCE_003.md` was restructured into *Current state* and *Development history*, and every current claim was re-measured.
- **Verification signal (at that commit)**: A clean `npm ci`, typecheck, 7 files / 46 tests, build, and audit (0 vulnerabilities) pass. Scripted browser checks and screenshots were taken from code at `d42607f`, and the baseline board was re-captured from tag `s003-baseline-v1`.

## Preset change reverted — 2026-09-23

- **Why AI was involved**: The student noticed in play that normal row 4 had become denser after `7c172e7` and asked why.
- **Result**: The row speed had not changed (`moveEveryTicks: 2` since the baseline). Starts `[0, 3, 6]` left one-cell gaps. An exhaustive search over reachable states (a temporary probe, not committed) found no winning path for `normal` after the change (11 moves before it), and none for `hard` since the baseline. The earlier check had covered only the non-blocking invariant, not passability.
- **Decision recorded**: The student chose to remove the change. It was reverted in `26ae68b`, which restores the winnable `[0, 4, 8]`. The row-4 overlap and the unwinnable `hard` preset are recorded as known limitations in `EVIDENCE_003.md`, not fixed.
- **Verification signal**: A clean `npm ci`, typecheck, 7 files / 43 tests, build, and audit (0 vulnerabilities) pass on `26ae68b`. Screenshots were re-captured from that code.

## Third review corrections — 2026-09-26

- **Why AI was involved**: The third review asked for a winnable fix of the normal row-4 overlap, a fix of the unwinnable hard preset, Definition of Done alignment, an automated browser smoke test, and evidence regenerated from one commit. Claude Code (Opus 5.5) measured the presets and wrote the Spec Kit plan in `specs/003-review-fixes/` on 2026-09-26; OpenAI Codex (GPT-6) implemented it task by task.
- **Measured before planning**: a temporary exhaustive search (not committed) confirmed shortest safe wins of 6 / 11 / none for easy / normal / hard and scored every non-overlapping row-4 alternative (`specs/003-review-fixes/research.md`).
- **Decisions recorded (student pair)**: normal row 4 starts `[0, 4]` (DEC-1); hard rows 1, 2, 4, 5 each lose one vehicle so hard is winnable (DEC-2); Playwright as a new dev dependency for the browser smoke test (DEC-3); one Spec Kit feature, one commit per correction on branch `003-review-fixes`, merged into `main` only by the student (DEC-4); `GAME_SPEC.md` R3, D4, D6 and constitution principle V (1.0.0 → 1.1.0) extended with the no-overlap and winnable-preset invariants.
- **Verification signal**: before each preset change the new tests failed (`Tests  2 failed | 50 passed (52)`; `Tests  3 failed | 54 passed (57)`) and passed after it. On `2c1b3b1`: typecheck, 7 files / 57 tests, build, audit (0 vulnerabilities across 86 dependencies), and 10/10 Playwright smoke scenarios pass. Screenshots were regenerated from `2c1b3b1` and confirmed by the student.

## Difficulty selector (feature 004) — 2026-09-27

- **Why AI was involved**: The student asked for mouse buttons next to the tick counter to switch difficulty. Claude Code (Opus 5.5) read the code, measured the button layout in the running game, replayed the golden paths against every preset, and wrote `specs/004-difficulty-switch/implementation-plan.md` on 2026-09-27. OpenAI Codex (Luna 6) implemented it step by step.
- **Decisions recorded (student)**: three buttons EASY / NORMAL / HARD (DEC-1); a switch restarts the game on the new preset, the active button does nothing (DEC-2); real HTML buttons over the Canvas HUD (DEC-3); the choice is written to the URL (DEC-4); the old screenshots stay, one new screenshot is added (DEC-5). `GAME_SPEC.md` (controls, R7, new *Izbor težine* section) and the constitution (1.1.0 → 1.1.1, mouse allowed for the difficulty selector only) were amended accordingly.
- **Deviation noted**: The feature was specified in one combined plan file instead of the separate Spec Kit spec/plan/tasks files, at the student's request.
- **Verification signal**: new unit tests failed before the helper and pass after; 6 new browser tests failed before the buttons and pass after; on `18abd71`: typecheck, 8 files / 69 tests, build, audit, and `npm run test:e2e` 16 passed.

## Backend split (feature 005) — 2026-09-28

- **Why AI was involved**: The Session 004 AI hint needs a place where a provider key can live outside the browser. The student asked Claude Code (Opus 5.5) to read the Week 04 materials and the code and to write `specs/005-backend-split/implementation-plan.md` (2026-09-27); OpenAI Codex (Luna 6) implements it step by step.
- **Decisions recorded (student)**: skeleton only — `GET /api/health`, no game state and no AI on the server yet (DEC-1); Node.js built-in `node:http` run with tsx, new dev dependencies `tsx` and `@types/node` (DEC-2); the frontend stays in `src/`, new `server/` folder, one `package.json` (DEC-3); one origin — Vite forwards `/api` in development and `npm start` serves `dist/` and `/api` together, chosen as the more secure option because no CORS is needed (DEC-4). Plan defaults PD-1–PD-7 (loopback bind, `Host` allowlist, validated `PORT`, static allowlist, fixed errors, ports, boundary test) were accepted with the plan. Constitution 1.1.1 → 1.2.0 and `GAME_SPEC.md` (technical boundary, OUT OF SCOPE, D8, new *Lokalni API server* section) were amended before any server code.
- **Deviation noted**: As in feature 004, one combined plan file replaces the separate Spec Kit spec/plan/tasks files.
- **Verification signal**: the server tests failed before each module existed and pass after (`1 failed | 8 passed (9); 69 passed (69)` → `9 passed (9); 83 passed (83)`; `1 failed | 10 passed (11); 86 passed (86)` → `11 passed (11); 112 passed (112)`); the 2 new browser tests failed while the game was served by `vite preview` and pass on the local server (`2 failed; 16 passed` → `18 passed`). On `545b62c`: typecheck (browser and server projects), build, audit (Exit 0; found 0 vulnerabilities), and the student's manual check: "tests all passed, you can continue".

## W04 delayed AI advice — feature 006 — 2026-09-29

- **Why AI was involved**: Convert the W04 assignment and the student's delayed-advice request into a reviewable Option C feature specification, plan, and test-first expectations.
- **Student-pair scope decision**: The student pair approves the bounded Option C post-game advice feature: survival for a loss with zero crossings, goal_progress for a partial loss, general for a win or unclear evidence. This approval authorizes the scope exception recorded in docs/GAME_SPEC.md. The user’s follow-up request to complete the W04 assignment is recorded as implementation authorization; a live provider call remains separately gated.
- **User clarifications**: If prior advice is still pending when the next run ends, show the safe unavailable message as that prior job is superseded. Keep ready advice hidden through a mid-run restart or difficulty switch; show it after the next completed run.
- **Artifacts**: specs/006-ai-feature/ contains the draft spec, checklist, plan, research, data model, API contract, quickstart, tasks, and AI_EVALS.md. ai-feature-plan/feature.md records Option C; ai-feature-plan/speckit-plan.md records the workflow and review gate.
- **Test-first state**: At this initial planning checkpoint, expected Vitest and Playwright files were written before implementation. The pre-implementation run later recorded the expected missing-module and missing-route failures; the implementation and post-change results are recorded in the next entry.
- **Secret handling**: .env.example contains an empty GEMINI_API_KEY field and .gitignore excludes local .env files; the local .env value was not read or recorded.

## W04 Option C implementation — feature 006 — 2026-09-29

- **Authorization and scope**: The student pair’s Option C scope approval and the user’s request to complete the W04 assignment authorized implementation. Categories remain survival for a loss with zero crossings, goal_progress for a partial loss, and general for a win or unclear evidence. Existing clarifications govern pending supersession and restart/difficulty behavior.
- **Changes**: Added exact shared request/response validators, a compact completed-run summary, pure delayed lifecycle, same-origin browser client/controller, server advice service with a fixed timeout/retry policy, Gemini structured-output adapter, `/api/advice`, optional server-only `.env` loading, status region, and API/E2E tests. No game transition code changed.
- **Test-first signal**: Before implementation, the targeted 6-file run failed in 6 files with 10 failed and 4 passed tests because modules and the route were missing. After the initial implementation, the same set passed 6 files / 38 tests; a later disconnect test was added and final totals are recorded in `docs/EVIDENCE_006.md`.
- **Provider usage**: No live Gemini request was made. Automated tests use fake providers; the real adapter was type-checked and the SDK is configured for one underlying HTTP attempt per service attempt. No key value or local `.env` content was inspected, printed, copied, or recorded.
- **Model and limits**: `gemini-3.1-flash-lite`, output schema has one `nextTip` of at most 160 characters, and max output is 120 tokens. Provider account access and live token/cost metadata remain unverified.
- **Student contributions**: The recorded student-pair contribution is approval of the Option C scope; this conversation records the feature clarifications and implementation request. The supplied record does not identify individual student names or driver/reviewer split, so no individual contribution is invented; add those details before submission.
- **Verification after clean install**: `npm ci` passed (86 packages added; 0 vulnerabilities); `npm run typecheck` passed; `npm run test:run` passed (16 files / 148 tests); `npm run build` passed; `npm audit --audit-level=high` passed (0 vulnerabilities); `npm run test:e2e` passed (22 tests). Chromium was installed after the first E2E launch reported it missing. A 155-file credential-pattern scan found no matches, `.env` is ignored and untracked, and the browser bundle contains no Gemini SDK/model/key marker.
- **Assistant/tool involvement**: OpenAI Codex read the W04 assignment/spec artifacts, authored tests before behavior, implemented the feature, and recorded actual checks. Earlier model/research references are retained in the planning section.

## W05 verified level generator — feature 007 — 2026-10-06

- **Authorization and scope**: The user approved implementation from the code-free Week 05 guide and Feature 007 contracts. Scope is five lanes, rating 1–5, one `solveLevel` tool, bounded decisions (maximum two revisions), verified preview and explicit **Play this level**. No live provider request, push, merge or deployment was authorized.
- **Workflow and boundaries**: OpenAI Codex followed the local `speckit-implement` workflow and ordered tasks. Read AGENTS.md first, then the implementation guide and all linked feature requirements/contracts/data model/plan/tasks/evaluations. Reproduced and minimally fixed the documented Windows SDK-import path failure before feature behavior; ran a clean green baseline. Tests were added before corresponding behavior. Existing presets, golden paths and delayed Week 04 advice lifecycle were preserved.
- **Implementation decisions**: Added a pure deterministic incremental BFS over the unchanged turn engine; validated five-lane schemas and compact evidence; a provider-neutral bounded run service with sole-tool dispatch, retries/cutoffs/cancellation and reverified fallback; separate Gemini decision adapter in its existing SDK-owning module; same-origin API; browser lifecycle/client/controller; isolated Canvas preview and explicit approval. No generic tools endpoint, persistence or repository-file context was added to model prompts.
- **Verification**: `npm ci` passed (87 packages added, 88 audited, zero vulnerabilities); typecheck passed; `npm run test:run` passed 25 files / 254 tests; production build passed (119 Vite modules); high-severity audit found zero vulnerabilities; Chromium install passed; full `npm run test:e2e` passed 29/29. Service suite is 28/28; fixed evaluation traces and the initial browser failures/fixes are in `docs/EVIDENCE_W05.md`.
- **Provider use and privacy**: Fake SDK transport tests only; zero live model calls. No credential values or raw prompts were read or recorded. Separate user authorization remains required for live confirmation after the full fake matrix and local gates pass.
- **Contribution and delivery**: Codex authored the implementation/tests/docs in the existing `main` working tree. The student approved scope and instructed implementation; individual driver/reviewer contributions were not supplied and are not inferred. Tested HEAD is `fdf5df444e05963a688e2dcb56e12d4f3de9f831`; changes remain local and uncommitted; no push, merge or deployment occurred. The existing `s003-baseline-v1` tag was left intact.

## W05 generator integration debugging — 2026-10-06

- **User request and authorization**: The user asked why the new feature fails and supplied the exact message, "The level request could not be verified." The user then explicitly approved up to three bounded live generation requests. This supersedes the earlier pending-live record only for those diagnostics.
- **Measured cause**: Original Gemini root-union output hit MAX_TOKENS and could not be parsed. A concrete decision-envelope schema completed a live propose/solve/revise/final-verify run at rating3. The third authorized run exposed repeated_action without the approved operational fallback. Fresh model requests also omitted rating bands and previous traffic layouts.
- **Controlled corrections**: Codex added failing regressions first, corrected the provider-only schema/parser and token-limit classification, supplied bounded copied candidate/rating context, restored operational fallback with proof replay and honest measured ratings, and allowed final verification to use the reserved window. Gameplay/presets, provider model, output budget, tool whitelist and explicit player approval are preserved.
- **Verification and limitations**: 25 unit-test files / 260 tests, build with browser/server typechecks, zero-vulnerability audit and 29 browser tests passed. All three authorized live requests were used; full final context/fallback changes were verified offline, not via an additional live call. Detailed traces and reported token counts are in docs/EVIDENCE_W05.md. No keys/raw prompts/raw responses were retained; no commit, push, merge or deployment occurred.

## Backup-model documentation — feature008 — 2026-10-06

- **User request**: The user requested a backup model for quota exhaustion or slow responses, then asked for documentation. This authorizes the code-free package, not implementation/provider access. Prior scope/provider preference questions have no explicit selection in this record.
- **Drafting decisions**: Document both generation and delayed advice, recommend independent-provider access, and leave the actual vendor/model as a required operator preflight. Enabled policy is primary8s/backup7s inside shared15s provider time; disabled mode preserves current primary-only behavior. Existing generator outer budgets, deterministic proof, explicit Play and advice delay are preserved.
- **Workflow**: Codex used the local speckit-specify/plan/tasks/analyze instructions, template resolver, setup-plan/setup-tasks and prerequisites scripts. Two read-only research agents reviewed routing/budget ownership and test/integration requirements as required by speckit-plan. No extension hooks were registered. Actual Git branch remained main; script feature labels are not branch creation evidence.
- **Artifacts**: specs/008-model-failover/ contains the spec, plan, research, state/error contracts, compatibility amendments, code-free Luna6 guide, validation guide,30 unchecked tasks,28 prewritten fake evals and documentation-quality checklist. The Spec Kit active feature pointer now selects008. AGENTS and the context manifest identify it explicitly as draft.
- **Authority and delivery**: Existing constitution/GAME_SPEC and accepted006/007 restrictions were not weakened or amended. Documentation records their conflicts and required narrow pre-implementation acceptance. No credentials inspected, source/dependencies changed, tests/live provider calls run, commit/push/merge/deployment made. Prior260/29 check results are historical debug evidence, not new feature008 verification.

## Feature 008 bounded model failover — implementation authorization — 2026-10-06

- **User authorization**: The user explicitly authorized implementation for both existing AI operations (Feature 007 level generation and Feature 006 delayed advice) and the narrowly scoped compatibility amendments in `specs/008-model-failover/contracts/compatibility.md`. This is not recorded as student-pair approval; no individual student contribution is inferred.
- **Profile decision**: The user selected a Gemini-family backup for both operations. At that point, the exact backup model identifier remained pending. The existing primary is `gemini-3.1-flash-lite`; it is not assumed to be the backup. No credential value was read or printed.
- **Policy**: Failover is disabled by default. When enabled, only classified quota/rate-limit, timeout, or temporary provider unavailability may trigger one sequential backup attempt, with primary capped at 8 seconds, backup at 7 seconds, and a shared 15-second phase. Existing generator/advice attempt and lifecycle rules remain unchanged. Failover does not authorize a live request.
- **Compatibility reconciliation**: Constitution 1.3.0 → 1.4.0 and the applicable `GAME_SPEC.md`, Feature 006, Feature 007 run contract, `AGENTS.md`, and `CONTEXT_MANIFEST.md` were amended before behavior changes. Gameplay/presets, generation budgets and deterministic proof/Play approval, advice's eight-field summary and one-completed-run delay remain authoritative.
- **Baseline**: On the starting worktree, Node v24.14.0/npm 11.12.1; clean install, both typechecks, 25 files/260 unit tests, production build (119 modules), zero high-severity audit findings, Chromium installation, and 29/29 E2E tests passed. The worktree contained existing uncommitted Feature 007/debugging/advice changes and unrelated assets; these were preserved. No live calls, commits, pushes, merges, or deployments were made.
- **Assistant involvement**: Codex reviewed the full Feature 008 package and current AI boundaries, ran the baseline checks, and recorded the accepted compatibility changes. Subsequent Feature 008 implementation and verification results are tracked in `docs/EVIDENCE_008.md`.

- **Exact backup profile selected**: The user specified Gemini 2.5 Flash (`gemini-2.5-flash`) for both features. Google's official model catalog and structured-output docs show the stable model ID and structured-output support; rate-limit documentation confirms project-level limits, so this profile does not promise quota independence. The current model documentation notes access restrictions for Gemini 2.5 users; account access is unverified. The existing `@google/genai` dependency is reused. No key was read and no live request was made.
- **Implementation decision and result**: Reused `server/advice/gemini-provider.ts` as the sole Gemini SDK owner for primary and backup adapters. Added server-owned opt-in profile validation, bounded phase routing, clipped transport limits, cancellation/late-result protection and allowlisted per-operation evidence; kept the existing output contracts, generator solver/final proof, API DTOs and advice lifecycle. Fake providers/transports/clocks and the local solver were used. Required typechecks, 305 unit tests, build, audit, Chromium install and 29 browser tests passed; details and F01–F28 mapping are in `docs/EVIDENCE_008.md`. No live call, credential display, commit, push, merge or deployment occurred.

## Week08 Secure the Arcade - planning and scope approval - 2026-10-27

- **User request**: Read Week08 materials, check Spec Kit, agree a solution, then prepare
  Markdown instructions for a cheaper model. User accepted generator-focused hardening,
  shared browser/API protection and advice regressions, then asked to stay with the
  existing AI generator branch. No optional challenge.
- **Branch**: Clean codex/ai-level-generator-feature at06ff2534aa4e28abf65c3822d5f6695f3855103d,
  containing committed007/008. The older similarly named branch has unresolved merges;
  original dirty main was preserved. App attachment was denied because another chat owns
  this checkout; explicit workdirs were used without changing branch ownership/attachment.
- **Workflow**: Local speckit-specify/plan/tasks instructions, template resolution and
  setup-plan/setup-tasks scripts produced feature009 spec/design/contracts/tasks/evals,
  code-free IMPLEMENTATION_GUIDE and EVIDENCE_W08 skeleton. Local metadata selects009;
  a Spec Kit feature label is not a Git branch switch. No extension hooks are registered.
  Final handoff requires the read-only speckit-analyze prerequisite/consistency review.
- **Research**: One read-only subagent, explicitly requested by speckit-plan, reviewed
  admission/work lifetime, CSP/privacy and primary maintainer dependency patch sources.
  No runtime implementation was delegated.
- **Decisions**: Keep local-only/no accounts/database, solveLevel only, exact proof/Play,
  delayed advice and failover budgets. Shared policy: one generation/one advice, two total,
  five admitted AI jobs per rolling minute. Count draining underlying work, not just HTTP
  promises. Fakes replace SDK/time, not application security controls.
- **Actual checks**: Node24.14.0/npm11.12.1; typechecks passed;29 files/305 unit tests passed;
  build passed;29 browser tests passed. Audit exited1 with4 vulnerabilities (2 moderate,
  2 high). npm ci and Chromium installation were not rerun. Details/patch sources are
  in EVIDENCE_W08 and feature009 research.
- **Limits**: Targeted dependency repair is the first implementation prerequisite. No
  runtime source/dependency edit or new T00-T17 execution occurred in planning; those
  results remain NOT RUN. No live call, real key/.env inspection, commit/push/merge/deploy.
  User approval is not recorded as student-pair review or invented individual contribution.

## Week08 Secure the Arcade — implementation and verification — 2026-10-27

- **Authorization and checkout**: The user approved all 34 Week08 tasks on codex/ai-level-generator-feature in C:/Users/AleksA/.codex/worktrees/feature-007-generator-publish/Rush hour crossing. HEAD stayed 06ff2534aa4e28abf65c3822d5f6695f3855103d. Existing user changes in AGENTS.md, README.md, docs/AI_USAGE_LOG.md, docs/CONTEXT_MANIFEST.md, docs/EVIDENCE_W08.md and specs/009 were preserved and updated only for the requested task. No commit, push, merge or deployment occurred.
- **Workflow**: Read the code-free implementation guide and its complete source order, then used the local speckit-implement skill checklist. Reproduced the four-finding dependency audit before runtime work. Updated only the approved compatible Vite/Vitest/Zod ranges and lockfile; did not use audit fix --force.
- **Security decisions**: Kept browser Origin absent-compatible for local clients and exact when supplied; fixed Vite to loopback port5173. Applied the enforcing CSP only to built/static responses, preserving API-only/dev behavior and existing headers. Admission checks capacity before the shared five-per-minute limit and counts real provider/solver promises through late settlement. Existing provider, solver, generator, advice-delay and failover budgets remain unchanged. The advice adapter checks 2,048 UTF-8 bytes before parsing, HTTP/browser consumption is bounded at 4,096 bytes, generator output remains bounded at 8,192 bytes, and compact evidence is schema-projected/measured under 4,096 bytes. Dynamic output keeps textContent; no sanitizer or rich-text renderer was added.
- **Event/privacy choices**: Projected exactly eight fixed event fields with closed reason enums, UTC timestamp, safe server-owned correlation IDs, actual provider/solver counters, max32 events/job and process-local last128 ring. Sinks receive only the projection and cannot break service flow. Synthetic sentinel tests cover the injected SDK factory, adapter errors, tool names, contexts, HTTP, events and built assets. Newline-bearing tool names remain unknown and cannot create a forged event.
- **Fixture/authority choices**: Security harness constructs the real handler, schemas, services, dispatch, admission and local solver with injected fake SDK transport and synthetic configuration. It never loads server environment, reads real credentials/.env, creates a real SDK client or performs live calls. Browser tests use production controls/build and verify advice delay, text rendering, verified preview and explicit Play. No production fake-provider mode or diagnostics route was added.
- **Observed operational correction**: The patch helper once resolved to the original checkout despite the requested workdir and placed the bounded-output hunks there. Those exact hunks were removed after detection; existing local work was preserved. All later edits and checks used the explicit requested worktree. The older conflicted checkout was not used.
- **Final checks**: npm ci installed85 packages/audited86 with0 vulnerabilities; typecheck passed; test:run passed38 files/382 tests; build passed119 modules; high-severity audit passed with0 findings; Chromium1243/headless shell were present; test:security passed23 files/249 unit/integration tests plus8/8 browser tests; test:e2e passed29 tests with GEMINI_API_KEY empty and AI_FAILOVER_ENABLED=false. One earlier security aggregate run exposed a T05 test synchronization race; the fixture now waits for the first delayed advice response and the final aggregate passed.
- **Assignment integrity**: The assignment requires each student to contribute one protection and one negative test. No individual contribution was supplied or observed; names and contributions remain pending and are not invented. No live quota was used.


## Follow-up live Gemini API smoke test — 2026-10-27

- **Authorization**: The user selected the real Gemini API option and acknowledged that it may use quota.
- **Execution**: Started the actual local application/API on loopback port 18787 with failover set to false. Sent one synthetic valid completed-run summary to `POST /api/advice` with the exact allowed Origin.
- **Result**: HTTP 503 `ADVICE_UNAVAILABLE`. The fixed security-event projection recorded one provider attempt and terminal reason `PROVIDER_UNAVAILABLE`; it does not reveal whether an outbound Gemini request reached the provider. No successful live response is claimed.
- **Scope decision**: Did not send the generator request after the advice provider path failed, avoiding further quota while availability was unclear. The server was stopped. No credential values or `.env` contents were inspected or printed; no backup attempt or live failover was used.

- **Cause diagnosis**: The user asked why the live smoke test was unverified. One bounded follow-up request used the same real handler/service and primary Gemini adapter with failover disabled, adding a temporary wrapper that logged only safe category and transport status/count. It returned `ADVICE_UNAVAILABLE` with `provider_failure_category=configuration` and `transport_attempts=0`. The adapter source rejects an absent/empty API key before SDK construction, and the installed SDK uses global fetch for HTTP. Therefore the worktree server process had no usable `GEMINI_API_KEY`; no outbound Gemini HTTP request occurred. This is runtime configuration, not an observed provider rejection.
- **Cleanup and limit**: Removed the temporary diagnostic source and stopped the server. No generation call was made. No credential value, request URL/body, provider response body or `.env` content was inspected or printed. A live success can be retested after the user configures the key privately for this worktree's server process.


## Retry after user reported key setup - 2026-10-27

- **Execution**: Restarted the actual server on loopback with failover disabled and sent one synthetic advice request. It again returned `ADVICE_UNAVAILABLE`. Checked only for `.env` file presence in the selected worktree root; result was absent. No file contents were read.
- **Diagnosis**: A sanitized request using the real handler/service/provider again reported category `configuration`, with zero SDK transport calls. The key still does not reach this worktree's server process, so Gemini was not contacted. Likely the `.env` was created in a different checkout/path; the server reads `.env` relative to its working directory.
- **Cleanup**: No generation request was sent. Stopped the server and removed the temporary wrapper. Credential values and `.env` contents remain uninspected.


## Successful live API retry - 2026-10-27

- **Configuration check**: `.env` now exists at the selected worktree root; only file presence was checked, and Git confirms `.env` is ignored. No contents were read.
- **Live API results**: With failover disabled, advice returned HTTP 200 with schema-valid output (focus `general`, nextTip length 138; text not printed). Generation returned a completed generated preview with `verified=true` and matching difficulty. The real solver reported 6 first-crossing moves, 69 explored states and 226 action evaluations; server counters showed 3 provider attempts and 3 solver calls.
- **Transient result**: The first normal advice retry returned 503 after two provider attempts, but a subsequent sanitized request returned provider HTTP 200 and a valid tip; a later normal advice request also returned HTTP 200. The cause of that individual earlier 503 was not exposed.
- **Boundaries**: All inputs were synthetic. No failover or UI Play action was used. The preview remains unplayed pending the application's explicit Play control. Stopped the server and removed the temporary wrapper; never inspected or printed credentials or `.env` contents.

## Week08 independent implementation review - 2026-10-27

- User requested a review, fresh tests and comparison with the accepted implementation plan.
- Codex used the code-review skill and read the actual implementation, contracts, tests and
  evidence on codex/ai-level-generator-feature. No runtime implementation was delegated.
- Fresh clean install, both typechecks,382 unit tests, production build, zero-vulnerability
  audit,249 security/server unit tests,8 security browser tests and29 existing browser
  tests passed. Detailed results are in EVIDENCE_W08 section14.
- One fake-backed production-handler probe confirmed incomplete fallback previews are
  incorrectly logged as completed generation. Review also found the required independent
  cumulative-deadline test missing despite T12/T019 being marked complete.
- Runtime source/tests were preserved; only this log and the existing evidence record were
  appended with review results. No real key/.env content was inspected, no new live
  provider call was made, and no commit/push/merge/deployment occurred.

## Week08 review corrections - 2026-10-27

- User authorized correcting the two implementation-review findings. Codex used the
  existing speckit-implement workflow on codex/ai-level-generator-feature; all13 checklist
  entries passed, local prerequisites selected009, and no extension hooks were registered.
- Wrote three actual-HTTP fallback-event regressions before source changes. They failed
 3/7 with the observed completed/COMPLETED bug. One guard change in server/app.ts made the
  same7 tests pass while retaining verified previews, counters and original stop reasons.
- Added six cumulative timing/final-verification/late-proof cases for disabled/enabled
  failover. New assertions/eval expectations preceded their first run. Each provider
  attempt stays below its clipped timeout; real solver work crosses the40s decision
  cutoff or completes inside the modeled42s bound. An explicitly late final-tool proof
  at45s is rejected. No production timing limit or service/solver logic was changed.
- Fresh clean install, both typechecks,391 unit tests,production build,zero-vulnerability
  audit,258 security/server unit tests,8 security browser tests and29 existing browser
  tests passed. Actual claim/signal/change/result is in EVIDENCE_W08 Section15.
- No subagents, real-key/.env inspection, live provider call, commit,push,merge or deployment.
  Pre-existing user changes and other worktrees were preserved.

## Week08 GitHub publication authorization - 2026-10-27

- User requested committing the completed feature on GitHub, authorizing commit and push
  on the existing codex/ai-level-generator-feature branch. No main merge/deploy requested.
- Codex repeated all pre-commit gates: clean install,typechecks,391 unit tests,production
  build,zero-vulnerability audit,258 security/server unit tests,8 security browser tests
  and29 existing browser tests passed.
- Staged48 scoped feature files and scanned staged blobs for credential patterns without
  reading ignored environment files. No matches; builds,reports and environment files
  excluded. Fetched upstream matched the local branch before commit.
- Publication uses a Conventional Commit and normal push, with no force/history rewrite,
  live provider call or changes to the separate original/conflicted worktrees.

## Week08 report verification rerun - 2026-10-27

- User requested fresh tests and accurate result updates in Aleksa's and Igor's draft
  weekly reports. Codex ran checks on feature branch HEAD779cd39 without runtime changes.
- npm ci, both TypeScript checks,391 unit tests,zero-vulnerability audit,production build,
  the258-test security/server subset,8 security browser tests and29 existing browser tests
  all passed. The report drafts now label these as fresh Codex-run results, with the258
  subset explicitly distinguished from the391 total.
- Browser security tests used existing fakes and the real solver. Existing browser
  regressions inherited explicitly empty GEMINI_API_KEY and disabled failover from a
  Node spawn wrapper. No secret-file inspection or live provider call occurred.
- Recorded actual results in EVIDENCE_W08 Section17. No student authorship, learning or
  personal execution was inferred from these runs. Reports remain drafts; no commit,
  push, merge, deployment or changes to other worktrees were made.

## Feature010 security-fix planning - 2026-10-28

- User requested plans only for a cumulative shared provider-attempt allowance and bounded
  streamed generation responses, plus a separate manual Gemini account-control checklist.
  Application/test implementation, commit, push, merge, deploy and live calls are prohibited.
- Codex inspected the explicit generator worktree/branch, HEAD779cd397b4797a551607c69169f96d88b586e835,
  local refs and live read-only remote refs. Target has not advanced from the reviewed SHA.
  Original dirty main was not used as a baseline; prior edits in this log/evidence remain.
- Used local Spec Kit specify -> plan -> tasks, selecting new010 after scanning001-009.
  Local ignored feature metadata changes to010; Git stays codex/ai-level-generator-feature.
  The plan skill explicitly dispatched one research agent for official Google controls;
  Codex checked the linked official pages and consolidated the manual checklist.
- Proposed60 cumulative attempts per serving process; owner approval still pending.
  Process-restart reset is explicit and pending owner acceptance; no dollar-cap claim.
  Proposed start-gate design aligns actual counters/events before classifying denial;
  browser fix stays local to generator client. No runtime or test source was changed.
- Fresh checks passed: npm ci, both typechecks,391 unit tests, build,0-vulnerability audit,
  security subset258 units plus8 browser cases, and29 existing browser cases. One e2e
  invocation failed startup while security occupied4173; serial rerun passed. No new010
  regression/eval was executed. Chromium was already available; install was not rerun.
- Created specs/010-ai-resource-bounds with specification, plan,20 unchecked future tasks,
  fixed regression expectations, handoff, contracts, research, baseline and manual account
  checklist. Account state remains unverified. Document/link/task checks and git diff
  --check passed. Read-only Spec Kit analysis follows task generation in this session.
- No credential/.env content inspection, provider call, account-setting change or publication.
  Existing warnings were informational. Student authorship/contributions are not inferred.

## Feature010 owner policy approval - 2026-10-28

- Owner response: "1. 60 attempts per server process 2. accepted 3. approved".
- Recorded P1=60 cumulative attempts shared by generation/advice per serving process;
  P2=restart/watch restart/crash reset with independent allowances in other processes;
  P3=existing busy/rate precedence, safe unavailability, verified generator fallback and
  delayed advice behavior. Browser reload never refills the process allowance.
- Updated the010 planning package consistently and qualified initial503 acceptance as
  applying to otherwise admissible requests. Corrected quickstart's pre-change probe
  reference to B00, matching tasks/handoff; small-limit B01 follows budget API support.
- Policy approval does not start implementation. All20 future tasks remain unchecked;
  new regression expectations remain NOT RUN and Google account facts unverified.
- Documentation/evidence only; no runtime/test/dependency changes, provider call,
  credential inspection, account setting, commit/push/merge/deploy or branch change.
  The initial baseline observations remain historical, not newly executed checks.

## Feature010 local implementation and verification - 2026-10-28

- The owner explicitly authorized only the cumulative provider-start allowance and bounded
  generator response reader on the existing feature branch. I rechecked HEAD, remote refs
  and dirty status, preserved the uncommitted010 documents and existing evidence/log edits,
  and kept the original project directory out of the implementation baseline.
- Followed the local `speckit-implement` task order after selecting010 in local metadata.
  Established a fresh fake-only baseline, then wrote and ran B00/S03 before runtime edits:
  B00 measured63 starts against the approved60 and S03 consumed131,072 bytes.
- Implemented one immutable shared process budget at the provider lease boundary and a
  private bounded generator stream reader. The principal decisions were to keep charging
  tied to the actual invocation thunk, align counters/events inside that authorized thunk,
  leave solver starts independent, preserve exhaustion as a non-provider error, and avoid
  awaiting stream cancellation acknowledgements.
- Added synthetic small-limit HTTP/service/phase tests and controlled browser-stream tests.
  A final gate found an enabled-backup timeout calculation could produce
  7,000.000000000001ms; rounded the remaining timeout down to whole milliseconds so it
  cannot exceed the documented cap. No provider/profile/dependency or account setting was
  changed.
- Final measured results are in `docs/EVIDENCE_W08.md` Section20:421 unit tests,274 security
  tests,9 security browser tests,30 regular browser tests, typechecks/build/audit all passed.
  Browser suites ran serially; test-launching environments had an explicitly empty real key
  and disabled failover. No live provider call, credential inspection, account-setting
  change, commit, push, merge or deployment occurred. Google M1-M7 remain unverified.

## Week08 report review of the latest fixes - 2026-10-28

- The user requested verification of the latest fixes and clarified the existing Desktop
  Week08 report as the destination. Codex used code-review and student-weekly-report
  instructions, inspected the explicit generator worktree and Feature010 contract/diff,
  and reran the existing offline checks. No application or test behavior was changed.
- Review confirmed the two narrow runtime fixes against the actual suites: shared
  60-start process allowance and bounded16,384-byte retained generator response.
  The first unit run failed420/421 because an advice backup test requires exactly7,000ms
  with a real clock, while the policy supplied6,999ms. The focused19-test and unchanged
  full421-test reruns passed; this remains a test-stability finding, not a resolved defect.
- Clean install, both typechecks, build, zero-finding audit,274 security/server unit tests,
  9 security browser tests and30 ordinary browser tests passed. Exact outcomes and limits
  are appended in EVIDENCE_W08 Section21. Browser suites ran serially with explicit empty
  provider credentials in child environments and disabled failover; no live calls.
- Updated only report/evidence/AI-use prose. The report remains NACRT and retains the
  learner's supplied personal contribution; no new human authorship/manual verification
  was invented. Manual account review and publication/main delivery remain pending.
  No credentials read, account changes, commits, pushes, merges or deployments.

## Authorized publication of the resource fixes - 2026-10-28

- The user explicitly authorized pushing the latest fixes to GitHub. Codex fetched origin
  and confirmed the existing feature branch matched remote779cd397 before publication.
  The original main checkout and all unrelated work were preserved.
- Used the debugging workflow for the previously observed timing-sensitive assertion:
  injected the existing constant-clock seam into one advice-service test while retaining
  its exact timeout assertion and all production code/limits. Focused32 tests passed.
- Fresh pre-commit install, typechecks,421 unit tests, build, zero-finding audit,274
  security/server tests,9 security browsers and30 ordinary browsers passed. Section22
  of EVIDENCE_W08 records the actual outputs and offline execution boundaries.
- Publication scope is one normal commit and push of the reviewed Feature010 code,
  tests, specifications and evidence to codex/ai-level-generator-feature. The Desktop
  report stays outside Git and will receive the actual publication reference afterward.
  No main merge, deployment, live provider call, credential inspection or account change
  is authorized by this request; manual account checks remain pending.

## Authorized W08 integration into main - 2026-10-28

- The user explicitly requested merging W08 into main after supplying the 90/100 review.
  Codex fetched remote refs and confirmed reviewed feature HEAD `06f61a9` and main
  `ff569d6`. This new request authorizes the normal main merge/push.
- Used a separate clean integration worktree because both existing working directories
  had unrelated uncommitted work. The conflict-free merge tree exactly matched the
  published feature before the two handoff entries; no runtime or test code was edited.
- Fresh clean install, typechecks, 421 full-suite tests, build, zero-finding audit,
  Chromium install, 274 security/server tests, 9 security browser tests and 30 E2E tests
  passed without retries. Browser suites ran serially with an explicitly empty real
  provider key and disabled failover. Actual results are in EVIDENCE_W08 Section 23.
- The merge commit containing these entries is the handoff reference for main. Existing
  local edits and the baseline tag were preserved. No live provider call, credential
  inspection, account change or deployment occurred. M1-M7 and individual report/demo
  completion remain pending; the merge does not imply those human checks were performed.
