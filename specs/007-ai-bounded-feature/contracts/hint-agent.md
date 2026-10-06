# Hint Agent and API Contract

This contract details [FR-002 through FR-012 and FR-019](../spec.md#requirements). `spec.md` remains the source of user requirements.

## Browser request

`POST /api/hint`

- `Content-Type: application/json` (optional exact UTF-8 charset parameter only)
- maximum 2,048 UTF-8 bytes
- exact `HintSnapshot` keys: `status`, `difficulty`, `tick`, `x`, `y`, `lives`, `crossings`, `crossingsToWin`
- unknown fields and invalid cross-field states rejected before provider or solver calls

Stable errors: `400 INVALID_REQUEST`, `413 REQUEST_TOO_LARGE`, `415 UNSUPPORTED_MEDIA_TYPE`, `405 METHOD_NOT_ALLOWED` plus `Allow: POST`, and `503 HINT_UNAVAILABLE`. No CORS headers or provider diagnostics.

## Allowlisted model/tool flow

1. Provider step 1 must propose exactly one `find_safe_path` call with `{}` arguments. No tool runs before the server validates the proposal.
2. The server calls the deterministic solver once. There is no second tool, client-selected argument, filesystem, shell, URL, or arbitrary code access.
3. On `verified`, the server sends a compact safe result (`verified`, step count, final crossings, unchanged lives) to provider step 2 as the function response. Step 2 may return only `{ "explanation": "..." }` and cannot return a route/outcome.
4. On `no_safe_path` or `search_limit`, the server returns a fixed empty-route DTO without asking the model to describe a result it did not prove.
5. The server constructs the final response by attaching the validated route from the solver. A route is never accepted from model text or provider JSON.

The adapter keeps the first model candidate and function-call ID as opaque request-local server context to complete the function-call turn; neither is logged or returned to the browser.

## Limits

| Limit | Value | Stop behavior |
|---|---:|---|
| Logical model steps | 2 maximum | Stop before any extra call. The verified path uses both; non-verified solver outcomes end safely after the tool. |
| Tool executions | 1 maximum | Repeated/unknown proposal stops without a second execution. |
| Provider attempts | 4 total; at most 2 for each step | Retry only transient provider/network errors or per-attempt timeout. |
| Provider attempt deadline | 15 seconds | Abort/ignore provider result; only this timeout is retryable. |
| Total workflow deadline | 45 seconds, including search | Return `HINT_UNAVAILABLE` on exhaustion; no tool/workflow replay. |
| Solver expansion cap | 30,000 safe states | `search_limit` unless a route was already proved. |
| Route cap | 512 actions | `search_limit` if a proof would require a longer route. |
| Request bytes | 2,048 | `413 REQUEST_TOO_LARGE`. |
| Response bytes | 65,536 | Replace oversized result with fixed unavailable outcome; do not truncate a route. |
| Explanation | 160 UTF-8 characters maximum | Reject malformed output; fixed unavailable response. |

## Response

Successful HTTP response is exactly:

```json
{
  "outcome": "verified",
  "origin": {
    "status": "active",
    "difficulty": "normal",
    "tick": 12,
    "x": 4,
    "y": 3,
    "lives": 2,
    "crossings": 1,
    "crossingsToWin": 3
  },
  "explanation": "The numbered cells show the next safe crossing without losing a life.",
  "steps": [
    {
      "action": "up",
      "entered": { "x": 4, "y": 2 },
      "tick": 13,
      "x": 4,
      "y": 2,
      "lives": 2,
      "crossings": 1,
      "status": "active"
    }
  ]
}
```

The example is abbreviated and illustrative. A verified response ends at the first safe entry to any `y = 0` cell and increases crossings by exactly one. The final state is `won` only if that crossing reaches `crossingsToWin`; otherwise the game remains `active`. In a production response every `steps` entry is present and replay-validated. `no_safe_path` and `search_limit` use `explanation: ""` and `steps: []`; the UI uses fixed status text for those outcomes.

## Runtime validation order

1. Host allowlist and route/method.
2. Content type and declared/streamed byte limits.
3. Strict UTF-8 JSON parse.
4. Exact snapshot shape, field ranges, and active cross-field invariants.
5. Model proposal exact shape/name/arguments.
6. Solver result route size and full replay validation.
7. Provider explanation exact key, text length, and safe character constraints.
8. Final DTO shape, origin equality, invariants, and response byte cap.

Any invalid request exits before provider or solver invocation. Any invalid model/tool/result response exits with a fixed safe error.
