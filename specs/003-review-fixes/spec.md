# Feature Specification: Third-Review Corrections

**Feature Branch**: `003-review-fixes`

**Created**: 2026-09-26

**Status**: Draft — awaiting student review before implementation

**Input**: Third review of the Session 003 submission (code at `26ae68b`, docs at `354295b`). The reviewer asked for: (1) a test-first fix of the overlapping vehicles in normal-preset row 4 that keeps the preset winnable, with both overlap and reachability regression tests; (2) a fix of the hard preset, which has no winning path, or a formal redefinition; (3) a Definition of Done that matches the current state; (4) an automated browser smoke test for startup, focus, win/loss lock, and restart; (5) current evidence regenerated from one commit after the corrections.

## Decisions already made by the student (2026-09-26)

These are fixed inputs. An implementer MUST NOT reopen them.

| ID | Decision | Rejected alternative |
|---|---|---|
| DEC-1 | Normal row 4 keeps direction `left`, `moveEveryTicks: 2`, `vehicleLength: 2`; its starts change from `[0, 4, 8]` to `[0, 4]` (the vehicle at 8, which causes the overlap, is removed). | `[0, 3, 7]` (three vehicles, but two touch and read as one four-cell body); `[0, 3, 6]` (already proven unwinnable and reverted in `26ae68b`) |
| DEC-2 | The hard preset becomes winnable. Lanes that move every tick lose one vehicle each: row 1 `[0, 6]`, row 2 `[1, 7]`, row 4 `[5, 8]`, row 5 `[1, 7]`. Row 3 is unchanged. Directions, speeds, and lengths are unchanged. | Declaring hard "survival-only" and weakening D6 |
| DEC-3 | The automated browser smoke test uses Playwright (`@playwright/test`) with its bundled Chromium, as a new dev dependency. | Vitest with jsdom (not a real browser; Canvas would be stubbed) |
| DEC-4 | All corrections live in one Spec Kit feature, `specs/003-review-fixes/`, delivered as separate commits on branch `003-review-fixes`. Nothing is merged into `main` or pushed by the implementer. | One feature per correction |

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Normal traffic reads correctly and stays winnable (Priority: P1)

A player on the default (normal) difficulty sees every vehicle in row 4 as a separate two-cell car with its own windshield, never a merged three-cell shape, and can still win.

**Why this priority**: It is the defect the reviewer named first, it is visible on the default screen, and it is the only open E4 failure.

**Independent Test**: Run the preset tests and the reachability tests. The non-overlap test and the recorded normal winning path both fail on the current code and pass after the preset change. Nothing else in the game changes.

**Acceptance Scenarios**:

1. **Given** the normal preset, **When** vehicle cells of any lane are listed for any tick from 0 to 199, **Then** no cell is listed twice within one lane.
2. **Given** a fresh normal game with `crossingsToWin=1`, **When** the player plays the recorded 11-action winning path, **Then** the game is won at tick 11 with all 3 lives.
3. **Given** a fresh normal game with 1 life, **When** a breadth-first search explores player actions, **Then** a win is found and the shortest one has exactly 11 actions (unchanged from before the fix).
4. **Given** the normal board at tick 0, **When** it is rendered, **Then** row 4 shows exactly two purple vehicles, each two cells long with one windshield.

---

### User Story 2 — Hard difficulty can be won (Priority: P1)

A player who chooses `difficulty=hard` can reach the goal with skilful play. Hard remains the hardest preset.

**Why this priority**: D6 promises reachable win and loss; hard currently has no winning path at all.

**Independent Test**: Run the reachability tests. The hard win search and the recorded hard winning path fail on the current code and pass after the preset change.

**Acceptance Scenarios**:

1. **Given** a fresh hard game with 1 life and `crossingsToWin=1`, **When** a breadth-first search explores player actions, **Then** a win is found and the shortest one has exactly 15 actions.
2. **Given** a fresh hard game with `crossingsToWin=1`, **When** the player plays the recorded 15-action winning path, **Then** the game is won at tick 15 with all 3 lives.
3. **Given** a fresh hard game with 3 lives, **When** the player presses Up four times, **Then** the game is lost at tick 4.
4. **Given** all three presets, **When** their shortest safe wins are compared, **Then** easy (6) < normal (11) < hard (15).

