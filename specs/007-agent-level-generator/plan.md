# Implementation Plan: Verified agent level generator

**Date**: 2026-10-06 | **Spec**: [spec.md](spec.md)
**Implementation branch**: suggested codex/007-agent-level-generator; planning leaves main selected.
**Status**: Detailed instructions only. Implementation and live verification are pending.

## Summary

Extend the existing browser game and local server with bounded traffic generation. A new
server orchestrator receives structured player settings, requests proposals from the existing
Gemini boundary, invokes only solveLevel, returns verified evidence, and accepts a final
candidate selection. The browser previews verified traffic and applies it only after Play.

The approved scope is recorded in docs/AI_USAGE_LOG.md and docs/GAME_SPEC.md; constitution
1.3.0 extends invariants and authority requirements. Keep the engine, grid and preset data
unchanged. Follow IMPLEMENTATION_GUIDE.md and dependency-ordered tasks.md; this package
deliberately contains no source implementation or paste-ready test bodies.

## Technical Context

**Language/Version**: Existing strict TypeScript; Node24+ and npm11+.
**Primary Dependencies**: Existing Vite/Canvas/Vitest/Playwright/tsx/node:http/@google/genai;
add Zod as the single justified generator validation dependency.
**Storage**: In-memory per-run evidence and browser session selections only.
**Testing**: Pure unit tests, server fake model/tool/timer tests, same-origin route tests,
and generator Playwright checks added to the existing test:e2e command.
**Target Platform**: Existing desktop browser game with keyboard gameplay.
**Performance Goals**: Bounded 45-second run, cancellable/yielding solver, continued keyboard
gameplay and advice service responsiveness. No unmeasured latency promises.
**Constraints**: One primary and at most one Feature 008 backup, one tool, fixed five lanes, no autonomous writes, no live calls
in ordinary tests, no RNG in gameplay, no database/framework/agent SDK/deployment.
**Scale/Scope**: One active local generator run, three candidates, two revisions, five
decisions, six provider attempts and eight counted solver executions.

## Constitution Check

| Principle | Design response | Gate |
|---|---|---|
| I Locked scope | Explicit user-approved feature007 exception recorded; presets/R1-R5 unchanged | PASS for planning |
| II Pure logic | applyAction unchanged; incremental solver and measurements contain no side effects/time | PASS |
| III Determinism | Same normalized lanes/settings/actions replay identically; model variability is outside play | PASS |
| IV Runtime boundaries | Strict request, proposal, tool-result and final schemas plus semantics | PASS |
| V Config outside logic | Ranges/rating/limits/templates in configuration; every preview has full-target proof | PASS |
| VI Tests first | Existing Windows failure must be reproduced/fixed before feature source; new tests precede code | BLOCKED until T002 |
| VII Small controlled change | Separate prerequisite fix and small tested slices; original baseline tag untouched | PASS |
| VIII Traceability | Prewritten evals, safe evidence, actual checks only; partner contributions not invented | PASS |
| Technical constraints | Existing local server/provider; no expanded SDK authority or external service | PASS |

Post-design check: the design has no unresolved scope conflict. The implementation gate is
the known baseline failure, not a missing user decision. Do not mistake planning readiness
for permission to bypass failed checks.

## Project Structure

| File or area | Responsibility and intended work |
|---|---|
| shared/level-generator-contract.ts | Browser-safe DTOs and strict Zod schemas, exact keys/nullability |
| src/config/generated-level.ts | Lane policy, canonicalization, invariant validation, rating boundaries and templates |
| src/game/solve-level.ts | Pure incremental BFS state, visited keys, predecessor witness reconstruction |
| src/game/level-metrics.ts | Pure circular gap/density calculations and rating derivation |
| server/level-generator/policy.ts | Application-owned budgets, stop taxonomy and bounded context rules |
| server/level-generator/model.ts | Fakeable provider-neutral decision request/response boundary |
| server/level-generator/solve-tool.ts | Validating yielding async driver around pure search |
| server/level-generator/service.ts | Explicit orchestrator, registry, counters, repetitions, candidate storage, final/fallback policy |
| server/advice/gemini-provider.ts | Add separate generator-decision factory/operation within the existing sole SDK owner |
| server/app.ts and server/index.ts | Inject generation service, bounded route, concurrency guard and disconnect abort |
| src/level-generator/lifecycle.ts | Pure request/preview lifecycle and stale-response suppression |
| src/level-generator/client.ts | Same-origin request, abort, bounded response validation |
| src/level-generator/controller.ts | Async wiring; never executes the model loop or solver |
| src/main.ts and src/style.css | Small accessible panel, preview, Play, active-origin wiring and focus guards |
| src/render/canvas.ts | Reuse existing renderer for isolated preview; no alternate traffic calculation |
| shared/advice-contract.ts and src/advice/summary.ts | Explicit generated summary origin; eight fields and default preset behavior |
| tests/level-generator-contract.test.ts | Shared schemas and cross-field contract checks |
| tests/generated-level.test.ts | Range/invariant/canonicalization/template/rating tests |
| tests/solve-level.test.ts and tests/level-metrics.test.ts | Pure solver/witness/period/metric correctness |
| tests/server/level-generator-tool.test.ts | Solver timeout/abort/result validation |
| tests/server/level-generator-service.test.ts | Fake decision loop, counters, limits, retries, final and fallback failures |
| tests/server/level-generator-provider.test.ts | Fake transport, structured output, signals, limits and classified provider errors |
| tests/server/level-generator-api.test.ts | Route/security/concurrency/disconnect behavior |
| tests/level-generator-lifecycle.test.ts | Browser lifecycle, preview approval and stale invalidation |
| e2e/level-generator.pw.ts | Preview/Play/restart/preset/focus/fallback flows |
| tests/server/boundaries.test.ts | Prerequisite separator fix and retained SDK/server isolation |
| tests/server/advice-service.test.ts, tests/server/advice.test.ts, tests/advice/summary.test.ts | Narrow generated-label compatibility tests |

