# Regression and eval expectations: feature010

Written2026-10-28 before implementation or new probes. Fixed acceptance criteria below
remain unchanged. See `docs/EVIDENCE_W08.md` for actual B00/S03 baseline and corrected
signals and the final gate results. Other individually unmeasured cases remain NOT RUN.
Use synthetic keys/fake SDK only. No missing-module failure counts as the measured weakness.

## Composition and observation

Budget unit tests inject small finite N without changing production policy. Integration
uses real handler/admission/services/normalizers/adapters and actual solver from
tests/server/fixtures/w08-server.ts; only SDK transport/time and fault outputs are fake.
Capture actual SDK/adapter starts, per-job DTO/lease counters, events, pending work,
release count and solver purpose. No secrets/raw payloads in evidence.
For actual-counter assertions, service attempt count = started adapter callbacks =
lease providerAttempts; SDK transport can be lower after local adapter failure. Track
that distinction explicitly; never invent a network attempt from an adapter entry.

Streaming fixtures invoke actual requestGeneratedLevel. Use controlled ReadableStream
sources, preferably highWaterMark0 to avoid source-prefetch ambiguity; capture read,
cancel, releaseLock and listener cleanup. Test bounded payload/parse behavior, not a
claimed browser/network allocation cap. Valid exact-limit JSON is padded with whitespace.

## US1 - Cumulative allowance

