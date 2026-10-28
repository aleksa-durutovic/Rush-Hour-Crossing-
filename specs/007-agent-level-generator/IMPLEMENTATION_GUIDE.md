# Luna 6 implementation instructions

Implement the user-approved five-lane generator in this existing project. This guide tells
you what to build and how to prove it; deliberately no implementation code is supplied.
Write your own maintainable implementation from the contracts and current repository.

## Read and preserve the accepted scope

Read AGENTS.md, constitution 1.4.0, docs/GAME_SPEC.md and docs/CONTEXT_MANIFEST.md first.
Then read this feature's spec.md, plan.md, research.md, data-model.md, AGENT_FLOW.md,
contracts/, AI_EVALS.md, quickstart.md and tasks.md. Read the local speckit-implement skill
and use its workflow. The specification quality checklist is checked for document quality;
implementation tasks are all unchecked. Verify the package against current files before work.

Feature 008 amends only the provider-count and timing contract: an opt-in, application-selected
backup is allowed for the existing AI operations, while Feature 007's six-attempt and run
deadlines, one tool, proof, validation and player-approval rules remain in force.

The user accepted five lanes, one solveLevel tool, a bounded propose/evaluate/revise loop,
verified preview and explicit Play. Do not reopen these settled choices, add separate
simulate/metrics tools, expand to six lanes, or redesign the game. Use structured target
rating1..5 with current validated lives/crossings, rather than a new natural-language parser.

## Resolve the baseline before feature source

Planning found one failed test at tests/server/boundaries.test.ts:54: an actual Windows
SDK importer path uses backslashes but its expected path uses forward slashes. Reproduce
and record the result first. Make a minimal portable comparison fix; retain the exact SDK
owner and all import boundaries. Do not loosen security checks to make the suite pass.

Run all AGENTS.md gates and record actual output. If another baseline failure appears,
investigate and fix only its measured cause before adding feature behavior. Do not count
planning's earlier typecheck/test result as your current baseline. Node24+/npm11+ are required.
Preserve unrelated/untracked work; do not delete brag assets or prior student reports.

## Establish the contracts before the loop

Use strict Zod schemas for new generator boundaries; this is the only new runtime
dependency. Keep Week04's small validators except the explicit generated advice label.
Enforce exact keys, integer ranges, byte limits, nested array bounds and semantic invariants.
No coercion or silent clamping of model traffic. Normalize ordering only after validation.

Keep request settings application-owned. A model proposes only five lane definitions.
Captured lives, crossing target, dimensions, start/tick, tool registry and budgets are never
model arguments. Generate server-owned candidate/evaluation identities and retain immutable
normalized data. Final selection must reference existing same-run solved evidence.

Treat output DTO cross-field validation as seriously as input shape: completed must agree
with terminal status, exact target match and verification; unavailable cannot carry playable
traffic. A frontend response that fails validation cannot enable Play.

## Make the solver the authority

Call the real applyAction for every successor. Do not edit turn.ts, traffic.ts or board
constants, and do not create a shortcut simulation with different collision timing.
Use periodic BFS keyed by position, tick phase and completed crossings. Reject life loss.
An exhausted graph proves unsolvable; timeout/state/action/deadline limits are inconclusive.

Search the actual whole target and calculate first-crossing difficulty separately. Keep
witnesses internal; reconstruct through predecessor links, replay them through the real
engine and check unchanged lives, target completion, score, status and minimum length.
Preserve the existing preset/golden-path expectations exactly.

The pure solver owns no clock, signal, DOM or Node API. The server driver processes at most
256 states per batch and yields before checking time/cancellation. A timer attached to an
uninterrupted synchronous BFS is not acceptable. All limits come from the accepted policy.

Create five separate generated templates as described in research.md; verify rather than
trust the research observations. Preserve existing presets unchanged. Metrics and fixed
rating bands live outside the turn logic. Gaps/density explain traffic; they do not prove
solvability or subjective difficulty.

## Build a visible state machine with a fake model first

Use explicit created/running/terminal run state and the fixed solveLevel registry. Inject
the model boundary, solver driver and monotonic clock so tests do not depend on network or
real waiting. A successful fake run must include two model decisions and actual local solver
execution between them, followed by separate counted final verification.

Use contracts/agent-run.md for exact counters, cutoff/reserve, retries and terminal policy.
Never hide provider retry multiplication; disable SDK internal retries and count every
attempt. A repeated normalized candidate must stop before execution even if JSON order or
IDs differ. Third revision must stop before execution. Budget failures cannot grant fresh
limits. SDK/provider errors must be classified without copying raw messages to logs/UI.

