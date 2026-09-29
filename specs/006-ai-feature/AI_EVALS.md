# AI Feature Evaluation Expectations — Draft

**Status**: Expectations only; not executed  
**Feature**: Delayed Post-Game AI Advice  
**Created**: 2026-09-29  
**Purpose**: Freeze expected behavior before implementation and avoid live Gemini calls in routine tests.

Use a fake provider and deterministic clock for automated cases. Do not put API keys or real provider payloads in fixtures. Record actual results only after implementation.

## Evaluation Matrix

| ID | Scenario | Setup / Input | Expected result | Actual result |
|---|---|---|---|---|
| A1 | First completed game | No prior run; finish one game; fake provider returns valid advice | Summary submitted once; normal end state; no visible advice yet. | Not run |
| A2 | Next game with advice ready | Complete run one, resolve its advice, play and finish run two | Run-one advice appears once and only after run two ends. Run two is summarized and submitted. | Not run |
| A3 | Response arrives during next game | Resolve run-one advice while run two is active | Advice stays hidden until run two ends, then appears once. | Not run |
| A4 | Next game finishes before old request | Keep run-one request pending; finish run two; resolve run-one request late | Run-one job is canceled or invalidated and never shown. Run two's summary is submitted. Late output has no effect. | Not run |
| A5 | Invalid local summary | Submit missing, out-of-range, or unsupported fields to backend | Stable client error; fake-provider call count is exactly zero. | Not run |
| A6 | Transient failure then success | Fake provider fails once transiently, then returns valid advice | No more than two provider attempts; valid advice remains hidden until the next game ends. | Not run |
| A7 | Timeout and exhausted retry | Fake provider never settles; advance controlled clock across both attempt deadlines | Each attempt stops at 15 seconds; total attempts do not exceed two; only the safe unavailable message is shown at the next end. | Not run |
| A8 | Non-retryable or malformed response | Provider returns invalid structured output or local validation fails | Invalid output is not success or rendered. Deterministic local/schema errors are not retried. | Not run |
| A9 | One-time consumption and deletion | Resolve advice, finish next run, restart, and render again | Advice is not shown again; previous summary/advice state is cleared after consumption. | Not run |
| A10 | Existing game behavior | Replay current win/loss golden paths, restart, and difficulty selection | Tick, score, lives, crossings, and end outcomes match existing expectations. AI does not change gameplay. | Not run |

## Test Layers

- **Unit tests**: Advice lifecycle, first-run suppression, hide-until-end, one-time consumption, deletion, supersession, and stale-response rejection.
- **Backend contract tests**: Valid request/response, invalid local input with zero fake-provider calls, malformed output, safe error mapping, and attempt count.
- **Timeout tests**: Fake timers/provider promises; assert each attempt ends at 15 seconds and there are at most two attempts.
- **Browser smoke test**: Complete two short runs with a controlled fake API; assert no first-run advice, no advice during run two, and one previous-run message after run two ends.
- **Live provider check**: A small, manually triggered confirmation after fake-provider tests pass. Keep it within the W04 development/demo call budget; do not make live calls part of ordinary CI.

## Acceptance Notes

- An HTTP 200 response is not sufficient evidence of success; advice must pass runtime schema and length checks.
- User-facing failures must not contain provider payloads, stack traces, request headers, or secrets.
- Each request is associated with one completed run so a stale response cannot attach to a newer game.
- Every result remains “Not run” until the corresponding check executes.