| ID | Fixed fixture/action | Expected signal | Future test path |
|---|---|---|---|
| B00 | Before adding runtime modules: use existing fake-backed fixture with monotonic time advanced between requests; healthy generation+advice cycles attempt more than approved N=60; repeat identical trace after correction | At most N actual starts; later valid calls fixed unavailable, no extra provider/tool work. Existing composition supports this probe without new budget imports/injection; current baseline is expected to exceed N. Freeze approved N before first run | tests/security/session-budget.test.ts |
| B01 | After small-limit injection is available, N=3: successful two-decision real-solver generation, then one advice call, then another valid job | Exactly3 adapter/SDK starts; later initial denial503; zero new solver/provider starts. B00, which needs no new API, is the separate unchanged pre/post gap measurement | tests/security/session-budget.test.ts |
| B02 | N=1 consumed; advance monotonic time to59,999,60,000,60,001 and120,000ms; separately construct with0,negative,fractional,NaN,Infinity and unsafe integer limits | No refill at any boundary. Admission timestamps can prune but cumulative budget stays empty. Invalid trusted-construction values fail closed before any invocation; no unlimited/disabled interpretation | tests/security/provider-attempt-budget.test.ts; session-budget.test.ts |
| B03 | Exhaust using both routes in both orders; different bodies/Origins/client IDs/new jobs | One shared allowance; none of those inputs creates another pool; unknown budget/reset/model fields still fail schema before accounting | tests/security/session-budget.test.ts |
| B04 | Retryable primary with N=1 versus N=2, failover disabled, both operations | N1 starts1 and denied retry adds0; N2 starts2; generator retryCount reflects only an actual retry; no unhandled timer/listener leftovers | tests/server/advice-service.test.ts; level-generator-service.test.ts |
| B05 | Enabled primary transient/quota/timeout; N=1 versus N=2, both operations | N1 no backup start/role_switched/second attempt_started; N2 one backup inside unchanged8/7/15s and total ceilings | tests/server/failover-policy.test.ts; tests/security/session-budget.test.ts |
| B06 | Generator switched to backup, later backup-only transient decision hits last token | Every backup/retry counts once; sticky selection remains; no new decision or phase refills allowance; denied recovery does not inflate retryCount | tests/server/level-generator-service.test.ts |
| B07 | Generation+advice admitted with one token; race actual starts in both scheduling orders | Exactly one winner. Loser callback not invoked; no negative remaining, excess starts, fake pending promise or local counter increment | tests/security/provider-attempt-budget.test.ts; session-budget.test.ts |
| B08 | Abort before start, after last start, during backoff and between primary failure/backup | Before start0 debit; after start retained debit. No late retry/switch/preview, cancelled remains authoritative | tests/security/admission.test.ts; tests/server/failover-policy.test.ts |
| B09 | Started adapter throws synchronously or returns rejected promise | Exactly1 process/lease/service attempt; correct failed cleanup; no phantom pending work or refund; next denied start counts0 | tests/security/admission.test.ts; tests/server/advice-service.test.ts; level-generator-service.test.ts |
| B10 | Last token's provider ignores abort past HTTP timeout/disconnect; optional earlier primary still unresolved | Keep lease draining until all started work settles; budget denial adds no pending entry; late output ignored; release once on final settlement. Another valid operation after real release remains budget-denied | tests/security/session-budget.test.ts |
| B11 | Initially empty allowance: invalid, busy, rate-limited and valid requests; repeated budget denials | Preserve precedence; invalid/busy/rate/empty denials add no accepted timestamp; valid empty denial has0 provider/solver work and no lease. Admitted race loser retains its original accepted timestamp only | tests/security/admission.test.ts; session-budget.test.ts |
| B12 | Budget gate denies primary/retry/backup in each service/mode; later advance all timers and settle faults | Sentinel survives normalization; no retry/model switch/new call. Counts/events unchanged by denied start; no unhandled rejection, leaked abort listener or attempt timer. Prior real work remains tracked | tests/server/failover-policy.test.ts; advice-service.test.ts; level-generator-service.test.ts |
| B13 | One proposal solved, next decision denied; also no-candidate case and exhausted solver/time reserve | Reuse only valid same-run proof or one fresh counted template solve; completed=false/provider_attempt_limit, actual rating. If no allowed proof, unavailable. Initial deny never triggers template. Existing cancellation/security no-fallback unchanged | tests/server/level-generator-service.test.ts |
| B14 | Final allowed invocation selects valid evidence and consumes last token | Normal independent final verification can still complete within existing limits; budget0 alone does not discard a valid in-flight success | tests/server/level-generator-service.test.ts |
| B15 | Exhaust real fake-backed server, reload browser, complete/request again on same process | Budget stays exhausted; normal game works, no automatic retry, Play never enabled by failure. Advice unavailable appears only after the next completed run | e2e/security.pw.ts |
| B16 | Inspect production composition and compare fresh isolated test composition versus another request/handler sharing same controller | Production constructs its controller once; requests/handlers using it retain count. Fresh test composition proves initialization only, not an executed real-process restart. Document actual restart/watch reset and independent-process limitation | tests/security/session-budget.test.ts; provider-attempt-budget.test.ts |
| B17 | Inspect public503 and mid-run fallback, events/context/dist plus synthetic error value | Fixed errors, no remaining process count/key/raw exception/config. Event providerAttempts stays per-job0..6, not cumulative total. Existing synthetic-secret proof remains passing | tests/security/session-budget.test.ts; tests/security/privacy.test.ts |
| B18 | Ordinary enabled/disabled retry/timing/phase tests under a sufficiently large test budget | Preserve per-run max6, max2/decision, advice2,8/7/15s phase,40/45s generator, no hidden SDK retry; retain actual counter/context expectations | tests/security/budget.test.ts; existing server suites |

## US2 - Stream consumption