Final verification operates on the exact stored candidate and captured settings. It consumes
the same solver/time budget. If it fails or references are invalid, return no preview.
Operational fallback may use already verified same-run evidence or one freshly verified
template, with completed false and the original reason. Security/schema rejection or
cancellation has no fallback. Last valid means solver-verified, not merely schema-valid.

## Adapt the provider without replacing coaching

The existing generateTip method is insufficient for model decisions. Add a separate
generator operation to the current SDK-owning Gemini adapter, behind the new model interface.
Keep provider details out of the service and preserve its sole-import architecture assertion.
Use installed SDK types, the existing GEMINI_MODEL and JSON-schema pattern. Do not migrate
to a newer model/API simply because current web documentation shows a different example.

Structured JSON proposals are sufficient: the application, not the SDK/model, executes
tools. Fake the transport for adapter tests and verify signals, timeouts, output bounds,
and one-attempt SDK settings. Never inspect or print credentials or local environment values.
No live request belongs in routine unit/browser tests or initial implementation.

## Keep the local API small

Add only POST /api/levels/generate, with injected service, bounded streaming body/UTF8/JSON
handling and stable errors. Preserve Host allowlist, loopback binding, no CORS and existing
security headers. The one-run guard has no hidden queue and is released after failure/abort.
Advice routes stay available. Disconnect aborts the run, and late results cannot write to
a closed response or reopen terminal state. Do not add a generic tool execution endpoint.

## Integrate preview and active level as separate concepts

Use a pure browser lifecycle and thin client/controller. A preview is a proposed fresh game,
not a replacement for the current game. Generation status or ordinary gameplay moves never
alter active lanes/settings. R/preset/Play invalidate previews and pending generation;
late responses stay ignored even when downstream abort is ineffective.

Use a small labelled panel below the existing board, with target selector, Generate,
Cancel while running, status and a traffic snapshot. Reuse the existing renderer. Show
target/measured rating and minimum safe first/whole-win moves; keep paths/diagnostics hidden.
Use literal text and keyboard/focus guards for all panel controls.

Only explicit Play copies the exact verified lanes/settings into the active selection and
starts tick zero. GameConfig.difficulty remains its original three-value preset type; store
generated origin separately. R reuses the active generated traffic. Any preset button restores
the original preset even if it equals the remembered difficulty. No preset button is pressed
in generated mode. Reload restores the query-selected preset; do not persist generated data.

## Preserve Week 04 advice

Generated completions must say generated in the existing eight-field summary. Give summary
construction explicit active origin, retaining the ordinary preset default. Do not add
lanes/proof/history to coaching context. Starting generated play follows existing new-run
advice reset semantics: clear visible advice, preserve hidden/pending prior advice, and show
it only after the next completed run. Keep existing preset advice tests and delayed behavior.

## Verify and document honestly

Follow tests-before-code pairs in tasks.md and run focused checks after each slice. Execute
all prewritten AI_EVALS.md cases with fakes and actual local solver work where indicated.
Record claim, signal, change and measured result in docs/EVIDENCE_W05.md. Record decisions
and actual AI involvement in docs/AI_USAGE_LOG.md; do not claim the other student's work.

Add e2e/level-generator.pw.ts explicitly to test:e2e, because the existing script lists its
files rather than discovering every new test automatically. Run the full AGENTS.md checks
before any commit. Keep Conventional Commits English, and never overwrite s003-baseline-v1.
Do not change acceptance criteria/golden paths to fit a flawed implementation.

Complete all local implementation/fake checks/browser checks and prepare safe evidence
before asking about the limited live confirmation. A live call needs separate explicit user
authorization. Explain that requirement comes from the preserved feature006 live-call policy.
Record unavailable/pending live confirmation honestly; do not present template fallback as
a successful live agent run. Development guardrail: at most15 authorized live runs; final
demo at most3. No push, merge or deploy is authorized by this handoff.

## Completion report

Report what was implemented, actual checks, failures/limitations, pending live confirmation,
task completion and whether work is on main or an unmerged branch. Reviewers read main;
an unmerged implementation is not submitted. Preserve that distinction without automatically
publishing. If requirements conflict materially with current files, report the concrete
conflict and its source; resolve routine implementation details within this approved scope.
