# AI Usage Log — Session 003

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
- **Verification signal**: A clean `npm ci`, typecheck, 7 files / 46 tests, build, and audit (0 vulnerabilities) pass. Scripted browser checks and screenshots were taken from code at `d42607f`, and the baseline board was re-captured from tag `s003-baseline-v1`.