| ID | Fixed fixture/action | Expected signal | Future test path |
|---|---|---|---|
| S01 | Valid strict DTO under limit, one-byte/mixed chunks and split multibyte Serbian text | Same validated DTO, valid UTF-8 preserved, reader released | tests/level-generator-client.test.ts |
| S02 | Valid DTO plus whitespace to exactly16,384 bytes; final chunk reaches equality | Accepted after fatal decode, JSON and strict schema; no overflow cancellation; lock released | tests/level-generator-client.test.ts |
| S03 | 16,385 bytes plus long tail;128KiB total in1024-byte chunks | First overflowing delivered chunk triggers cancel; no subsequent read, no whole-body text/json and no parse. Current client is expected to consume all, as in the supplied review probe | tests/level-generator-client.test.ts |
| S04 | Single128KiB delivered chunk or overflow after exactly16,384 | Cancel on first offending read; retain no overflowing chunk, no parse or later read. No claim that source never allocated it | tests/level-generator-client.test.ts |
| S05 | Repeat under/exact/oversize cases with missing, too-small, too-large and malformed Content-Length | Actual byte count/valid content decides, no cap bypass or reliance on declared length | tests/level-generator-client.test.ts |
| S06 | Invalid UTF-8 sequence/incomplete final multibyte character; valid split multibyte control | Fatal reject invalid forms before JSON parse; valid split accepted; cleanup always | tests/level-generator-client.test.ts |
| S07 | Malformed JSON, valid JSON but unknown/invalid/cross-field-inconsistent DTO, empty body | null, never partial preview, unchanged strict validation | tests/level-generator-client.test.ts |
| S08 | Stream rejects mid-read; closes early with truncated JSON; clean valid JSON close with misleading larger header | Error/truncated data rejected; valid clean DTO accepted based on actual content; all acquired readers released | tests/level-generator-client.test.ts |
| S09 | Abort before fetch, after headers, during pending read and immediately after final bytes | No accepted result; no fetch when initially aborted; unfinished stream cancel requested, abort listener removed, reader released even if fake fetch ignores signal | tests/level-generator-client.test.ts |
| S10 | Missing body, non2xx with body, read rejection, rejecting cancel, cancellation acknowledgement that never settles | null; no parse; best-effort cancel where applicable, no unhandled rejection or wait for acknowledgement, acquired locks released | tests/level-generator-client.test.ts |
| S11 | Success/failure/overflow/abort; capture reader and signal cleanup counts | release once per acquired reader, zero outstanding owned read/listener after settlement, no read after overflow/cancel decision | tests/level-generator-client.test.ts |
| S12 | Browser oversized response, then valid preview; cancel/supersede/reset during old stream | Failure leaves current game unchanged and Play disabled; a later valid current preview works; late old response ignored and cannot start a game | e2e/level-generator.pw.ts |

## Preserved behaviors and manual review

| ID | Fixture/action | Expectation | Future path |
|---|---|---|---|
| G01 | Normal two fake model decisions around real solveLevel plus independent final proof; explicit Play | Exactly verified traffic/settings, normal counters, no game mutation before Play | tests/security/flow.test.ts; e2e/security.pw.ts |
| G02 | Existing presets/golden paths/R restart/difficulty and generated completion/advice flows | All unchanged; advice eight fields and one-completed-run delay preserved | tests/fixtures/golden-paths.ts (read-only); existing unit/e2e suites |
| G03 | Boundary, fake SDK retry/options, synthetic sentinel/dist/context/log tests | Keys/SDK remain server-side; no new env reader/provider; no secret disclosure | tests/server/boundaries.test.ts; gemini-backup-provider.test.ts; tests/security/privacy.test.ts |
| M01 | Owner manually inspects existing Google project controls using separate checklist | All actual-account items stay pending unless privately verified; no calls/settings changes in this session | specs/010-ai-resource-bounds/PROVIDER_ACCOUNT_CHECKLIST.md |

## Result recording

For each future case record baseline observation, changed observation, exact test/command,
actual counters/cleanup and limitations in docs/EVIDENCE_W08.md. New case status remains
NOT RUN until executed. Existing baseline has391 unit tests plus37 browser cases; those
numbers are observations of baseline checks, not a promise of future totals.

## Executed probe status

| ID | Pre-change observation | Corrected observation | Status |
|---|---|---|---|
| B00 | Actual fake-backed HTTP composition recorded63 starts, above N=60 | Same request schedule recorded exactly60 starts; subsequent generation/advice denied without extra provider or solver work | PASS; detailed command and suite evidence in docs/EVIDENCE_W08.md |
| S03 | Actual generator client consumed131,072 bytes from a controlled128KiB stream before rejecting | Read17 chunks/17,408 delivered bytes, retained at most16,384, requested one cancel, performed no18th read | PASS; detailed command and suite evidence in docs/EVIDENCE_W08.md |

The fixed fixtures and acceptance criteria above were not changed. Other cases covered by
the unit/integration/browser suites are recorded at suite level in docs/EVIDENCE_W08.md;
their individual eval IDs have not all been separately measured. M01 and the owner-only
M1-M7 account checks remain unverified.
