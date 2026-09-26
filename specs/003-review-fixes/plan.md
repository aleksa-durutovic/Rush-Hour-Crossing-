# Implementation Plan: Third-Review Corrections

**Branch**: `003-review-fixes` | **Date**: 2026-09-26 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/003-review-fixes/spec.md`

## Summary

Three small code changes and one documentation pass, each test-first and each in its own commit:

1. **US1** — normal row 4 starts `[0, 4, 8]` → `[0, 4]`. New non-overlap test for all presets and reachability tests for easy and normal, including recorded golden paths.
2. **US2** — hard rows 1, 2, 4, 5 each lose one vehicle. Reachability and golden-path tests extended to hard, plus a difficulty-order test.
3. **US3** — Playwright browser smoke test (10 scenarios) and an evidence-capture script (9 screenshots), reusing the golden paths.
4. **US4** — GAME_SPEC, constitution, EVALS, EVIDENCE, AI usage log, README, AGENTS, security, and context manifest updated from one code commit.

Every code step, test, file content, and expected output is spelled out in [implementation-guide.md](implementation-guide.md). The implementer copies; it does not design.

## Technical Context

**Language/Version**: TypeScript 7.0.2 (strict), Node.js 24.14.0, npm 11.12.1

**Primary Dependencies**: Vite 8.3.0, Vitest 5.0.1; new dev dependency `@playwright/test` `^1.63.0`

**Storage**: N/A

**Testing**: Vitest for pure logic (`tests/*.test.ts`); Playwright for the browser (`e2e/*.pw.ts`)

**Target Platform**: Desktop browser (Chromium for automated checks), Windows 11 development machine

**Project Type**: Static single-page browser game

**Performance Goals**: The unit suite stays under 5 s; the smoke suite under 60 s including build

**Constraints**: No change to `src/game/`, `src/input/`, `src/render/`, `src/main.ts`, `src/config/game-config.ts`. No CI, no deployment, no network code in the game. Nothing merged into `main`, nothing pushed.

**Scale/Scope**: 1 source file changed (`src/config/presets.ts`), 3 test files changed or added, 3 e2e files + 1 config added, ~10 documentation files updated

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | How this plan complies |
|---|---|---|
| I. Locked Gameplay Scope | PASS | Only preset values change (allowed by R6). No new mechanic. GAME_SPEC edits are recorded as a pair decision in `AI_USAGE_LOG.md` (task T035). |
| II. Pure Turn Logic | PASS | `src/game/` is not touched. |
| III. Deterministic Simulation | PASS | Presets stay constant; no randomness. Golden paths prove replayability in browser and logic. |
| IV. Runtime-Validated Boundaries | PASS | `src/config/game-config.ts` is not touched; the smoke test adds a browser check of the invalid-config path. |
| V. Configuration Outside Logic | PASS | Numbers change only in `src/config/presets.ts`. Principle amended to add the non-overlap and winnable invariants (T033). |
| VI. Tests Before Change | PASS | Each preset change is preceded by tests that are run and observed to fail (T006, T013). |
| VII. Smallest Controlled Change | PASS | One commit per story. US1 removes one start; US2 removes one start in each of four lanes. Baseline tag untouched. |
| VIII. Traceable and Safe Work | PASS | Conventional Commits; claim/signal/change/result recorded in `EVIDENCE_003.md`; no secrets. |
| Technical Constraints — minimal dependencies | JUSTIFIED | `@playwright/test` is added; see Complexity Tracking. |

**Post-design re-check**: PASS. No design artifact introduced a new runtime dependency, service, or mechanic.

## Project Structure

### Documentation (this feature)

```text
specs/003-review-fixes/
├── spec.md                    # What and why, with student decisions DEC-1..DEC-4
├── plan.md                    # This file
├── research.md                # Measured numbers and rejected alternatives
├── data-model.md              # Preset before/after, GoldenPath fixture
├── contracts/
│   ├── preset-invariants.md   # PI-1..PI-8 with exact test names
│   └── browser-smoke.md       # Smoke scenarios and evidence captures
├── quickstart.md              # How to verify the finished feature
├── tasks.md                   # Ordered checklist T001..T045
├── implementation-guide.md    # Exact file contents and edits per task
├── codex-prompts.md           # Copy-paste prompts for the Codex agent, one per phase
└── checklists/
    └── requirements.md
```

### Source Code (repository root)

```text
src/config/presets.ts            # CHANGED (US1, US2): vehicleStarts values only
tests/
├── fixtures/golden-paths.ts     # NEW (US1, widened in US2)
├── presets.test.ts              # CHANGED (US1): + non-overlap test
└── reachability.test.ts         # REWRITTEN (US1, extended in US2)
e2e/                             # NEW (US3)
├── support.ts
├── smoke.pw.ts
└── evidence.pw.ts
playwright.config.ts             # NEW (US3)
package.json, package-lock.json  # CHANGED (US3): dev dependency + 2 scripts
tsconfig.json                    # CHANGED (US3): include e2e and playwright.config.ts
.gitignore                       # CHANGED (US3): Playwright output folders
docs/evidence/*.png              # REGENERATED (US4) + 2 new files
docs/*.md, README.md, AGENTS.md, security.md, .specify/memory/constitution.md  # UPDATED (US4)
```

**Structure Decision**: Keep the existing single-project layout. Browser tests get their own top-level `e2e/` folder so Vitest (`tests/`) and Playwright never share files.

## Commit sequence (all on branch `003-review-fixes`)

| # | Conventional Commit message | Contents |
|---|---|---|
| C0 | `docs(spec): add 003 review-fixes specification` | `specs/003-review-fixes/**` (student commits this after review; `.specify/feature.json` is git-ignored and stays local) |
| C1 | `fix(presets): remove the overlapping vehicle in normal row 4` | US1 tests + preset |
| C2 | `fix(presets): make the hard preset winnable` | US2 tests + preset |
| C3 | `test(e2e): add a Playwright browser smoke test` | US3 files |
| C4 | `docs(evidence): regenerate screenshots from <C3 short SHA>` | `docs/evidence/*.png` |
| C5 | `docs: record the review fixes in the spec and constitution` | GAME_SPEC, constitution, AI usage log |
| C6 | `docs: regenerate current evidence and evals from <C3 short SHA>` | EVALS, EVIDENCE, security, README, AGENTS, manifest |

C3 is the **code commit of record**. C4–C6 change only documentation and images, so every "current state" statement names C3.

After C6 the implementer stops. The student reviews and decides whether and how to merge into `main`.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| New dev dependency `@playwright/test` (+ Chromium download) | The reviewer asked for an automated **browser** smoke test of startup, focus, win/loss lock, and restart. Focus, console errors, and real key events need a real browser. | Vitest + jsdom has no Canvas 2D context and no real focus handling; a manual checklist is what the reviewer asked to replace. |
