# Security Policy Contract

Normative Week 08 policy for the existing local application. Existing success DTOs,
gameplay and 006-008 run semantics remain authoritative unless explicitly tightened here.

## 1. HTTP admission

Keep bind127.0.0.1, Host allowlist, same-origin endpoints, no CORS and no generic tools route.
Browser/model fields never select role, owner, provider, model, endpoint, key, tool registry,
limit or correlation ID. Strict existing request schemas reject those extra fields.

For AI POSTs perform: Host -> method -> Origin if supplied -> media type -> bounded body/
UTF-8/JSON -> strict domain schema -> service availability -> atomic admission -> service.
Every rejected initial request has zero provider attempts and zero tool executions.
Validation failure precedes rate accounting. A capacity-denied request spends no rate slot.

Origin is an access-policy signal, not trusted identity:

- Missing Origin is permitted for direct local clients with otherwise valid requests.
- Present Origin must exactly equal a configured origin, including scheme/host/port.
- Production accepts only http://127.0.0.1:<configured-port> and
  http://localhost:<configured-port>; null/multiple/nonmatching origins are rejected.
- Development may additionally accept http://127.0.0.1:5173 and http://localhost:5173,
  from server-owned configuration only. Pin Vite host/port5173 and strictPort to avoid
  silently creating another origin. Production does not inherit those development origins.
- Never trust forwarded headers, request-body origin fields or Origin substring matches.

No access-granting cookie/credential or private saved resource exists. Credential-based
CSRF and two-account ownership are conditionally N/A; retain executable local-scope,
Host/Origin/media-type controls. Do not claim Origin, CORS or UUIDs are authentication.

| Condition | HTTP / exact public error |
|---|---|
| Existing Host rejection | 403 / FORBIDDEN_HOST |
| Disallowed supplied Origin | 403 / FORBIDDEN_ORIGIN |
| Wrong AI method | 405 / METHOD_NOT_ALLOWED; Allow: POST |
| Unsupported AI media type | 415 / UNSUPPORTED_MEDIA_TYPE |
| Oversized body | 413 / REQUEST_TOO_LARGE |
| Invalid generation body | 400 / INVALID_GENERATION_REQUEST |
| Invalid advice body | 400 / INVALID_REQUEST |
| Generation capacity occupied, including draining | 409 / GENERATION_BUSY |
| Advice capacity occupied, including draining | 409 / ADVICE_BUSY |
| Shared rate window exhausted | 429 / AI_RATE_LIMITED |
| Provider/domain failure | Preserve existing fixed unavailable DTO/error behavior |
| Unexpected failure | 500 / INTERNAL_ERROR; no raw details |

Error JSON remains a single error field. Add rate-limit Retry-After as integer seconds,
at least1, rounded up until the oldest retained accepted timestamp expires.
Advice public error guard may be narrowly extended for new codes; the browser's existing
safe unavailable behavior is sufficient. Do not expose diagnostics or server policy.

## 2. Application-owned limits

These are deliberately small local-demo choices, not industry standards.

| Resource | Server limit / existing authority |
|---|---|
| Generator request | 2048 UTF-8 bytes, streaming enforced before JSON.parse |
| Advice request | 4096 UTF-8 bytes, streaming enforced before JSON.parse |
| Generator response | 16384 UTF-8 bytes |
| Advice response | 4096 UTF-8 bytes, server and bounded browser consumption before parse |
| Generator context / raw model output | 24576 / 8192 UTF-8 bytes |
| Advice raw provider text | 2048 UTF-8 bytes checked before JSON.parse |
| Compact solver evidence | 4096 UTF-8 bytes, strict parsed fields |
| Model output token ceilings | Generator2048; advice120, both server-owned |
| nextTip | Existing nonempty, at most160 string-length units |
| Generator decisions / attempts | At most5 decisions,6 total attempts,2 per decision |
| Candidates / revisions | At most3 /2, normalized repetition detected before reexecution |
| Solver work | At most8 executions including final/fallback verification |
| Solver invocation | 2000ms,35000 states,175000 actions, batches at most256, witness32768 actions |
| Generator decision cutoff / total deadline | 40000 /45000ms |
| Disabled provider attempt | Existing at most15000ms; generator clipped to outer budget |
| Disabled advice budget | At most2 attempts of15000ms and one250ms retry delay; no extra retry |
| Enabled provider phase | Existing15000ms shared; primary8000ms,backup7000ms, clipped to outer time |
| Active + draining jobs | Generation1; advice1; combined2 |
| Admission rate | Five jobs total per rolling60000ms, shared across both AI routes |
| Security events | At most32 per admitted job; last128 events globally in process ring |

Keep existing SDK internal retry setting at one underlying transport attempt. Every
primary/backup/retry invocation increments actual attempt accounting once when started.
No status, provider switch, new model decision or recovery path resets any budget.
If an earlier independent ceiling makes a particular upper bound unreachable, explain
that relationship; do not weaken production limits just to force an artificial trace.

Rate window: prune accepted timestamps <= now-60000 using monotonic server time.
Atomically check operation/combined capacity, then rate, then acquire and append one time.
No await between these actions. All handlers share one controller per server instance.
Different client IDs, Origin spellings and forwarded IPs never create new allowances.
Rate allowance is consumed by admission even if the job later fails or is cancelled.

