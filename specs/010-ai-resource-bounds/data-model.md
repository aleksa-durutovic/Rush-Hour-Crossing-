# Data Model: cumulative attempt allowance and bounded read

Existing job/preview/advice DTOs are reused; no database, cookie, account or saved session.

## Process provider budget (server only)

- limit: **positive safe integer; approved default60; immutable after construction**.
- started: **integer0..limit; monotonic; never refunded after an invocation starts**.
- remaining: **derived limit-started; never negative; no public endpoint/DTO field**.
- lifetime: **one serving Node process; new process resets; no other reset operation**.
- construction is trusted server composition; tests may inject a small positive limit.
- no client/model/environment selection and no mutable global price/token accounting.

A reservation is immediately consumed by one synchronously coupled start, with no queue,
await, free-standing reservation handle or refund API. Before eligibility succeeds, state
does not change. Sync throw after invoking the adapter counts as one started attempt.

## Existing job lease and control outcome

Reuse correlationId, operation, acquiredAt, logical terminal, pendingWork, release flag,
providerAttempts and executedToolCalls. Keep existing per-job ranges (provider0..6,
advice maximum2; solver0..8). The process count may exceed6; never place it in that field.

Add an internal admission denial variant budget_exhausted, with no Retry-After estimate.
Add a server-only typed ProviderBudgetExhaustedError; it is not a provider category or
a raw user-visible exception. Handle it before provider/timeout normalization.

Transitions: available -> fewer remaining after start -> exhausted at remaining0.
Exhausted remains exhausted until a new serving process exists.
Lease transitions remain running -> logical terminal -> draining/released exactly as009.
Budget empty does not terminalize or abort another job that already started.

## Actual invocation accounting

Prepare valid projected context and check existing run/signal/deadline limits first.
One authorized start updates process count, lease count, service/phase counts and routing
at the same actual invocation boundary. No external diagnostic callback can turn a denied
reservation into a started event. Started events must still describe synchronous throws.
A denied retry does not increment retryCount; decision count may describe a considered
logical decision, but is never advertised as a provider start. Solver counts are separate.

## Bounded response read (browser local)

- limit: **16,384 delivered bytes; exact limit allowed; no retained overflowing chunk**.
- retainedSize: **integer0..16,384; sum of retained Uint8Array.byteLength values**.
- reader: at most one acquired reader; lock released exactly once in finally.
- abort listener: transient; removed on every exit.
- terminal outcome: validated GenerationResponse or null, never partial JSON/preview.
- state: fetching -> reading -> bounded EOF -> fatal decode -> JSON/schema validation;
  overflow/abort/error -> cancel unfinished body -> cleanup -> null.
- cancellation acknowledgement/rejection is observed without blocking indefinitely.
- source-prefetch and one arbitrarily large delivered chunk are not preventable allocations.

## Account verification record

Item ID, official URL, check date, enforcement type, private owner inspection instruction,
and status (pending/unverified or owner-supplied sanitized confirmation). Do not store
actual key strings, private project/account identifiers, screenshots containing secrets,
raw provider data or invented account configuration.
