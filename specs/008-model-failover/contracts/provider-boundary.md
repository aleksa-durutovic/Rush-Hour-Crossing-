# Provider boundary contract

Each server-only adapter invocation makes at most one SDK/HTTP attempt. Disable SDK retries,
recursive fallback and hidden provider chains. Services own selection, timers and accounting.

Generation takes current bounded GeneratorDecisionContext and application-owned attempt
options (abort signal plus clipped timeout/deadline), then returns unknown decision data for
existing validation or a sanitized classified failure. Advice takes current ProviderInput
(eight-field summary and server-derived focus/evidence) with the same attempt options and
returns unknown tip data. Neither model can change application options or authoritative evidence.

Provider-specific wire envelopes belong inside adapters. Preserve the corrected Gemini root
decision field and its strict parser; its value remains the current tool_request/final/refusal
contract. Backup encoding may differ, but its normalized output must pass the same schemas.
Do not copy a schema merely because a fake response parses it.

Retain `server/advice/gemini-provider.ts` as the sole Gemini SDK importer and transport
owner for the current primary and selected Gemini backup. If a later profile selects another
transport, give it one exact server-only owner and preserve the same one-attempt contracts.
Never use an arbitrary URL setting. Transport and application timers must both use the
clipped application-owned time limit.

Map known quota/temporary/auth/refusal/output-cutoff signals to safe categories. Do not
infer errors from arbitrary provider text or propagate raw payloads. Cancellation takes precedence.

Generator limits remain context24,576 UTF-8 bytes, raw output8,192 bytes, configured output
2,048 tokens and at most three candidate/evaluation records. Advice retains120 configured
output tokens and only nonempty nextTip up to160 characters after validation. No added
reasoning allowance or weaker schema to conceal failures.

Before its adapter is written, record the concrete backup's official identity, structured
output support, timeout/cancellation behavior, token controls, access and dependency choice.
Keys are server environment inputs only. Disabled mode constructs no backup; enabled scope
covering both operations requires both capabilities. No startup live probe/key creation.

Fake transport tests inspect wire schema, output bounds, signals, actual transport timeout
and one-attempt settings. Service tests use fake adapters and the actual local solver.
Keep exact Gemini ownership checks and add equally exact backup ownership once selected.
Browser/pure modules still import no provider SDK/server code or read environment values.

Routine tests use no credentials or live provider. Later live checks require new explicit
permission and a stated small run/attempt budget. Earlier debugging permission was exhausted.