Preserve existing tsconfig separation: pure/browser tests under tests/, server tests under
tests/server/, Playwright under e2e/. Ensure shared files are reached/typechecked without
introducing Node types into browser modules. Paths above are the expected task destinations;
a necessary small filename adjustment must be documented consistently before proceeding.

## Phase 0 Research

Resolved decisions and measured feasibility are in research.md. Read-only research agents
were used as required by speckit-plan. No provider was called and no feature code was written.
The five bands are attainable with separate templates derived from the existing presets.
No further dependency research requires changing the game scope.

## Phase 1 Design and contracts

Read data-model.md before writing schemas. Read contracts/solve-level.md for the search
proof and budgets, contracts/agent-run.md for precise limits/authority/fallback,
contracts/api-and-ui.md for HTTP/lifecycle behavior, and AGENT_FLOW.md for the state flow.
AI_EVALS.md fixes expectations before execution; quickstart.md defines verification.

## Implementation sequence

1. Record/reproduce the existing failing SDK-path assertion, fix only path normalization,
   and establish the required green baseline before adding feature source.
2. Install/record the justified Zod dependency. Write contract/invariant/metric/solver tests
   before each implementation; validate templates and whole-target witnesses.
3. Build the fakeable model boundary and bounded service against fakes and the real local
   solver. Prove success, invalid inputs, deadline, limits and final verification.
4. Add the generator method to the sole SDK-owning adapter using installed types and the
   existing model. Do not call the real provider during routine work.
5. Add the local route and concurrency/disconnect guarantees with fake services.
6. Add browser lifecycle/preview/Play and narrow generated-label advice compatibility.
7. Integrate browser tests into test:e2e, run required checks, record evidence and review.
8. Only after fake checks pass and explicit live authorization: limited live confirmation.
   Record unavailable live access truthfully rather than counting fallback as live success.

## Risks and implementation decisions

- Do not copy the existing 80-depth test search or write a second collision simulator.
- Do not use synchronous BFS with a timer wrapper; the event loop must regain control.
- Do not change presets to fill rating bands or change expectations to conceal solver bugs.
- Separate minMoves for the whole target from firstCrossingMinMoves used for rating.
- Final selection must refer to stored same-run evidence; modified/unevaluated configs fail.
- Count final verification and template verification as actual solver calls.
- Security rejection has no fallback; operational fallback keeps completed false.
- Preserve GameConfig.difficulty and ordinary query semantics; store active origin separately.
- Preserve one-run-delayed coaching; explicit generated label prevents false preset claims.
- Limit the SDK importer to the existing adapter rather than broadening boundary exemptions.
- No new routes or UI controls can execute arbitrary tool names or model-chosen URLs.

## Complexity Tracking

Only one new runtime dependency is proposed. A pure incremental solver plus server driver
avoids a worker pool and preserves deterministic testability. No framework, persistence,
additional provider or separate simulation engine is justified.

## Handoff and delivery

Luna6 implements tasks through speckit-implement; it does not regenerate this approved scope
or request permission for each reversible task. Use the local skills and follow the final
handoff prompt. No implementation tasks are marked complete during planning.
Do not commit with failed required gates, do not overwrite s003-baseline-v1, and do not push,
merge or deploy automatically. Reviewers read main: if implementation uses a branch, report
that submission remains pending until the reviewed work is merged to main.
