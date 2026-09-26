# Tasks: Third-Review Corrections

**Input**: Design documents from `specs/003-review-fixes/`

**Prerequisites**: `spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`, **`implementation-guide.md` (exact content for every task)**

**Tests**: Required by the constitution (principle VI) and requested by the reviewer. Test tasks precede the change they guard, and their failure is observed and recorded before the change.

**Execution rule**: Work strictly in order, one task at a time. No `[P]` markers: the assignment forbids parallel agents. Every task names the section of `implementation-guide.md` (§) that contains its exact content. Do not write code or text that is not in the guide.

## Hard rules for every task

1. Stay on branch `003-review-fixes`. Never run `git checkout main`, `git merge`, `git rebase`, `git push`, `git tag`, `git reset --hard`, or `git commit --amend`.
2. Stage files only by explicit path (`git add path/one path/two`). Never `git add -A`, `git add .`, or `git commit -a`. The untracked file `docs/WEEK_03_REPORT_ALEKSA_DURUTOVIC.md` belongs to the student and must never be staged, edited, or deleted.
3. Allowed files per phase are listed in each phase header. If `git status --short` shows any other modified file, stop and report.
4. Every command result you write down must be copied from real output. If a command's output differs from the "Expected" line, **stop**, write the actual output into `specs/003-review-fixes/run-log.md`, and report to the student. Do not try a different fix.
5. Never change `src/game/`, `src/input/`, `src/render/`, `src/main.ts`, `src/config/game-config.ts`, `src/style.css`, `index.html`, `docs/evidence/baseline-active-normal.png`, `docs/ASSIGNMENT.md`, `docs/BUILD_PROMPT_V1.md`, or the tag `s003-baseline-v1`.

---

## Phase 1: Setup

**Allowed files**: `specs/003-review-fixes/run-log.md`

- [ ] T001 Verify the starting point: `git branch --show-current` prints `003-review-fixes`; `git log --oneline -1` shows the commit `docs(spec): add 003 review-fixes specification`; `git status --short` shows only `?? docs/WEEK_03_REPORT_ALEKSA_DURUTOVIC.md`. See §0.
- [ ] T002 Create `specs/003-review-fixes/run-log.md` from the template in §1 and fill the "Environment" block with real `node -v`, `npm -v`, `git rev-parse --short HEAD` output.
- [ ] T003 Run `npm ci`, `npm run typecheck`, `npm run test:run`, `npm run build` and record exit codes and key lines under "Before any change" in `specs/003-review-fixes/run-log.md`. Expected: all exit 0; `Tests  43 passed (43)`. See §1.

---

## Phase 2: Foundational

No foundational task. The shared golden-path fixture is created inside User Story 1 because US1 is the first story that uses it.

---

## Phase 3: User Story 1 — Normal traffic reads correctly and stays winnable (P1) 🎯 MVP

**Goal**: Normal row 4 has no overlapping vehicles and the normal preset is still won in 11 actions.

**Independent Test**: `npm run test:run` shows 52 passing tests; the two new US1 tests failed before T007.

**Allowed files**: `tests/presets.test.ts`, `tests/fixtures/golden-paths.ts`, `tests/reachability.test.ts`, `src/config/presets.ts`, `specs/003-review-fixes/run-log.md`

### Tests for User Story 1 (write first, observe failure)

- [ ] T004 [US1] Replace the whole content of `tests/presets.test.ts` with §US1-A (adds the test `%s never places two vehicles of one lane on the same cell through tick 199`).
- [ ] T005 [US1] Create `tests/fixtures/golden-paths.ts` with §US1-B and replace the whole content of `tests/reachability.test.ts` with §US1-C.
- [ ] T006 [US1] Run `npm run typecheck` (expected exit 0) and `npm run test:run`. Expected: `Tests  2 failed | 50 passed (52)`, and the two failing names are exactly `normal never places two vehicles of one lane on the same cell through tick 199` and `the recorded winning path wins normal`. Copy the summary and the two failing names into `run-log.md` under "US1 — failing before change". See §US1-D.

### Implementation for User Story 1

- [ ] T007 [US1] In `src/config/presets.ts`, change only the normal row-4 line from `lane(4, 'left', 2, 2, [0, 4, 8]),` to `lane(4, 'left', 2, 2, [0, 4]),`. See §US1-E.
- [ ] T008 [US1] Run `npm run typecheck`, `npm run test:run`, `npm run build`. Expected: exit 0; `Test Files  7 passed (7)`; `Tests  52 passed (52)`. Record under "US1 — after change" in `run-log.md`. See §US1-F.
- [ ] T009 [US1] Check `git diff --stat` lists only the allowed files, then commit exactly as in §US1-G (message `fix(presets): remove the overlapping vehicle in normal row 4`).

**Checkpoint**: Normal row 4 fixed and committed (C1). The game is releasable at this point.

---

## Phase 4: User Story 2 — Hard difficulty can be won (P1)

