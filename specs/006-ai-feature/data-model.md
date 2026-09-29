# Data Model: 006-ai-feature

## CompletedRunSummary

Only this aggregate is sent by the browser. The JSON object has exactly these properties:

| Field | Type and validation |
|---|---|
| outcome | won or lost |
| difficulty | easy, normal, or hard |
| ticks | safe integer greater than or equal to 1 |
| crossings | safe integer from 0 through targetCrossings |
| targetCrossings | safe integer from 1 through 10 |
| startingLives | safe integer from 1 through 5 |
| remainingLives | safe integer from 0 through startingLives |
| score | safe integer exactly equal to crossings multiplied by 100 |

Cross-field invariants: won requires crossings equal to targetCrossings and remainingLives greater than zero. Lost requires remainingLives equal to zero and crossings fewer than targetCrossings. Reject unknown keys, missing fields, wrong types, unsafe integers, or impossible combinations. Reject a UTF-8 serialized request body larger than 4,096 bytes.

The summary builder returns no value while the GameState is active. It does not include collision events, coordinates, lane data, actions, player identifiers, or raw state.

## Focus and evidence

Focus is derived by the backend after summary validation:

| Validated summary condition | Focus |
|---|---|
| Lost with zero crossings | survival |
| Lost with one or more but fewer than target crossings | goal_progress |
| Won | general |

If a future valid summary shape cannot support either specific focus, the fallback category is general. With the current schema, inconsistent or ambiguous game-state combinations are rejected rather than treated as unclear evidence.

Evidence is also generated deterministically by the service, using only validated counts. Maximum 120 characters. Example patterns:
- survival: “You lost all 3 lives before completing a crossing.”
- goal_progress: “You completed 2 of 3 crossings before all lives were lost.”
- general: “You completed 3 of 3 crossings.”

Exact grammatical formatting is an implementation detail, but values must be supported by the summary and the rendered field limit must be enforced.

## ProviderTip and AdviceResponse

Gemini returns a structured object with exactly one property:

- nextTip: non-empty plain string, maximum 160 characters.

The server rejects unknown keys, missing fields, empty output, or oversized output and does not retry malformed output.

The public success DTO has exactly three properties:

- focus: survival, goal_progress, or general.
- evidence: deterministic server-generated string, maximum 120 characters.
- nextTip: validated provider text, maximum 160 characters.

The client validates the DTO again before assigning the text to the polite status region.

## Lifecycle state

State is in memory only and resets on page reload.

| State field | Meaning |
|---|---|
| nextJobId | Monotonically increasing local identifier, used to reject stale completion callbacks |
| currentJob | Current pending job ID and its summary, or null |
| hiddenNotice | Ready or unavailable advice for the prior run, or null |
| visibleNotice | Previously analyzed advice currently shown on a completed-run screen, or null |

Transitions:

| Event | Transition |
|---|---|
| First run completes | No prior notice is shown; create current job and analyze this summary |
| Current job resolves successfully | Store a validated ready notice in hiddenNotice; do not show it |
| Current job fails safely | Store unavailable in hiddenNotice; do not show it |
| A later run completes with hiddenNotice | Move that notice to visibleNotice once, clear hiddenNotice, start analysis for the newly completed run |
| A later run completes while currentJob is pending | Invalidate/abort currentJob, set visibleNotice to unavailable for the superseded prior run, start analysis for the newly completed run |
| Late completion for a non-current job ID | Ignore without changing state |
| Mid-run restart or difficulty switch before a notice is displayed | Preserve hiddenNotice/currentJob; keep visibleNotice empty |
| Restart/difficulty switch after display | Clear visibleNotice; preserve current hidden/current job for the new run |
| Page reload | Return initial empty state |

A notice is consumed once when moved to visibleNotice. Its previous-run summary is no longer retained. A pending current job may retain only the summary needed to finish its request and is invalidated at the next run completion.
