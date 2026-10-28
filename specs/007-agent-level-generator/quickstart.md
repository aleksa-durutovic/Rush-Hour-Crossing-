# Verification guide for the level generator

Use this guide for local verification procedures. Actual results are recorded in
docs/EVIDENCE_W05.md. The feature contracts and approved implementation guide remain the
authoritative behavior and boundary sources.

## Implemented local workflow

The game exposes the approved five-lane generator in **Build a verified challenge**.
Choose a target rating from 1–5 and request generation. The status region reports progress;
only a contract-validated preview displays the five traffic lanes, source, requested and
measured rating, safe first-crossing minimum and complete-target minimum. **Play this level**
is the explicit approval action. It starts the exact preview at tick zero. `R` restarts that
generated traffic, choosing any remembered difficulty button restores that preset, and reload
returns to the URL-selected preset. Generator controls do not send movement keys to the game.

The browser client posts only to the same-origin `/api/levels/generate` endpoint. Provider
decisions and the sole `solveLevel` tool are server-side. The preview and page reload do not
persist generated layouts. Automated browser cases use intercepted fake responses; they do not
call a live model provider.

## Prerequisites

- Node24+ and npm11+, as required by .nvmrc/package.json.
- Resolve the recorded Windows SDK-path test failure first, without weakening boundaries.
- Install project dependencies with npm ci. Install Chromium with npx playwright install
  chromium only when it is not already available. Follow normal tool approval requirements
  for dependency downloads; do not work around a sandbox denial.
- Tests use fake model/provider responses; no real key is needed for the automated suite.

## Required gates

Run npm ci, npm run typecheck, npm run test:run, npm run build,
npm audit --audit-level=high, and npm run test:e2e. The browser suite must include the new
generator test file and existing smoke/advice files. Record actual exit codes/counts in
docs/EVIDENCE_W05.md, including any failed attempt; no result is inferred from this guide.

For focused development, run only the relevant Vitest file(s) or generator Playwright file
while working on that slice. Before a commit, run the complete required gates again.

## Fake success and revision

1. Submit target rating3 with lives3/crossingsToWin3.
2. Script decision one to request a known valid rating3 candidate through solveLevel.
3. Run the actual solver and validate evidence; script decision two to select its IDs.
4. Assert completed/goal_completed, exact target match, two decisions/two attempts,
   one requested model-tool call and two total solver calls including final verification.
5. Repeat with an impossible first candidate, followed by a distinct valid revision and
   later final. Verify revisionCount and proof replay for the whole crossing target.

## Negative safety and limits

Execute AI_EVALS.md cases for unknown tool, malformed arguments, bad result, early/invalid
final, repeated reordered candidate, third revision, transient/permanent provider failure,
deadline, solver cutoff, cancellation and fallback. Unknown first tool must record total
toolCallCount0 and no preview. Every solver cutoff is budget_exceeded, never unsolvable.

## Browser behavior

Start the application with npm run dev for manual review, or use the existing Playwright
server against npm start and http://127.0.0.1:4173 for automated checks.

1. Begin an ordinary game, make moves, then generate with a controlled response.
2. Confirm current tick/player/lives/traffic/score do not change because of the preview.
3. Inspect target/measured rating, verification, minima and tick-zero traffic snapshot.
4. Activate Play. Confirm exact traffic and captured settings, tick0 and reset progress.
5. Press R. Confirm generated lanes remain exactly identical.
6. Activate the remembered preset (for example NORMAL). Confirm its original lanes return.
7. Verify all preset buttons are unpressed while generated and normal URL behavior resumes
   on preset selection. Reload returns to the URL preset and clears generated data.
8. Focus panel controls; confirm Space/arrows/R do not consume gameplay turns there.
9. Cancel/supersede work and deliver a late response; confirm no preview/state replacement.
10. Complete generated and preset runs with fake advice; verify explicit generated summary
    identity and the existing one-completed-run delay, including hidden prior advice.

## Authorized live confirmation

Only after the full fake matrix and quality gates pass, prepare the small manual procedure
and ask for explicit live-call authorization. Use existing server-side configuration without
reading/printing key values. Limit final-demo generation to three runs and record status,
model label, elapsed time, decisions, attempts, tools, validation and stop reason only.
An unavailable provider or a fallback is not evidence of a completed live agent workflow.

## Evidence and submission

Update docs/EVIDENCE_W05.md and docs/AI_USAGE_LOG.md with actual results and contributions.
Do not alter historical reports or screenshots. Record whether reviewed work is on main;
if it is on a branch, report submission pending instead of automatically pushing/merging.
