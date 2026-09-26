# Codex Prompts — 003 Review Fixes

Copy one prompt per Codex session, in order. Start a **new** session for each prompt so the model's context stays small. After each session, check the result yourself before sending the next prompt (see "Student check" under each prompt).

Every prompt starts with the block the assignment requires.

---

## Prompt 0 — Read and confirm (no changes)

```text
Pre implementacije:
1. Sažmi razumevanje zadatka.
2. Navedi plan u nekoliko koraka.
3. Navedi nejasnoće ili pretpostavke.
4. Ne proširuj scope bez eksplicitnog razloga.

Role: You are a coding agent in the Rush Hour Crossing repository. In this session you only READ. Do not edit, create, delete, stage, or commit any file. Do not run npm install.

Read, in this order: AGENTS.md, .specify/memory/constitution.md, docs/GAME_SPEC.md, specs/003-review-fixes/spec.md, specs/003-review-fixes/plan.md, specs/003-review-fixes/tasks.md, specs/003-review-fixes/implementation-guide.md.

Then answer:
1. Which branch must all work happen on, and which git commands are forbidden?
2. Which single file in src/ is allowed to change, and exactly which lines change in US1 and US2?
3. How many unit tests must fail in T006 and in T013, and with which names?
4. What is CODE_SHA and why do the evidence documents name it?
5. List any contradiction you find between these files. If there is none, say "none".

Stop after answering.
```

**Student check**: answers must be: branch `003-review-fixes`; forbidden include checkout main, merge, push, `git add -A`; only `src/config/presets.ts`; 2 failures (T006) and 3 failures (T013) with the names in `tasks.md`; CODE_SHA = the C3 commit.

---

## Prompt 1 — Setup and User Story 1 (tasks T001–T009)

```text
Pre implementacije:
1. Sažmi razumevanje zadatka.
2. Navedi plan u nekoliko koraka.
3. Navedi nejasnoće ili pretpostavke.
4. Ne proširuj scope bez eksplicitnog razloga.

Role: You are a coding agent in the Rush Hour Crossing repository. You implement tasks T001 to T009 from specs/003-review-fixes/tasks.md and nothing else.

Sources, in priority order: specs/003-review-fixes/tasks.md (what to do, hard rules), specs/003-review-fixes/implementation-guide.md (exact content: sections §0, §1, §US1-A to §US1-G), AGENTS.md, .specify/memory/constitution.md. Do not use other sources or your memory of the project.

Rules:
- Work on branch 003-review-fixes only. Never checkout main, merge, rebase, push, tag, amend, or reset.
- Copy code blocks from the guide exactly. Do not reformat, rename, reorder, or "improve" them.
- Stage files only by explicit path. Never stage docs/WEEK_03_REPORT_ALEKSA_DURUTOVIC.md.
- Record real command output in specs/003-review-fixes/run-log.md. Never write a number you did not see in output.
- If any output differs from the "Expected" text in the guide, stop immediately, record the actual output, and report. Do not try another fix.
- T006 MUST show exactly 2 failing tests before you touch src/config/presets.ts. If it does not, stop.

Finish with: the list of completed task IDs, the T006 failing summary, the T008 passing summary, and C1_SHA. Then stop.
```

**Student check**: `git log --oneline -2` shows the C1 commit on top of the spec commit; `git show --stat HEAD` lists only the five allowed files; `git diff HEAD~1 -- src/config/presets.ts` shows exactly one changed line.

---

## Prompt 2 — User Story 2 (tasks T010–T016)

```text
Pre implementacije:
1. Sažmi razumevanje zadatka.
2. Navedi plan u nekoliko koraka.
3. Navedi nejasnoće ili pretpostavke.
4. Ne proširuj scope bez eksplicitnog razloga.

Role: You are a coding agent in the Rush Hour Crossing repository. You implement tasks T010 to T016 from specs/003-review-fixes/tasks.md and nothing else. Tasks T001–T009 are already done and committed.

Sources, in priority order: specs/003-review-fixes/tasks.md, specs/003-review-fixes/implementation-guide.md (sections §US2-A to §US2-F), specs/003-review-fixes/run-log.md, AGENTS.md.

Rules:
- Same hard rules as tasks.md: branch 003-review-fixes only, no merge/push, explicit git add paths, copy code exactly, record real output, stop on any mismatch.
- T013 MUST show exactly 3 failing tests (all about hard) before you touch src/config/presets.ts.
- In T014 change exactly four lines in the hard block. The hard row-3 line lane(3, 'right', 2, 2, [0, 3, 6]) must NOT change.

Finish with: completed task IDs, the T013 failing summary, the T015 passing summary, and C2_SHA. Then stop.
```

**Student check**: `git diff HEAD~1 -- src/config/presets.ts` shows exactly four changed lines, all in `hard:`; tests 57/57.