---

### User Story 3 — Automated browser smoke test (Priority: P2)

A reviewer or student runs one command and a real browser confirms that the built game starts cleanly, takes keyboard focus, locks input after a win or loss, and restarts with R — for every preset.

**Why this priority**: The reviewer asked for it, and it replaces manual browser checks as the main browser evidence.

**Independent Test**: Run `npm run test:e2e`. It builds the game, serves the production build, and all smoke scenarios pass.

**Acceptance Scenarios**:

1. **Given** the built game at `/`, **When** it loads, **Then** there are no console errors, warnings, or page errors, the board has focus, the page has one `main` landmark, and the board reports `3 lives, 0 of 3 crossings, score 0, tick 0, status active`.
2. **Given** the loaded game, **When** the user clicks the title and presses Tab, **Then** the board has focus and matches `:focus-visible`.
3. **Given** `/?lives=0&crossingsToWin=11&difficulty=insane`, **When** it loads, **Then** the alert names `lives, crossingsToWin, difficulty` and the default state is shown.
4. **Given** each preset with `crossingsToWin=1`, **When** the recorded winning path is typed, **Then** the status is `won`; further Up/Space/Left presses change nothing; R restores tick 0 and `active`.
5. **Given** each preset with `crossingsToWin=1`, **When** the recorded losing path is typed, **Then** the status is `lost`; further presses change nothing; R restores tick 0 and `active`.

---

### User Story 4 — Documentation and evidence match the code (Priority: P3)

A reviewer reads `GAME_SPEC.md`, `EVALS.md`, and `EVIDENCE_003.md` and finds that every Definition of Done item, eval result, and screenshot describes one named code commit, with no stale known limitation.

**Why this priority**: It depends on US1–US3 being finished; it carries no code risk.

**Independent Test**: Every "current" statement names the same code commit; every referenced screenshot exists and was produced by `npm run evidence:screenshots` from that commit; `grep` finds no remaining claim that normal row 4 overlaps or that hard cannot be won, except in Part 2 (history) and in historical eval results.

**Acceptance Scenarios**:

1. **Given** `docs/GAME_SPEC.md`, **When** R3, D4, and D6 are read, **Then** they state the non-overlap invariant and reachable win/loss for all three presets, and cite the tests that prove them.
2. **Given** `docs/EVALS.md`, **When** E4 is read, **Then** the original expectation is unchanged, the history is kept, and a new current result says PASS for every lane, citing the regenerated screenshots.
3. **Given** `docs/EVIDENCE_003.md` Part 1, **When** it is read, **Then** every result comes from the same code commit, the automated checks include the browser smoke test, and Known limitations no longer lists the overlap or the unwinnable hard preset.
4. **Given** `docs/EVIDENCE_003.md` Part 2, **When** it is read, **Then** a new section records claim, signal, change, and result for each correction.

### Edge Cases

