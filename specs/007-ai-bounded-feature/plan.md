# Implementation Plan: 007-ai-bounded-feature

**Feature**: On-Demand Safe-Path Hint  
**Date**: 2026-10-06  
**Spec**: [spec.md](spec.md)  
**Status**: Accepted; implementation and final verification complete (see `docs/EVIDENCE_W05.md`)

## Summary

Add a player-triggered Hint for active games. Each life count allows one request. A bounded server-side two-step agent requests the allowlisted safe-path solver, receives a normalized solver outcome, and returns a short validated explanation. The browser draws the next-crossing route and per-step states from the server's verified solver result, pauses controls while the Hint is loading or visible, and caches the result until a life is lost or the game is restarted.

No game rule, preset, score, transition, or feature 006 behavior changes.

## Technical Context

**Language/Version**: Strict TypeScript, Node.js 24+, npm 11+  
**Primary Dependencies**: Existing Vite, Vitest, Playwright, `@google/genai` 2.24.x dependency; no new dependency proposed  
**Storage**: In-memory per-game browser state with used life counts; no server persistence  
**Testing**: Vitest unit/server suites and Playwright `*.pw.ts` browser tests  
**Target Platform**: Browser game plus the existing local Node.js server on `127.0.0.1`  
**Project Type**: Single TypeScript web application with local API server  
**Performance Goals**: Search at most 30,000 safe states, return at most 512 route actions, and stop provider workflow within 45 seconds  
**Constraints**: Exact runtime validation, same-origin route, existing Host allowlist/no CORS, server-only provider/environment access, no live-provider tests, no gameplay changes  
**Scale/Scope**: One Hint request per current life count; one next-crossing route; one local solver tool; two logical model steps on a verified route

## Constitution Check

| Principle | Result | Evidence/constraint |
|---|---|---|
| Locked gameplay scope | PASS with approved narrow exception | The pair approved only this read-only Hint/tool flow; `GAME_SPEC.md` and `AI_USAGE_LOG.md` record it. R1–R7 remain unchanged. |
| Pure turn logic | PASS | The solver calls the existing transition function; no provider, DOM, or clock enters `src/game/`. A small pure action-destination helper may be exported for consistent route drawing without changing transition behavior. |
| Determinism | PASS | Search order is fixed; traffic phase is keyed by a derived finite cycle; no RNG or wall clock in solver. |
| Runtime-validated boundaries | PASS | Browser snapshot, server request, tool proposal, solver result, final response, and browser response all have exact runtime validators. |
| Configuration outside logic | PASS | Difficulty selects existing `DIFFICULTY_PRESETS`; no lane constants are added to transition logic. |
| Tests/expectations before change | PASS when sequence is followed | `AGENT_EVALS.md` and targeted failing test expectations are created before first execution and before behavior edits. |
| Smallest controlled change | PASS | Additive feature modules and `/api/hint`; preserve `src/game/turn.ts` behavior and feature 006 contract/lifecycle. |
| Traceable/safe work | PASS | Fake provider in automated tests; no prompts, secrets, or raw provider payloads in browser/evidence; actual checks recorded in `docs/EVIDENCE_W05.md`. |

**Gate**: The only out-of-scope exception is the one described in this plan and accepted in the student-pair scope record. No constitutional principle or gameplay rule is amended.

## Architecture and Data Flow

1. The browser builds the exact eight-field active snapshot and checks its ranges.
2. The browser starts one same-origin `POST /api/hint` request and enters the paused/loading state.
3. The server checks method, content type, a 2,048-byte body cap, and the shared exact-key snapshot validator before invoking any provider or solver.
4. The provider adapter asks Gemini for exactly one `find_safe_path` function proposal. The orchestrator validates the tool name and empty arguments before invoking the sole allowlisted tool once.
5. The solver reconstructs a `GameState`, applies the selected existing preset and deterministic transitions, and runs bounded breadth-first search while preserving the submitted life count. It stops at the first safe crossing into any column of the top goal row.
6. For a verified route, the server validates every solver step by replaying the actions and checking the resulting states. It sends only a small normalized outcome summary to model step two; the model returns an explanation only. The server attaches the solver-owned route to the response. For `no_safe_path` or `search_limit`, the server returns a fixed safe status without a provider-generated claim.
7. The browser validates the response and snapshot match, then caches it. It renders route markers only from solver steps and the model explanation via literal text. A mismatch becomes a cached stale status with no route.
8. Hide resumes input. Re-show reuses the cache; if the current tick differs, the UI labels the cached origin tick. Restart or difficulty change while hidden clears the lifecycle state.

## Bounded Solver Design

- Safe means every applied action preserves the submitted life count and the route ends on the first safe entry to any column of the top goal row. The game may remain `active` when more crossings are required to win.
- A lane's occupancy cycle is `GRID_COLUMNS × moveEveryTicks`; the complete traffic cycle is the least common multiple over configured lanes. Current presets have cycle lengths 54 (easy), 18 (normal), and 18 (hard).
- The active safe search state is player cell and tick modulo traffic cycle; the submitted crossing count stays fixed until the final step. Lives remain equal to the submitted value. There are at most 54 player cells and 54 phases: 2,916 combinations. The 30,000 expansion cap exceeds this derived finite bound and remains an explicit defense-in-depth stop.
- Fixed action iteration order: `up`, `down`, `left`, `right`, `wait`. A visited-state set plus predecessor links avoids path-array copies.
- Route output includes each action, the attempted/entered cell before crossing reset, and the post-turn tick/player/lives/crossings/status. The final entered cell is on `y = 0`, at any column; the transition resets the player to start, with status `won` only when the configured target is met.
- A 512-action depth cap is a separately named stop. If reached before proving a route or exhausting the graph, the solver reports `search_limit`, never `no_safe_path`.