**Goal**: Hard is winnable in 15 actions and still the hardest preset.

**Independent Test**: `npm run test:run` shows 57 passing tests; three hard tests failed before T014.

**Allowed files**: `tests/fixtures/golden-paths.ts`, `tests/reachability.test.ts`, `src/config/presets.ts`, `specs/003-review-fixes/run-log.md`

### Tests for User Story 2 (write first, observe failure)

- [ ] T010 [US2] Replace the whole content of `tests/fixtures/golden-paths.ts` with §US2-A (widens the type to `Difficulty` and adds `hard`).
- [ ] T011 [US2] Replace the whole content of `tests/reachability.test.ts` with §US2-B (covers all three presets and adds `orders presets by the fewest actions needed for a safe win`).
- [ ] T012 [US2] Run `npm run typecheck`. Expected: exit 0.
- [ ] T013 [US2] Run `npm run test:run`. Expected: `Tests  3 failed | 54 passed (57)`, failing names exactly `hard can be won without losing a life`, `the recorded winning path wins hard`, `the recorded losing path loses hard`. Record under "US2 — failing before change". See §US2-C.

### Implementation for User Story 2

- [ ] T014 [US2] In `src/config/presets.ts`, change only the four hard lines for rows 1, 2, 4, 5 exactly as in §US2-D. Row 3 and the easy and normal presets stay unchanged.
- [ ] T015 [US2] Run `npm run typecheck`, `npm run test:run`, `npm run build`. Expected: exit 0; `Tests  57 passed (57)`. Record under "US2 — after change". See §US2-E.
- [ ] T016 [US2] Check `git diff --stat`, then commit exactly as in §US2-F (message `fix(presets): make the hard preset winnable`).

**Checkpoint**: All three presets winnable, none overlapping (C2).

---

## Phase 5: User Story 3 — Automated browser smoke test (P2)

**Goal**: `npm run test:e2e` proves startup, focus, config fallback, and win/loss lock + restart for all presets in a real browser.

**Independent Test**: `npm run test:e2e` → `10 passed`.

**Allowed files**: `package.json`, `package-lock.json`, `tsconfig.json`, `.gitignore`, `playwright.config.ts`, `e2e/support.ts`, `e2e/smoke.pw.ts`, `e2e/evidence.pw.ts`, `specs/003-review-fixes/run-log.md`

- [ ] T017 [US3] Run `npm install --save-dev @playwright/test@^1.63.0`. Expected: exit 0, `found 0 vulnerabilities`, `package.json` devDependencies now contains `"@playwright/test": "^1.63.0"`. Record the output. See §US3-A.
- [ ] T018 [US3] Run `npx playwright install chromium` once. Expected: exit 0. If it fails (no network, proxy, disk), stop and report; do not switch to another browser or `channel`. See §US3-B.
- [ ] T019 [US3] Add the two npm scripts with the exact commands in §US3-C (`test:e2e`, `evidence:screenshots`) to `package.json`.
- [ ] T020 [US3] In `tsconfig.json`, change `"include": ["src", "tests"]` to `"include": ["src", "tests", "e2e", "playwright.config.ts"]`. See §US3-D.
- [ ] T021 [US3] Append the four Playwright output folders from §US3-E to `.gitignore`.
- [ ] T022 [US3] Create `playwright.config.ts` with the exact content of §US3-F.
- [ ] T023 [US3] Create `e2e/support.ts` with the exact content of §US3-G.
- [ ] T024 [US3] Create `e2e/smoke.pw.ts` with the exact content of §US3-H.
- [ ] T025 [US3] Create `e2e/evidence.pw.ts` with the exact content of §US3-I. Do **not** run it in this phase.
- [ ] T026 [US3] Run `npm run typecheck` (exit 0), `npm run test:run` (`Test Files  7 passed (7)`, `Tests  57 passed (57)` — proves Vitest ignores `e2e/`), `npm run build` (exit 0). Record. See §US3-J.
- [ ] T027 [US3] Run `npm run test:e2e`. Expected: `10 passed`. Record the full list of 10 test lines. If any test fails, stop and report the failing title and error text; do not edit `src/`. See §US3-J.
- [ ] T028 [US3] Run `git status --short`: `docs/evidence/` must show no change and `test-results/` must not appear. Commit exactly as in §US3-K (message `test(e2e): add a Playwright browser smoke test`). Write the short SHA of this commit into `run-log.md` as **CODE_SHA**. This is commit C3.

**Checkpoint**: All code is final. From here on, only documentation and images change.

---

## Phase 6: User Story 4 — Documentation and evidence match the code (P3)

**Goal**: Every current statement describes CODE_SHA.

**Independent Test**: §US4-M checks pass (no `{{` placeholder left, no stale claim, all checks green).