---

## Prompt 3 — User Story 3, browser smoke test (tasks T017–T028)

```text
Pre implementacije:
1. Sažmi razumevanje zadatka.
2. Navedi plan u nekoliko koraka.
3. Navedi nejasnoće ili pretpostavke.
4. Ne proširuj scope bez eksplicitnog razloga.

Role: You are a coding agent in the Rush Hour Crossing repository. You implement tasks T017 to T028 from specs/003-review-fixes/tasks.md and nothing else. Tasks T001–T016 are done.

Sources, in priority order: specs/003-review-fixes/tasks.md, specs/003-review-fixes/implementation-guide.md (sections §US3-A to §US3-K), specs/003-review-fixes/contracts/browser-smoke.md, specs/003-review-fixes/run-log.md, AGENTS.md.

Rules:
- Same hard rules as tasks.md.
- Install exactly @playwright/test@^1.63.0 as a dev dependency. Add no other package (no @types/node, no jsdom).
- Use Playwright's bundled Chromium (npx playwright install chromium). Do not set a browser "channel". If the download fails, stop and report.
- Do NOT run npm run evidence:screenshots in this session. docs/evidence/ must stay unchanged.
- Never edit anything in src/ to make a browser test pass. If a smoke test fails, stop and report the title and error.
- Browser test files end in .pw.ts. Do not rename them to .spec.ts or .test.ts.

Finish with: completed task IDs, the ten test titles from npm run test:e2e with their status, the Vitest summary, and CODE_SHA. Then stop.
```

**Student check**: `npm run test:e2e` → 10 passed on your machine; `git show --stat HEAD` lists only the nine allowed files; `docs/evidence/` unchanged.

---

## Prompt 4 — Evidence images (tasks T029–T032)

```text
Pre implementacije:
1. Sažmi razumevanje zadatka.
2. Navedi plan u nekoliko koraka.
3. Navedi nejasnoće ili pretpostavke.
4. Ne proširuj scope bez eksplicitnog razloga.

Role: You are a coding agent in the Rush Hour Crossing repository. You implement tasks T029 to T032 from specs/003-review-fixes/tasks.md and nothing else. All code is final (CODE_SHA is in specs/003-review-fixes/run-log.md).

Sources: specs/003-review-fixes/tasks.md, specs/003-review-fixes/implementation-guide.md (sections §US4-A to §US4-D), specs/003-review-fixes/run-log.md.

Rules:
- Same hard rules as tasks.md. Do not change any file in src/, tests/, e2e/, or any config file.
- Never touch docs/evidence/baseline-active-normal.png.
- T031 is a question to the student. Ask the four questions from §US4-C exactly and WAIT for the answer. Do not commit before all four answers are "yes".

Finish with: the recorded current-state results, the list of changed PNG files, the student's answers, and the C4 commit SHA. Then stop.
```

**Student check**: open the three images yourself before answering; confirm with your partner (question 4).

---

## Prompt 5 — Documentation, evidence, handover (tasks T033–T045)

```text
Pre implementacije:
1. Sažmi razumevanje zadatka.
2. Navedi plan u nekoliko koraka.
3. Navedi nejasnoće ili pretpostavke.
4. Ne proširuj scope bez eksplicitnog razloga.

Role: You are a coding agent in the Rush Hour Crossing repository. You implement tasks T033 to T045 from specs/003-review-fixes/tasks.md and nothing else. Code and images are final.

Sources, in priority order: specs/003-review-fixes/tasks.md, specs/003-review-fixes/implementation-guide.md (sections §US4-E to §US4-N and §5), specs/003-review-fixes/run-log.md (the ONLY source of numbers, SHAs, versions, dates), the current content of each file you edit.

Rules:
- Same hard rules as tasks.md. Only the files listed as allowed in Phase 6 may change.
- Every {{PLACEHOLDER}} must be replaced with a value from run-log.md. If a value is missing there, stop and ask; never guess.
- Keep docs/GAME_SPEC.md in Serbian. Keep all other documents in English.
- Do not rewrite historical text: Part 2 of docs/EVIDENCE_003.md and older eval results stay as they are, except for the exact edits in the guide.
- Make exactly two commits in this session: C5 (T036) and C6 (T044), with the messages from the guide.
- Do not merge into main and do not push. End with the report from §5 and stop.
```

**Student check**: read the diff of C5 and C6 (`git show HEAD~1`, `git show HEAD`); run `git grep -n "{{" -- docs README.md AGENTS.md security.md` → nothing; then decide yourself whether to merge `003-review-fixes` into `main`.

---

## After Prompt 5 (student only)

Merging is your decision and is outside the agent's tasks. When ready:

```bash
git switch main
git merge --ff-only 003-review-fixes
```

Push only when you want the reviewer to see it. The reviewer reads `main`.
