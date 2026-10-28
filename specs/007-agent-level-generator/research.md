# Research decisions for verified level generation

**Date**: 2026-10-06. Planning research, not production feature verification.

## R1 Reuse the real engine

**Decision**: Search through applyAction without changing turn.ts, traffic.ts or constants.ts.
**Rationale**: This preserves collision A and B, wrap-around, reset and terminal semantics.
**Alternatives considered**: A second simplified simulator can disagree with the game;
the existing test BFS has absolute tick and an 80-action cutoff and cannot prove impossibility.

## R2 Bound the repeating traffic graph

**Decision**: Generated intervals are 1..3 ticks; period is the least common multiple of
nine times each lane interval. Search keys include position, tick modulo period and crossings.
**Rationale**: Period is at most 54. At target ten, at most 29,160 active states exist;
separate first-crossing plus full-target searches require at most 32,076 active states.
**Alternatives considered**: Arbitrary intervals enlarge the cycle; depth caps misclassify
unknown cases; ignoring crossings or phase loses valid paths or proof correctness.

## R3 Define difficulty with a reproducible proxy

**Decision**: Use first-crossing minimum safe moves: 1=6..8, 2=9..10, 3=11..12,
4=13..14, 5=15 or more. Gap and density measurements are supporting descriptions only.
**Rationale**: Existing easy/normal/hard paths anchor ratings 1/3/5 at 6/11/15 moves.
**Alternatives considered**: Model-assigned ratings are unverifiable; density alone ignores
traffic phase. Human difficulty calibration is outside this first version.

## R4 Template feasibility

**Decision**: Build separate templates from existing presets: easy for rating one; normal
with only row one's starts shifted +2 modulo nine for rating two; normal for rating three;
hard with only row one's starts shifted +4 modulo nine for rating four; hard for rating five.
Keep DIFFICULTY_PRESETS unchanged. The implementer must validate and test these templates.
**Rationale**: A read-only research agent imported the actual engine in an ephemeral native
Node probe, evaluated 80 placement rotations and measured first-crossing lengths 6/9/11/13/15.
The same probe measured existing preset whole-target lengths: easy 6/24/84, normal
11/31/95, hard 15/42/137 for targets 1/3/10 respectively. These are research observations,
not results of the future production solver or Week 05 evals. No files/provider calls changed.
**Alternatives considered**: Altering existing presets would invalidate locked golden paths;
unverified hand-written fallback configurations would weaken the main guarantee.

## R5 Keep proposal authority in the server

**Decision**: A provider-neutral decision contract returns a solveLevel request, a selection
of an existing candidate, or refusal. Use structured JSON proposals; native provider tool
execution is unnecessary. Only the orchestrator calls the tool.
**Rationale**: Week 05 needs application-owned execution, not a particular SDK tool feature.
**Alternatives considered**: Reusing generateTip cannot carry the required decisions;
agent frameworks and new providers add unnecessary scope.

## R6 SDK and validation boundaries

**Decision**: Add Zod for generator contracts only. Extend the current Gemini SDK-owning
adapter with a separate decision operation; preserve coaching and the exact SDK importer
boundary. Keep application policies out of the adapter and SDK calls out of the orchestrator.
**Rationale**: [Zod strict object schemas](https://zod.dev/api#zstrictobject) reject unknown
properties. [Gemini structured output guidance](https://ai.google.dev/gemini-api/docs/structured-output)
supports structured tool inputs; structural output still needs application validation.
Sources checked on 2026-10-06. Check installed SDK types before implementing; retain the
existing configured model and API method unless a measured compatibility problem requires
a separately documented change. Do not copy a newer documentation model/API example.
**Alternatives considered**: Replacing all Week 04 validators or relaxing the SDK boundary
is broader than needed; assuming valid provider JSON is semantically authorized is unsafe.

## R7 Fallback and zero-execution evidence

**Decision**: Security/schema/final-selection rejection and cancellation return no preview.
Operational or budget stops may return a verified candidate/template, marked stopped/fallback.
**Rationale**: A forbidden first tool must produce toolCallCount zero. Running a fallback
solver after that rejection would contradict the required evidence.
**Alternatives considered**: Fallback on every failure obscures rejection and budgets;
returning a merely schema-valid candidate provides no solvability guarantee.

## R8 Preserve generated identity and Week 04 behavior

**Decision**: Keep GameConfig.difficulty's three preset values; active-level origin is separate.
Extend only advice difficulty with generated, preserving eight fields and delayed lifecycle.
**Rationale**: Generated traffic must not be mislabeled normal. Clicking a remembered preset
must leave generated mode even if its difficulty string has not changed.
**Alternatives considered**: A fourth gameplay Difficulty ripples through preset indexing;
disabling advice for generated games would leave the new mode without the existing feature.

## R9 Deadline ownership

**Decision**: Pure incremental search plus an async server driver, yielding after at most
256 expanded states. Reserve five seconds of the 45-second run for final/fallback handling.
**Rationale**: A Promise timeout cannot interrupt synchronous CPU work. Retries and final
verification must consume the same run budget. See contracts/agent-run.md for exact accounting.
**Alternatives considered**: A worker adds infrastructure; a monolithic synchronous BFS
prevents timely cancellation and delays unrelated local requests.

## Research limitations

The Windows SDK path assertion is still failing; planning does not fix source or tests.
There were no live provider runs, production benchmarks, or feature browser checks.
The runtime capability and safety expectations must be demonstrated by implementation tests.
