# Research: On-Demand Safe-Path Hint

**Date**: 2026-10-06  
**Purpose**: Resolve provider, solver-bound, and route-validation choices before implementation.

## Existing project facts

- The game transition is `applyAction(state, action, lanes)` in `src/game/turn.ts`. It performs both collision checks, advances one tick, reduces at most one life, and resets to start after a crossing. No provider/DOM/time dependency is present.
- Traffic positions are a pure function of tick: each vehicle moves by `floor(tick / moveEveryTicks)` modulo the nine columns.
- The five lanes use `moveEveryTicks` values 2 and 3 for easy, 1 and 2 for normal, and 1 and 2 for hard.
- Difficulty lane data is already centralized in `src/config/presets.ts`.
- `tests/reachability.test.ts` already uses fixed-order breadth-first search and replayed paths. It caps path depth at 80 for its separate preset checks; this test-only search is a pattern, not production code.
- The local API server accepts optional services through `createRequestHandler`, has fixed API error patterns, enforces a Host allowlist, binds to loopback, and adds no CORS headers.
- Feature 006's `@google/genai` dependency, model constant, environment loading, retry classification, and advice behavior remain unchanged.

## Solver cycle and finite-state bound

For one lane, all vehicle cells repeat after `9 × moveEveryTicks` ticks because each full cycle advances every vehicle exactly nine positions. A preset's full traffic phase repeats after the least common multiple of its lane periods:

| Preset | Lane movement periods | Full traffic cycle |
|---|---|---:|
| easy | 18, 27, 18, 27, 18 | 54 ticks |
| normal | 9, 18, 9, 18, 9 | 18 ticks |
| hard | 18, 18, 18, 18, 18 | 18 ticks |

While searching for a route that loses no life, life count is constant. A nonterminal player can occupy 54 cells across the five traffic rows and the start row; the goal row resolves immediately to one crossing and start reset. Hint search stops at that first crossing, so the submitted crossing count stays fixed during the search. The largest active safe graph is therefore `54 cells × 54 phases = 2,916` states. A 30,000-state cap leaves headroom and remains a defense-in-depth limit; a 512-action cap independently bounds returned route size. If the action cap stops search before a proof, report `search_limit`.

The solver uses a visited key of `(x, y, tick modulo preset cycle, crossings)` while holding lives fixed. It stores one predecessor/action per visited state rather than copying each path, then reconstructs only a route whose final action enters the top goal row and adds exactly one crossing. That final state may remain `active` when the configured target needs more crossings. If all reachable safe states are exhausted, `no_safe_path` is a proof over the finite current preset graph.

The finite-state calculation is the basis for the search cap. A separate one-shot local measurement on the three current start presets is recorded in `docs/EVIDENCE_W05.md`; it is an observation, not a latency guarantee or a performance test.

## Provider integration

The existing project uses the official `@google/genai` JavaScript SDK. Google's official Generate Content function-calling guide shows JavaScript declarations in `config.tools[].functionDeclarations`, model proposals through `response.functionCalls`, local validation/execution, and a second request containing the prior candidate plus a matching function response. The agent adapter will follow that manual two-turn shape while validating the returned name and arguments itself. [Official function-calling guide](https://ai.google.dev/gemini-api/docs/generate-content/function-calling)

Google's structured-output documentation describes constraining final JSON to a supplied schema. The adapter will request a single bounded explanation object; independent runtime validation remains authoritative even if the provider claims schema adherence. [Official structured-output guide](https://ai.google.dev/gemini-api/docs/generate-content/structured-output)

The implementation reuses the existing server-only SDK dependency and `GEMINI_MODEL` constant. No model catalog, account access, price, or live behavior is assumed from this research. No live provider request was made.

## Decision summary

| Question | Decision | Reason |
|---|---|---|
| Search algorithm | Fixed-order breadth-first search | Finds a shortest action count route on the unweighted deterministic state graph and matches the existing reachability test pattern. |
| Search caps | 30,000 expanded safe states and 512 actions | The theoretical graph bound is 29,160; the explicit cap protects against future invariant drift, while the route cap keeps response data small. |
| No route vs limit | `no_safe_path` only after exhaustive graph exhaustion; otherwise `search_limit` | Avoids describing an incomplete search as proof of impossibility. |
| Provider workflow | First required function proposal, one validated local tool execution, second structured explanation on verified route | Makes application execution authoritative and demonstrates two logical steps without giving the model route control. |
| Tool result sent to model | Compact normalized outcome summary, no coordinates/actions | The second step needs evidence that a route was verified; route data is larger and remains backend-owned. |
| Final explanation | Exact JSON object with one non-empty text field up to 160 characters; shown as literal text after independent validation | Keeps output bounded and prevents HTML execution; route truth remains sourced from solver output. |
| Provider attempts/deadlines | 4 total, at most 2 per logical step, 15 s each, 45 s overall | Fits within the assignment's sample ceilings while allowing one retry per step; overall deadline bounds the combined workflow. |
| Browser cache | One attempt per current life count, cached success/failure/stale result, cleared on life loss, restart, or difficulty switch | Allows another hint after a life is lost while preserving an explicit original-tick label for a reused result during the same life. |

## Risks

- Provider model or SDK surfaces may change. Keep model calls isolated in `server/agent/gemini-provider.ts`, retain fake-provider tests, and recheck official docs before adapter edits.
- Function-call output is untrusted, even when a function is declared. The backend exact-key validator and allowlist decide whether the solver runs.
- If a future preset's cycle or state space grows, update the bound calculation before raising caps.
- A model explanation can be wrong even when it is schema-valid. The UI's fixed verified-status text and solver route remain the evidence; explanation is supplementary.