## 3. Underlying work lifetime

Capacity counts admitted, running and draining jobs, not just open HTTP responses.
Attach tracking to actual provider invocation promises before timeout/abort races, in
primary and backup paths and in both operation modes. Release exactly once only when:

1. The logical service job is terminal.
2. Every underlying started provider invocation and owned local solver task has settled.

Request disconnect aborts cooperatively and suppresses response writes. It does not
automatically release occupied capacity. The solver already yields/checks cancellation;
retain its finite work bounds. A provider that ignores abort can leave a draining slot.
No queue and no timer-based blind release may admit unlimited replacement work.

Do not wait for primary abort acknowledgement before a permitted Feature008 backup.
Both promises may briefly remain unresolved, but they belong to the same retained lease
and existing attempt ceiling. Worst-case unresolved provider attempts remain bounded
by one generation lease with <=6 attempts and one advice lease with <=2 attempts.
That is local outstanding work, not a guarantee that remote billing/processing stops.

## 4. Tool, evidence and model authority

Keep exact name comparison to solveLevel; constructor/toString and every other name fail.
Arguments contain only validated lanes. Captured settings, limits, IDs and authorization
are application-owned. Unknown/malformed arguments are rejected before solver execution.
Final references must select the same run's solved candidate/evaluation pair; valid shape
alone is insufficient. Reverify exact stored traffic before preview.

Validate compact evidence shape/bytes before saving or passing to the next model call.
Reject forbidden fields inside evidence; project allowed fields from internal wrappers,
never spread an entire returned tool object. Keep proof and synthetic secret siblings out
of model context. Retain equality/proof checks, security-failure no-fallback behavior,
operational fallback labels and explicit Play.

There is no free-form user text in generator context. T09 deliberately supplies malicious
model proposals and proves execution control, not actual model prompt-injection behavior.

SDK response text limits are checked as soon as the adapter can inspect it and before
JSON parsing. The SDK may have materialized a larger wire response already; document
this residual allocation limit. Do not claim the post-SDK cap is a streaming SDK limit.

## 5. Production browser policy

When serving dist, set an enforcing Content-Security-Policy header with:

default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self';
img-src 'self' data:; font-src 'self'; object-src 'none'; base-uri 'none';
frame-ancestors 'none'; form-action 'none'

No script unsafe-inline, unsafe-eval, Report-Only substitution or bypassCSP. Local assets
and external stylesheet remain usable. data: images support the existing empty favicon.
Preserve X-Content-Type-Options:nosniff, Referrer-Policy:no-referrer and existing framing
header. Dev/HMR policy is separate and never used as production evidence.

Render all dynamic fields with textContent/equivalent plain-text output. Preserve static
app template construction where no external interpolation occurs. No Markdown/HTML/link
renderer is added. a < b, apostrophes and Serbian text must work.

For CSP proof use a second loopback script fixture that is known to return200 and execute
on an unprotected control page. On the production game page, require a corresponding
securitypolicyviolation for the script directive and absent execution marker. A404 or
failed connection is not evidence. The test runner must not bypass the page's CSP.

## 6. Events, secrets and local-data trust

Use exactly data-model.md's eight event keys; fixed event/outcome/operation enums.
reasonCode is one of ALLOWED, INVALID_REQUEST, REQUEST_TOO_LARGE, FORBIDDEN_HOST,
FORBIDDEN_ORIGIN, METHOD_NOT_ALLOWED, UNSUPPORTED_MEDIA_TYPE, SERVICE_UNAVAILABLE,
BUSY, RATE_LIMITED, TOOL_NOT_ALLOWED, INVALID_TOOL_ARGUMENTS, INVALID_TOOL_RESULT,
INVALID_FINAL_SELECTION, PROVIDER_UNAVAILABLE, DEADLINE, CANCELLED, COMPLETED,
INTERNAL_ERROR. Map existing internal stop reasons deliberately into this set.

Generate correlation IDs/timestamps server-side. For initial denial use counters0/0;
later denials preserve actual started attempts/tool work. Do not confuse provider
decisions with attempts or requested solves with final-verification executions.
Total executedToolCalls includes actual independent final/fallback solver verification.

Emit allow, deny and terminal events even when failover is disabled. Fixed schema and
projection precede sinks. Exceptions in diagnostic sinks never alter game/service flow.
Ring: last128 events, no disk persistence/public endpoint; process-local owner can inspect
through local debugging/test capture. Restart discards history; local memory is not a
tamper-proof audit system. Do not silently forward events to an external service.

No raw prompts, game statistics, provider output, tool names, exception messages/stacks,
tokens, keys or private reasoning. A newline-bearing tool name cannot forge an event.

Use W08_SERVER_SECRET_DO_NOT_EXPOSE only as synthetic config. Prove receipt by an injected
SDK client factory, then absence from dist and source maps if present, HTTP, captured
model contexts and event sinks. Inject the sentinel into adapter errors and disallowed
tool fields independently. Tests may retain synthetic fixtures, not real credentials.

The browser owns local game state; valid score arithmetic is not proof of play.
Forged summaries/settings must not alter admission, routing, tool scope or verified score.
No leaderboard or server-certified result is introduced. If explanation is needed,
document this in README/evidence without redesigning gameplay.