- A preset lane with gap-1 spacing that moves every tick is unwinnable (collision check B always hits). The new tests must catch this through the reachability search, not through the non-overlap test.
- Removing a vehicle must never make a lane empty or fully blocked; the existing non-blocking test still runs for ticks 0–199.
- `crossingsToWin` up to 10: once a single crossing is possible from the start row, it is possible again after every reset, because waiting on the start row is always safe and traffic is periodic. No separate test for 10 crossings is required.
- Out-of-grid moves count as `wait` (R1). The recorded hard path uses `down` once from row 5 back to row 6, then `wait` ×3.
- The browser smoke test must not depend on a dev server that the user already runs on port 4173; it starts its own server and fails if the port is taken (`--strictPort`).
- `npm run test:run` (Vitest) must not pick up the Playwright files. They are named `*.pw.ts`, which Vitest does not match.
- `docs/evidence/baseline-active-normal.png` is historical (captured from tag `s003-baseline-v1`) and MUST NOT be regenerated.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Within one lane, no two vehicles MUST ever occupy the same cell, for every preset and every tick from 0 to 199.
- **FR-002**: The normal preset row 4 MUST be `left`, every 2 ticks, length 2, starts `[0, 4]` (DEC-1). No other normal lane changes.
- **FR-003**: The hard preset MUST be: row 1 `right/1/2/[0, 6]`, row 2 `left/1/2/[1, 7]`, row 3 `right/2/2/[0, 3, 6]`, row 4 `left/1/2/[5, 8]`, row 5 `right/1/2/[1, 7]` (DEC-2). The easy preset does not change.
- **FR-004**: Each preset MUST be winnable from a fresh state with 1 life and `crossingsToWin=1`; the shortest safe win MUST be 6 (easy), 11 (normal), and 15 (hard) actions.
- **FR-005**: Each preset MUST be losable from a fresh state with 3 lives.
- **FR-006**: A recorded winning path and a recorded losing path per preset MUST live in one shared test fixture and MUST be replayed by the unit tests and by the browser smoke test.
- **FR-007**: The existing never-blocked invariant (fewer than 9 occupied cells per lane, ticks 0–199) MUST still hold for all presets.
- **FR-008**: Game rules R1–R7, the turn logic in `src/game/`, configuration validation, input mapping, and rendering MUST NOT change.
- **FR-009**: One command MUST build the game, serve the production build, and run the browser smoke scenarios of User Story 3 in Chromium.
- **FR-010**: One separate command MUST regenerate the evidence screenshots listed in `contracts/browser-smoke.md` from the current code.
- **FR-011**: `docs/GAME_SPEC.md` R3, D4, and D6 MUST describe the new invariants and cite their tests; the change MUST be recorded as a pair decision in `docs/AI_USAGE_LOG.md`.
- **FR-012**: `docs/EVALS.md` MUST keep every existing expectation and historical result unchanged and add a new current result for E1–E4.
- **FR-013**: `docs/EVIDENCE_003.md` Part 1 MUST be regenerated from one code commit; Part 2 MUST gain a section for these corrections.
- **FR-014**: `README.md`, `AGENTS.md`, `security.md`, and `docs/CONTEXT_MANIFEST.md` MUST mention the new commands, the new dependency, and the new specification folder.
- **FR-015**: The constitution MUST be amended (1.0.0 → 1.1.0) so principle V also requires non-overlapping vehicles and a reachable win for every preset.
- **FR-016**: No change is committed to `main`, nothing is pushed, and tag `s003-baseline-v1` is untouched.

### Key Entities

- **Lane definition**: row, direction, move interval, vehicle length, vehicle starts. Only `vehicleStarts` values change in this feature.
- **Golden path**: an ordered list of player actions with the expected final tick and lives for one preset; shared by unit and browser tests.
- **Evidence screenshot**: a PNG in `docs/evidence/` produced by the evidence command from a named code commit.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 0 overlapping cells in any lane of any preset across ticks 0–199 (was: normal row 4 overlaps in 200 of 200 ticks).
- **SC-002**: 3 of 3 presets have a win reachable without losing a life (was: 2 of 3).
- **SC-003**: The shortest safe win stays 11 actions on normal (no difficulty drift) and is 15 on hard.
- **SC-004**: The unit suite grows from 43 to exactly 57 passing tests; the browser smoke suite has exactly 10 passing scenarios.
- **SC-005**: E1–E4 current results are PASS with no exception.
- **SC-006**: Every current claim in `EVIDENCE_003.md` Part 1 names the same code commit.
- **SC-007**: `npm audit --audit-level=high` reports 0 high or critical vulnerabilities after the dependency is added.

## Assumptions

- The Chromium build used by Playwright can be downloaded once with `npx playwright install chromium` on the implementer's machine. If the download fails, the implementer stops and reports; it does not switch browsers silently.
- The student reviews and commits this specification before implementation starts.
- Session 004 features, new mechanics, real-time movement, deployment, and CI remain out of scope. Playwright runs locally only; no CI workflow is added.
- The existing renderer already draws each configured vehicle separately; once presets do not overlap, E4 passes without a renderer change.
