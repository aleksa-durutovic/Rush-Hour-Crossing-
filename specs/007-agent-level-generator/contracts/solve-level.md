# solveLevel tool contract

## Authority and scope

Name: solveLevel. Mode: deterministic read-only local evaluator. Caller: feature 007
orchestrator only, through a fixed registry containing this single tool. It operates on an
isolated fresh game, never on the canonical active browser session. No HTTP tool endpoint,
filesystem, network, shell, arbitrary function name or persistent writes are exposed.

Input: exactly the lanes object defined in ../data-model.md. Lives, crossing target,
dimensions, rules version and resource limits come from immutable application-owned run
context. Validate name, exact schema, semantic traffic invariants and budget before executing.
Validation rejection consumes no solver execution.

## Solver algorithm obligations

Implement pure incremental breadth-first search under src/game/solve-level.ts with a fixed
action order up, down, left, right, wait. Call the existing applyAction for every successor.
Discard every successor that loses a life; never search through respawn as a safe solution.
Mark the initial key visited. Use predecessor references to reconstruct witnesses rather
than copying growing paths into every queued node.

For a lane interval m, nine times m ticks translates all vehicles by nine columns. Therefore
P = lcm of nine times every lane's interval repeats traffic. With intervals 1..3, P <=54.
Key active states by x, y, tick modulo P and completed crossings. Goal-row entry resets or
wins immediately, so active rows are 1..6. Lives are fixed because collision edges are
discarded; score follows crossings. Do not omit phase or crossings from the key.

Run one first-crossing search for the rating and one search for the actual whole target;
reuse the first search when target is one. Do not claim whole-game minMoves by multiplying
the first-crossing minimum: traffic continues after resets. Both searches start at tick zero
and use the same exact traffic. Searching the full finite graph until a win proves the
shortest safe length; exhaustive failure proves unsolvable. A resource cutoff proves neither.

One first-crossing search has at most 2,916 active states; target-ten search has at most
29,160. Across both searches, allow at most 35,000 distinct active states and 175,000
successor evaluations. Keep terminal successors outside the active-state count and define
the counters in tests. Witnesses are bounded to 32,768 actions. Do not add an arbitrary
80-move cap or discard long valid paths.

## Time and cancellation

An async driver under server/level-generator/solve-tool.ts runs the pure search in batches
of no more than 256 expanded states, yields to the event loop, checks AbortSignal and the
injected monotonic clock between batches, and enforces two seconds per invocation or the
remaining run deadline, whichever expires first. Search code itself reads no time or Node API.
Validate the outcome and replay witnesses before accepting it. No Promise race around an
uninterrupted synchronous loop is an acceptable timeout implementation.

## Results

Use the evidence fields in ../data-model.md. Attach application-owned candidateId and
evaluationId to the compact model-facing result. Exclude action paths, queues and game
history. Maximum compact result: 4,096 UTF-8 bytes. Solved must have full-target proof,
non-null minima/rating and null budgetReason. Unsolvable requires complete exploration;
budget_exceeded has a safe reason and cannot be presented as solved.

The dispatcher validates result shape, outcome/nullability, computed rating consistency,
metrics, counters, identity and replayed proof before the model receives it. An invalid
result stops with invalid_tool_result; it is never included as trusted context.

## Required correctness fixtures

- Existing golden first wins: easy6, normal11, hard15, with unchanged recorded actions.
- Whole-target searches and replay for targets three and ten. Planning observations
  easy24/84, normal31/95, hard42/137 are expectations to independently confirm.
- Collision A-only and B-only safety; wrap-around; mixed intervals and cycle repetition.
- Same position at different phases, and same phase/position at different crossing counts.
- Reduced resource limits: budget_exceeded, not unsolvable.
- A valid impossible lane: length two, starts 0/2/4/6, right, interval one. It always has
  one empty cell, but no column is safe at both collision checks. Fill other rows with
  ordinary valid lanes. Full graph exhaustion must identify impossibility.
- Circular gap cases: one vehicle, unsorted starts, adjacent cars, and wrap-around overlap
  rejection. Reordered equivalent inputs must produce identical measurements/results.
