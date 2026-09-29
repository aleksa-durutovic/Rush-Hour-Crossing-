# Implementation Plan: 006-ai-feature

**Feature**: Delayed Post-Game AI Advice

**Status**: Approved for implementation at the user’s request on 2026-09-29

**Date**: 2026-09-29

## Summary

Add one delayed Option C coaching message through the feature 005 local API server. The game captures a small summary on win or loss. Browser code submits it to the same-origin API. The server validates the summary, derives focus and evidence, calls Gemini through an injectable provider interface, validates the model tip, and returns a fixed DTO. Frontend lifecycle state holds the result hidden until the next completed run.

No gameplay rules, game-state transitions, or presets change.

## Constitution and scope check

- Pair approval for the bounded Option C feature scope is recorded in docs/AI_USAGE_LOG.md and docs/GAME_SPEC.md.
- Implementation was authorized by the user’s request to complete the W04 assignment on 2026-09-29. A live-provider request still requires separate explicit authorization.
- Pure game turn logic stays in src/game/. Advice summary/lifecycle helpers are separate browser-safe pure modules.
- Only server code may read process.env or import the Gemini SDK.
- The feature adds one same-origin API route to server/app.ts; loopback binding, Host allowlist, fixed errors, security headers, and no-CORS behavior from feature 005 remain in force.
- No database, accounts, external telemetry, AI tools, game-state changes, or broad new infrastructure.
- Dependency proposal: one production dependency, @google/genai. No schema library or web framework; runtime validation is implemented with small explicit validators.

## Architecture

1. **Shared contract** — shared/advice-contract.ts exports summary, focus, provider-input, success DTO, safe error types, and runtime validators. It imports no Node or browser APIs.
2. **Frontend summary** — src/advice/summary.ts maps a finished GameState to the exact eight-field summary and returns no summary for active state.
3. **Frontend lifecycle** — src/advice/lifecycle.ts implements the pure one-game-delay state machine. It associates a monotonically increasing job ID with each request, ignores stale settlements, preserves hidden advice through restart/difficulty changes, and clears displayed advice on reset.
4. **Frontend API/controller** — src/advice/client.ts validates same-origin HTTP responses; src/advice/controller.ts starts/cancels requests and wires game completion and reset events without changing src/game/turn.ts.
5. **Backend focus and service** — server/advice/service.ts validates provider output, derives focus/evidence from the summary, applies 15-second attempt deadlines, retries at most once for transient failure, and maps every failure to a safe unavailable outcome.
6. **Provider adapter** — server/advice/gemini-provider.ts owns the @google/genai import and GEMINI_API_KEY access. It requests only a small structured nextTip response, without tools or history.
7. **Local environment** — server/environment.ts uses Node's built-in process.loadEnvFile only when a local .env file exists; server/index.ts loads it before constructing the provider. It logs no environment values.
8. **API route** — server/app.ts accepts POST /api/advice, enforces JSON and the 4,096-byte cap, validates before calling the service, and maps stable status/error bodies. It aborts work when a request disconnects where supported.
9. **Accessible UI** — src/main.ts adds one initially empty polite status region. Only a consumed prior-run notice can populate it, via textContent; active gameplay and controls stay the same.

## API contract summary

- Request: JSON object containing exactly outcome, difficulty, ticks, crossings, targetCrossings, startingLives, remainingLives, score.
- Request size: 4,096 UTF-8 bytes maximum.
- Success: 200 JSON containing focus, evidence, nextTip only.
- Invalid JSON/shape/field values: stable 400 INVALID_REQUEST. Oversize: 413 REQUEST_TOO_LARGE. Wrong media type: 415 UNSUPPORTED_MEDIA_TYPE. Wrong method: 405 METHOD_NOT_ALLOWED with Allow: POST. Provider/configuration/timeout/output failure: 503 ADVICE_UNAVAILABLE. Unexpected exception: 500 INTERNAL_ERROR with a fixed body.
- Invalid input must call the provider zero times.
- Failure bodies never contain raw provider messages, keys, stack traces, or payloads.

## Test strategy

- Write tests before implementation. Use Vitest fake timers and fake providers for routine checks; no live provider calls in automated tests.
- Test environment loading with a temporary dummy .env file and a missing-file case; never use the developer's actual key in tests.
- Unit-test exact summary shape, category/evidence derivation, lifecycle transitions, stale response rejection, and reset semantics.
- Server-test route method, media type, body limit, malformed JSON, cross-field validation, no provider calls for every invalid request, successful DTO, safe failures, and no CORS.
- Service-test transient retry ceiling, permanent/malformed no-retry, abort, and 15-second attempt deadline.
- Extend architecture boundary checks for SDK import location, environment access, and browser imports.
- Browser-test the two-run delay and ready-result persistence through manual restart and difficulty switch; separately verify pending supersession/unavailable display.
- Preserve existing golden-path and browser smoke tests; add the new Playwright test to the E2E script after implementation.

## Implementation sequence

1. Shared contract and failing unit/server/boundary expectations.
2. Runtime summary and lifecycle implementation to pass unit tests.
3. API route and fakeable advice service to pass server tests.
4. Gemini adapter behind the provider interface; check key presence without printing it.
5. UI integration and browser tests.
6. Run required project checks and record actual outputs in the W04 evidence artifact. A limited live-provider confirmation is required by the W04 submission checklist after automated fake-provider tests, and requires separate explicit user authorization.

## Risks and decisions

- Gemini catalog, access, pricing, SDK and schema support can change; recheck before adding the dependency or making a live call.
- Request cancellation may arrive after provider work has begun; job IDs and state validation remain authoritative even if abort is ignored.
- The server can validate shape and game invariants, not prove that a browser-created summary is truthful. The bounded summary carries no private identifiers and is not used to modify gameplay.
- Model text is untrusted. Enforce size and basic character/empty checks, return it as literal text, and never let it choose focus/evidence/markup.
