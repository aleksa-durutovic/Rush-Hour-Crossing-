# Contract: cumulative attempts and bounded generation response

P1/P2/P3 and local implementation approved by the owner 2026-10-28. The two runtime
corrections are implemented; account review remains pending. Publication was separately
authorized after implementation. Existing006-009 limits remain binding.

## 1. Session and ownership

One session is the lifetime of the Node process serving the application. Its one admission
controller owns one cumulative budget, shared by both routes and all primary/retry/backup
invocations. Approved allowance:60 attempts per process. No clock-based refill. Process
restart (including tsx watch restart) resets it; reload/game restart/new request does not.
Multiple processes are independent; this is not durable/account-wide or a monetary cap.

Production already constructs one controller in server/index.ts and shares it through
createRequestHandler. Preserve that composition. Do not construct a fresh budget inside
tryAcquire, generate, analyze, a model decision or a retry, and do not add a reset surface.

## 2. Initial HTTP admission

Retain Host -> method -> Origin -> media type -> bounded UTF-8/JSON/domain validation ->
service availability -> capacity/rate checks. If budget is empty, deny before lease
creation and before appending the accepted timestamp. Capacity/rate precedence stays009.
An initially rejected invalid/busy/rate/budget request adds no accepted timestamp or
provider/tool work. The empty check is not reservation; admitted competing jobs must
still authorize every provider start separately. No reservation for speculative future calls.

| Condition | Public handling |
|---|---|
| Existing busy/rate/invalid cases | Unchanged409/429/4xx and existing Retry-After for rate only |
| Initially empty advice allowance | 503, exactly {"error":"ADVICE_UNAVAILABLE"} |
| Initially empty generation allowance | 503, exactly {"error":"GENERATION_UNAVAILABLE"} |
| Exhaustion within advice | Existing AdviceServiceError ->503 ADVICE_UNAVAILABLE |
| Exhaustion within generation | Existing200 strict response: stopReason provider_attempt_limit; verified fallback or unavailable |
| Caller disconnect/cancel | No late response or fallback; existing cancellation precedence |

503 budget failure has no Retry-After prediction. Both browser clients already treat
non-success HTTP responses as null. No response guard/DTO enum expansion is needed.
Initial denial records fixed PROVIDER_UNAVAILABLE with provider/tool counts0/0 in the
existing event schema. During jobs use actual per-job counts, never the process total.

## 3. Atomic actual start

Immediately before invoking the selected provider adapter, enforce signal/terminal/
deadline/per-operation limits, then authorize/debit one shared attempt synchronously.
There is no await between allowance check/debit, actual-count commitment and invocation.

- Allowed start: process+1, lease providerAttempts+1, operation attempt+1; retryCount+1
  only for a recovery invocation that really starts. Enabled role/events align here.
- Denied start: adapter not called; all those counts/role/pending-work entries unchanged.
  No further provider retry or model switch follows this denial.
- Already aborted/expired/terminal: zero debit/start. Final permitted invocation may
  finish after it consumes the last token, subject to normal timeout/cancellation.
- Adapter sync throw/rejected promise/failure/refusal/timeout: one debit retained.
- A provider attempt means entry into decide/generateTip at the server adapter boundary.
  It counts even if the adapter fails locally before a network exchange; this conservative
  allowance cannot infer Google acceptance, billable tokens or actual cost.
- No SDK hidden retries (retain attempts1); no queue, borrowing, refill or refund.
- Context preparation/schema checks happen before authorization. Use projected next
  counters for generator context, then commit them only at allowed start.
- Started callbacks/events must not execute before the lease gate. Preserve the typed
  local exhaustion marker before toGeneratorProviderFailure, advice normalization and
  phase timeout classification; it is not a retryable ProviderFailure.
- Existing callback changes are internal. The enabled phase supplies a started callback
  that each service calls only from its authorized provider thunk; direct/fake phase
  runners use that same contract. If denial occurs, no attempt_started/role_switched.
- Cancellation remains dominant before/after every asynchronous boundary. Old results
  cannot restart a stopped job; a denied reservation retains no attempt timer/listener.
  Existing waits scheduled before denial are bounded and cancellable; denial schedules none.

## 4. Lease lifetime and local recovery

Track returned underlying provider promises before race wrappers. Budget denial adds
none; previously started unresolved promises remain attached. Logical terminal plus zero
pending work releases once; otherwise retain draining capacity until all settle.
A synchronous throw creates no unresolved promise but still consumes its started token.
Retain cooperative solver tracking and no blind release on timeout/HTTP close.

Do not reject already-started completion solely because remaining is now zero. A valid last
final decision may complete its independent proof inside existing limits.
If another provider decision/retry/switch is needed and denied, map generation to existing
provider_attempt_limit. Existing last-verified candidate proof/identity checks or one fresh
counted template verification may recover, within8 solver calls/40s cutoff/45s deadline.
Fallback remains completed=false with original stop reason, actual rating and explicit Play.
No local model-directed tool executes for a denied provider proposal. Initial admission
denial has zero solver starts. Security/schema/cancellation failures keep their no-fallback
rules. Advice failure remains hidden until the next completed run, never a synthetic tip.

## 5. Browser byte/encoding/cleanup policy

The generator client accepts at most16,384 actual delivered Uint8Array bytes. Exact equality
is allowed. Read sequentially; compare prospective total before retaining a chunk.
On first overflow cancel immediately, retain no oversized chunk, and read no further.
Do not use response.text()/json() or trust Content-Length; its absence/value never raises
the ceiling or decides successful parsing. Non-success HTTP bodies are not parsed.

Read complete bounded bytes first. Only then fatal TextDecoder('utf-8'), JSON.parse and
the existing strict generationResponseSchema. Split valid UTF-8 is accepted; malformed/
truncated UTF-8, malformed/incomplete JSON and stream failures return null.
A clean close containing a complete valid DTO is acceptable even if an advisory length
header disagrees; transport errors or incomplete data are not.

Acquired-reader cleanup is owned by one finally. Abort before/after each await prevents
acceptance; a temporary abort listener requests cancel even during a pending read.
Cancel unfinished bodies on abort/overflow/error and best-effort unused non-success bodies.
Handle cancel rejection without unhandled rejection or waiting forever for acknowledgement;
remove abort listeners and release the lock on success, failure and cancellation.
No subsequent read after overflow. Underlying source prefetch may have occurred; do not
claim a source/network total or absolute-memory bound of16,384.

Controller request IDs and signal checks stay authoritative for stale responses. No change
to lifecycle/controller/app wiring, advice reader, Play semantics or rendered text.

## 6. Preserved independent ceilings

Generation:5 decisions,6 starts/run,2/decision,3 candidates/2 revisions,8 solver executions,
2s solver/35,000 states/175,000 actions/batches256,40s cutoff/45s absolute deadline.
Advice:2 starts/job; disabled15s/attempt with250ms bounded retry.
Enabled:8s primary,7s backup within15s shared phase, clipped to outer time; one selected
sticky Gemini2.5Flash backup, disabled by default. No classification or provider changes.
Admission:1 generation,1 advice,2 combined active+draining;5 admissions/rolling60s.
Game rules/presets/golden paths, real solver, final verification, Play and advice delay intact.
