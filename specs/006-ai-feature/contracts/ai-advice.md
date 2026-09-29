# API Contract: Delayed AI Advice

## POST /api/advice

Same-origin route on the feature 005 server. Requests are subject to the existing loopback bind, Host allowlist, security headers, and no-CORS policy. Responses use application/json; charset=utf-8 and Cache-Control: no-store.

### Request

Content-Type must be application/json, optionally with a UTF-8 charset parameter. Body must be valid UTF-8 JSON and no larger than 4,096 bytes. The root object must contain exactly:

~~~json
{
  "outcome": "lost",
  "difficulty": "easy",
  "ticks": 18,
  "crossings": 0,
  "targetCrossings": 3,
  "startingLives": 3,
  "remainingLives": 0,
  "score": 0
}
~~~

Runtime checks enforce enum values, safe-integer ranges, exact keys, score consistency, and outcome/crossing/lives invariants. Invalid input never invokes the advice service or Gemini.

### Success

HTTP 200 returns only the validated client DTO:

~~~json
{
  "focus": "survival",
  "evidence": "You lost all 3 lives before completing a crossing.",
  "nextTip": "Wait at a safe row until a vehicle passes."
}
~~~

The backend derives focus and evidence. Gemini receives those derived values with the summary and returns only a structured nextTip field. No tools, function calls, conversation history, or unbounded output.

### Errors

| HTTP | Stable body | Condition |
|---|---|---|
| 400 | {"error":"INVALID_REQUEST"} | Malformed JSON, unknown/missing fields, wrong values, or cross-field invariant failure |
| 405 | {"error":"METHOD_NOT_ALLOWED"} | Method other than POST; include Allow: POST |
| 413 | {"error":"REQUEST_TOO_LARGE"} | More than 4,096 UTF-8 bytes |
| 415 | {"error":"UNSUPPORTED_MEDIA_TYPE"} | Content type is not application/json |
| 503 | {"error":"ADVICE_UNAVAILABLE"} | Missing provider key, timeout after allowed attempts, transient retries exhausted, permanent provider failure, or malformed model output |
| 500 | {"error":"INTERNAL_ERROR"} | Unexpected internal exception; fixed public body only |

The service aborts where possible after client disconnect or supersession. The frontend also checks its local job ID before applying any result.

## Provider policy

- Attempt deadline: 15,000 ms per attempt.
- Maximum: two attempts per current analysis.
- Retry only transient network/provider, retryable rate limit/server status, and attempt timeout.
- At most one bounded delay of 250 ms between attempts.
- Never retry invalid request, missing key, permanent provider error, or malformed structured output.
- Gemini output schema is one non-empty nextTip string, maximum 160 characters; configured output budget is at most 120 tokens.
- Public focus/evidence are deterministic, maximum 120 characters for evidence. DTO keys and values are validated before return.

## Privacy and diagnostics

Never log API keys, request summaries, advice text, raw provider responses, stack traces, or provider exception messages. Permitted diagnostics are event kind, response status class, attempt number, and duration. Never return raw provider details to the browser.