## Agent and Provider Design

- Provider interface is injectable; the orchestrator has no SDK import.
- Step one declares only `find_safe_path` with empty arguments and is configured to require that function. The provider returns a single proposal plus opaque server-only continuation context.
- The orchestrator validates exact tool name and empty argument shape, checks step/tool counters, and invokes the solver exactly once.
- Step two occurs only after a verified solver result. The provider receives the original model call plus a function response containing a compact, validated summary, not route coordinates. Its output is exact-schema JSON with one explanation up to 160 characters.
- The API response status is backend-derived. Route/actions/trace are attached only from solver output. The model cannot select an outcome or alter a coordinate/action.
- Maximum four provider attempts in total, maximum two per step, 15 seconds per attempt, and a 45-second overall deadline. Only transient network/provider errors and attempt timeouts may retry. Invalid output, permanent errors, cancellation, and a completed tool call never retry the whole workflow or repeat the tool.
- The existing `GEMINI_MODEL` constant and server key-loading boundary are reused. No SDK dependency or second `.env` loader is needed.

## Browser Lifecycle and Rendering

- Add a pure `src/hints/lifecycle.ts` state machine for ready, loading, visible, cached-hidden, and safe failure/stale outcomes. Each request gets a generation token so obsolete completions cannot replace current state.
- Add `src/hints/snapshot.ts`, `client.ts`, and `controller.ts` for snapshot creation, client-side validation, same-origin request/response validation, and lifecycle wiring.
- Add a native Hint button, polite status region, accessible ordered action/cell route list, and loading indicator in `src/main.ts`; disable movement, `R`, and difficulty controls while loading/visible. Keep the Hint button active only as Hide while a result is visible.
- Add a small optional overlay parameter to `renderGame` in `src/render/canvas.ts`. Draw only validated route cells; draw the final goal-row cell from the validated attempted position in the final step. Use reduced-motion CSS for a static spinner while retaining visible text.
- If the game changes before the HTTP response resolves, discard the route and cache a safe stale result. A previously cached route may be re-shown after gameplay advances only with its origin tick displayed.

## API and Error Contract

- Route: `POST /api/hint`, same-origin only, using the accepted feature 005 server.
- Request content type: UTF-8 JSON; maximum 2,048 bytes; exact snapshot keys only.
- Stable errors: `400 INVALID_REQUEST`, `413 REQUEST_TOO_LARGE`, `415 UNSUPPORTED_MEDIA_TYPE`, `405 METHOD_NOT_ALLOWED` (`Allow: POST`), and `503 HINT_UNAVAILABLE`. No raw provider/service details.
- Successful bounded outcomes: `verified`, `no_safe_path`, `search_limit`. A solver/provider/internal failure is a fixed unavailable error, not a fabricated route.
- Success response maximum 65,536 bytes; exact response validator checks origin snapshot, outcome, explanation limit, action enum, route cap, positions, ticks, cross-field progression, and terminal result.
- Request disconnect aborts provider calls; service checks cancellation around bounded synchronous solver work and ignores late results. Existing Host policy, loopback binding, security headers, and no-CORS behavior remain unchanged.

## Test Strategy

- Record all evaluation expectations in `AGENT_EVALS.md` before their first execution. For each behavior slice, add its failing unit/server/browser expectations and run the targeted tests once to capture the red baseline before that slice's behavior code.
- Solver unit tests cover all difficulties, arbitrary valid starts/ticks/crossings/lives, transition replay, deterministic route selection, exact caps, exhaustive no-route, search limit, and trace size.
- Shared contract tests cover exact keys, byte limits, integer/range/cross-field checks, action/state bounds, and malformed provider/tool output.
- Service tests use fake providers/solver injection to check one tool, two-step order, invalid proposal zero-tools, bounded retries, no tool replay, timeout, total deadline, cancellation, and safe failures.
- API tests cover method/media/body/validation/status/cancellation, zero provider and solver calls for invalid snapshots, fixed error bodies, Host policy, and no CORS.
- Boundary tests permit SDK import only in the new server provider adapter plus existing advice adapter; `src/` remains free of SDK, server, Node, and environment imports.
- Playwright tests use route interception/fake API results only. Cover one-run caching, paused input, stale result, visual route cells, accessible statuses, reduced motion, hide/resume, reset, difficulty, and existing smoke/advice regressions.
- Routine automated tests never make a live Gemini request. A separate live demo remains gated by explicit user approval.

## Project Structure

### Documentation

```text
specs/007-ai-bounded-feature/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── agent-flow.md
├── AGENT_EVALS.md
├── contracts/hint-agent.md
├── checklists/requirements.md
└── tasks.md
```

### Source Code

```text
shared/hint-agent-contract.ts
server/agent/hint-service.ts
server/agent/gemini-provider.ts
server/agent/tools/find-safe-path.ts
server/app.ts
src/game/turn.ts                 # optional pure destination helper only
src/hints/{snapshot,lifecycle,client,controller}.ts
src/main.ts
src/render/canvas.ts
src/style.css
tests/hints/*.test.ts
tests/server/hint-*.test.ts
tests/server/boundaries.test.ts
e2e/hint.pw.ts
package.json
docs/GAME_SPEC.md
docs/AI_USAGE_LOG.md
docs/EVIDENCE_W05.md
```

**Structure Decision**: Add feature-specific shared/server/browser modules to the existing single-project tree. No new server, service, database, dependency, or deployment target is introduced.

## Known Limits

- A safe route beyond 512 actions is reported as not verified even if one may exist.
- Provider access/account and live model behavior are not validated by automated tests.
- The solver relies on the current presets' finite periodic traffic and accepted transition function; a future change to either must update its state-cycle derivation and tests.
