# Level generator data model

This file defines contracts in prose and tables. Implement the types and runtime schemas
yourself; do not introduce extra model-controlled fields.

## Generation request

Exactly three fields, all integers: targetDifficulty 1..5 (default UI selection 3),
lives 1..5, crossingsToWin 1..10. The browser captures its current validated game settings.
The server validates independently and constructs the goal. No free-text goal, lane count,
dimensions, current player state, provider name or budget comes from this request.

## Candidate and lane

Model tool arguments contain exactly one field, lanes, with exactly five lane definitions.

| Lane field | Constraint |
|---|---|
| row | Integer 1..5; each appears exactly once |
| direction | left or right |
| moveEveryTicks | Integer 1..3; one-cell movement every this many ticks |
| vehicleLength | Integer 1..2, shared by vehicles in that lane |
| vehicleStarts | Array of 1..4 unique integers, each 0..8 |

Reject unknown properties at every object boundary, numeric strings, coercion, non-finite
numbers, duplicates and overlapping vehicle cells including wrap-around. Occupied cells
per lane must be less than nine. Adjacent non-overlapping cars are allowed. The model
does not provide lives, target crossings, difficulty claims, gaps, proof, budget or tick.

After validation, sort lanes by row and each lane's starts numerically. This is identity
normalization only; do not clamp or alter traffic. Store a deep copy of normalized lanes,
captured settings and a rules version. Candidate IDs are server-owned c1..c3, scoped to a run;
evaluation IDs are server-owned, at most 64 characters. Canonical repetition keys include
normalized lanes, captured settings and rules version. Different key order or new IDs do
not turn the same traffic into a new candidate.

## Solver evidence

| Field | Meaning |
|---|---|
| outcome | solved, unsolvable, or budget_exceeded |
| firstCrossingMinMoves | Integer minimum from tick zero for one safe crossing, or null |
| minMoves | Integer minimum from tick zero for the full target, or null |
| computedDifficulty | 1..5 only when full-target outcome is solved; otherwise null |
| tightestGap | Minimum integer circular empty-cell gap, 0..8 |
| averageGap | Total circular empty-cell gaps / total vehicles, finite 0..8 |
| trafficDensity | Total occupied traffic cells /45, finite greater than zero and less than one |
| trafficPeriod | Positive integer, computed from intervals; at most 54 |
| exploredStates / actionEvaluations | Nonnegative counts within the solver-call ceilings |
| budgetReason | null or state_limit, action_limit, timeout, deadline, cancelled |

Keep whole-target and first-crossing action witnesses internal, bounded to 32,768 actions
each. Do not send witnesses to the model or UI. A solved result requires replay from a fresh
state through applyAction, status won, expected crossings/score, unchanged lives, and witness
length equal to minMoves. Nullability and outcome fields must agree; neither unsolvable nor
budget_exceeded can supply a verified rating or playable proof.

## Rating policy

| Computed rating | firstCrossingMinMoves |
|---|---|
| 1 | 6..8 |
| 2 | 9..10 |
| 3 | 11..12 |
| 4 | 13..14 |
| 5 | 15 or more |

Require at least six moves for a safe crossing on this board. These are objective planning
length bands, not a claim about every player's experience. The full-target minimum is
reported separately; changing target crossings must not change the first-crossing rating.

For each lane, sort starts, measure the forward circular distance to the next start, then
subtract vehicleLength. The final start wraps by adding nine. A single vehicle's circular
distance is nine. Zero means adjacent cars, not overlap. Sum empty gaps for averageGap;
translation preserves these metrics. No floating-point rounding drives rating or acceptance;
round only presentation, retaining exact computed numeric values in evidence.

## Model decisions

Three disjoint exact-key variants; maximum parsed response size 8,192 UTF-8 bytes.

- tool_request: kind, name (nonempty string at most 40 characters), arguments.
  Only name solveLevel is authorized; arguments follow the candidate contract.
- final: kind, candidateId, evaluationId, summary (nonempty, at most 160 characters).
  Both IDs must match the same previously solved candidate in this run. It contains no
  new traffic, completion flag, metric, proof or free-form evidence claim.
- refusal: kind and reason, with reason limited to cannot_satisfy_goal or insufficient_evidence.

Parse structural shape separately from the tool allowlist so unknown_tool is testable.
The envelope parser treats arguments as untrusted data until the name passes the allowlist;
only then apply the strict solveLevel argument schema. Do not require a forbidden tool's
arguments to look like lanes before identifying its forbidden name.
Any first-decision final, nonexistent reference or metric/config additions are rejected.

## Run state and evidence

Store runId (opaque, at most 64 characters), immutable request, created/running/completed/
stopped/failed status, stepCount, providerAttemptCount, retryCount, toolCallCount,
modelToolCallCount, revisionCount, at most three stored candidate/evaluation records,
normalized-action keys, monotonic start/deadline, optional terminal reason and elapsedMs.

toolCallCount includes every actually started solver operation (model evaluation, final
verification and fallback). modelToolCallCount is a subset. Do not claim total execution
zero merely because modelToolCallCount is zero. Evidence events retain phase/purpose,
candidate/evaluation identity, allowed/rejected category, counters and safe timings, with
at most 32 events. No secrets, raw prompt/response, hidden reasoning or solution history.

## Client result

The response has runId, status, stopReason, completed, counters, elapsedMs and kind.

- kind preview: contains source (generated, last_verified, template), settings, lanes,
  requestedDifficulty, computedDifficulty, verified true, measurements and a safe application
  summary. status is completed or stopped. Only completed/goal_completed/generated with
  exact target match may carry completed true.
- kind unavailable: contains a safe message; no lanes/settings/proof fields. completed false,
  with stopped or failed status. No Play action can be enabled by this variant.

The application constructs summaries from measured results and safe stop categories.
Model summary is bounded but not necessary to display; do not use it as proof.

## Active browser selection and advice

Keep GameConfig.difficulty as easy/normal/hard. A separate active-level selection stores
origin preset/generated, exact active lanes, and optional generated metadata (ratings/run ID).
While generated, GameConfig.difficulty remembers the last preset rather than describing
active traffic. No preset button is pressed. Selecting any preset returns to ordinary mode.

Extend shared advice difficulty to easy/normal/hard/generated. Summary construction takes
explicit active origin with a backwards-compatible preset default. The existing eight keys,
focus derivation and one-completed-run delay stay unchanged; do not send generated lanes
or proof to the coaching provider.
