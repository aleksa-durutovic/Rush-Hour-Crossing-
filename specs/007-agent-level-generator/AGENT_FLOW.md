# Agent flow and authority boundaries

The browser requests a challenge; the server owns decisions, validation and tool execution.
Every tool evaluates isolated traffic. Only a later player click changes the active game.

## Successful path

1. Player selects target rating and requests generation with current lives/crossing target.
2. API validates request, reserves the single active-run slot and creates explicit run state.
3. Model decision one proposes solveLevel with a bounded traffic candidate.
4. Server checks shape, allowlist, traffic invariants, repetition and remaining resources.
5. Actual deterministic solveLevel runs through the engine; its proof/result are validated.
6. Compact measured evidence returns to the model. It can revise at most twice.
7. A later model decision selects an already solved candidate/evaluation pair.
8. Server revalidates exact identity/settings and performs counted final verification.
9. Server computes terminal status and returns the verified preview.
10. Player activates Play this level; browser deliberately starts that exact fresh game.

## Revisions

Tool evidence says solved with the computed rating, or unsolvable, or budget_exceeded.
Only the model can propose the next distinct candidate; it cannot execute it. The application
refuses repeated normalized candidates, invalid input and a third revision before execution.
The model cannot extend the budget or change captured lives/crossing target to manufacture success.

## Stops

- Bad initial request: no run work/provider/tool calls.
- Bad model shape, tool, arguments, result or final references: failed, no preview/fallback.
- Operational or budget stop: eligible existing proof or one bounded verified template can
  produce a stopped fallback preview; preserve actual stop reason and completed false.
- Cancellation/disconnect: abort, terminal state, no fallback or late UI replacement.
- Final verification failure: failed, no playable preview.

## Counter checkpoints

Decision count increments before its first provider attempt; retry increments attempts only.
Tool count increments when a permitted solver actually starts; final/template verification
counts too. Rejected proposals execute zero times. The separate modelToolCallCount is a
subset and must not be used to hide application solver executions.

## Information flow

Model receives fixed rules/schema/tool descriptor, canonical request, remaining budgets and
at most three compact validated results. It returns proposals/selection/refusal only.
Application keeps traffic proof, counters, run state, terminal success and active session
under its control. No secrets, whole repository, raw game history or hidden reasoning cross
the model boundary. See contracts/agent-run.md for exact transitions and limits.