**Allowed files**: `docs/evidence/*.png` (except `baseline-active-normal.png`), `docs/GAME_SPEC.md`, `.specify/memory/constitution.md`, `docs/AI_USAGE_LOG.md`, `docs/EVALS.md`, `docs/EVIDENCE_003.md`, `security.md`, `README.md`, `AGENTS.md`, `docs/CONTEXT_MANIFEST.md`, `specs/003-review-fixes/run-log.md`, `specs/003-review-fixes/tasks.md` (checkboxes only), `specs/003-review-fixes/spec.md` (status line only, §US4-L3)

### Current-state measurement on CODE_SHA

- [ ] T029 [US4] With HEAD at CODE_SHA and no uncommitted change, run the full sequence in §US4-A (`npm ci`, `npm run typecheck`, `npm run test:run`, `npm run build`, `npm audit --audit-level=high`, `npm audit --json` metadata, `npm run test:e2e`, `npx playwright --version`) and record every result under "Current state (CODE_SHA)" in `run-log.md`.
- [ ] T030 [US4] Run `npm run evidence:screenshots`. Expected: `9 passed`; `git status --short docs/evidence` lists 7 modified and 2 new PNG files and never `baseline-active-normal.png`. See §US4-B.
- [ ] T031 [US4] **Stop and ask the student** to open `docs/evidence/active-desktop.png`, `docs/evidence/e4-wrap-normal-tick4.png`, and `docs/evidence/d6-win-hard.png` and confirm the three visual facts listed in §US4-C. Continue only after a clear "yes". Record the answer in `run-log.md`.
- [ ] T032 [US4] Commit the images exactly as in §US4-D (message `docs(evidence): regenerate screenshots from CODE_SHA`, with the real SHA). This is C4.

### Rules and governance (C5)

- [ ] T033 [US4] Amend `.specify/memory/constitution.md` to version 1.1.0 exactly as in §US4-E.
- [ ] T034 [US4] Edit `docs/GAME_SPEC.md` R3, the invariants line, D4, and D6 exactly as in §US4-F. No other line changes.
- [ ] T035 [US4] Append the section in §US4-G to the end of `docs/AI_USAGE_LOG.md`, replacing every `{{…}}` from `run-log.md`.
- [ ] T036 [US4] Commit exactly as in §US4-H (message `docs: record the review fixes in the spec and constitution`). This is C5.

### Evidence and supporting documents (C6)

- [ ] T037 [US4] Edit `docs/EVALS.md` exactly as in §US4-I: update the header sentence; in each of E1–E4 rename the existing `**Current result:**` label to `**Result on 2026-09-23 (code at `26ae68b`):**` without changing its text, and add a new `**Current result:**` paragraph directly below it. Do not change any existing expectation or the text of any historical result.
- [ ] T038 [US4] Replace Part 1 of `docs/EVIDENCE_003.md` (from the line `# Part 1 — Current state` up to, not including, the `---` line before `# Part 2`) and the top intro paragraph with §US4-J, filling every `{{…}}` from `run-log.md`.
- [ ] T039 [US4] In Part 2 of `docs/EVIDENCE_003.md`, insert the section from §US4-K before `## Git preservation`, add the rows from §US4-K to the Git preservation table, and add the contribution block from §US4-K.
- [ ] T040 [US4] Edit `security.md` exactly as in §US4-L1.
- [ ] T041 [US4] Edit `README.md` exactly as in §US4-L2.
- [ ] T042 [US4] Edit `AGENTS.md` and the status line of `specs/003-review-fixes/spec.md` exactly as in §US4-L3.
- [ ] T043 [US4] Edit `docs/CONTEXT_MANIFEST.md` exactly as in §US4-L4.
- [ ] T044 [US4] Run every check in §US4-M (placeholder grep, stale-claim grep, full command sequence). All must match. Tick completed boxes in `specs/003-review-fixes/tasks.md`. Commit exactly as in §US4-N (message `docs: regenerate current evidence and evals from CODE_SHA`). This is C6.

---

## Phase 7: Handover

- [ ] T045 Print `git log --oneline main..003-review-fixes` and `git status --short`, write the final report described in §5, and **stop**. Do not merge into `main` and do not push. The student decides the merge.

---

## Dependencies & Execution Order

- Phase 1 → US1 → US2 → US3 → US4 → Handover. Strictly sequential.
- US2 depends on US1 (it replaces US1's fixture and test file).
- US3 depends on US2 (the smoke test replays the hard golden paths).
- US4 depends on US3 (CODE_SHA must be the final code commit).

## Parallel Opportunities

None by design. The assignment forbids parallel agents for the core task.

## Implementation Strategy

- **MVP**: Phases 1 and 3 (C1) already fix what the reviewer called the most important next step.
- **Incremental delivery**: each of C1, C2, C3 leaves every check green and can be reviewed alone.
- **Stop conditions**: any unexpected output, any file outside the allowed list, any failing check. Report and wait.

## Task count

45 tasks: Setup 3, US1 6, US2 7, US3 12, US4 16, Handover 1.
