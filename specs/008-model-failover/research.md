# Research and decisions: Model failover

**Date**: 2026-10-06. Planning research, not runtime/live-provider evidence.

## Observed baseline

At planning time, generation used gemini-3.1-flash-lite in server/advice/gemini-provider.ts
and both services owned timers/retries. The recorded generator limits are six total attempts,
two per decision, five decisions, 40s decision cutoff/45s total; advice used two15s attempts
and250ms retry delay. The installed SDK uses one underlying attempt. Preserve the corrected
generator decision envelope and output validation. Baseline and final offline check results
are recorded in docs/EVIDENCE_008.md; provider access remains unverified.

## Decisions

### D1: Services own switching

**Decision**: Each service chooses/counts attempts; adapters make one request only.
**Rationale**: A composite fallback adapter would hide extra attempts from existing budgets.
**Alternatives**: Recursive fallback and generic routing/agent frameworks add unnecessary ambiguity.

### D2: Classify availability separately from rejection

**Decision**: Only rate_limit, timeout and temporary_unavailable permit model switching.
**Rationale**: Recovery must not hide malformed output, credentials or refusal.
**Alternatives**: Switch-on-any-error can bypass validation and conceal programming errors.
Gemini documents429 for exhaustion and503 for temporary service unavailability.
[Official troubleshooting](https://ai.google.dev/gemini-api/docs/troubleshooting).

### D3: Enabled8/7/15-second policy; disabled unchanged

**Decision**: Primary8s, backup7s, shared provider phase15s including overhead/delays.
Switch immediately; backup-only transient retry waits250ms inside that same deadline.
**Rationale**: Leave useful recovery time without expanding outer budgets.
**Alternatives**: Primary8s plus backup15s was considered in research but rejected in favor
of the previously discussed shared15s design. Parallel racing duplicates usage. Disabled
mode retains original timings so missing backup setup does not worsen primary availability.

### D4: Sticky routing is per run

**Decision**: After switching, remaining generator decisions use backup; new jobs start primary.
**Rationale**: Avoid repeating a known slow/exhausted primary without shared state.
**Alternatives**: Process-wide quarantine and switching back each decision are wider/less predictable.

### D5: User-selected Gemini 2.5 Flash backup for both operations

**Decision**: The user selected Gemini 2.5 Flash (`gemini-2.5-flash`) for generator and
advice backup on 2026-10-06. Google's official model catalog lists that stable model ID, and
the structured-output support table includes Gemini 2.5 Flash. The existing `@google/genai`
SDK is sufficient; no new runtime dependency is justified. Use the same strict operation
schemas and output limits as primary, with the application-clipped timeout and abort signal.
Official sources: [model catalog](https://ai.google.dev/gemini-api/docs/models),
[structured-output support](https://ai.google.dev/gemini-api/docs/generate-content/structured-output).
**Rationale**: The model is explicitly user-selected and documents the required structured
output capability for both operation envelopes.
**Access/quota limitation**: Google's current docs note that Gemini 2.5 model access is
limited to users who have actively used those models, and that rate limits are applied per
project (not per API key) and vary by model/tier. Account access is not verified; this work
does not make a live request. A Gemini model switch may not help project-wide quota exhaustion.
Official source: [rate limits](https://ai.google.dev/gemini-api/docs/rate-limits).

### D6: No new player API/UI

**Decision**: Keep provider metadata internal and existing DTOs/controls unchanged.
**Rationale**: Players need verified challenges and delayed tips; setup is server-owned.
**Alternatives**: Model pickers, key entry or new routes are unnecessary scope.

### D7: Reconcile scope before feature code

**Decision**: The user explicitly authorized both AI operations and the narrow amendments in
compatibility.md. The authority files have been reconciled before behavior changes; this is
not represented as student-pair agreement.
**Rationale**: Avoid silently overriding the higher-priority single-provider contracts.
**Alternatives**: Leaving contradictory authority documents would make implementation ambiguous.

## Research contributions

Two read-only agents reviewed architecture/budgets and verification requirements as required
by speckit-plan. Their findings were consolidated above. No files, dependencies, credentials
or live-provider state were changed by those agents.
