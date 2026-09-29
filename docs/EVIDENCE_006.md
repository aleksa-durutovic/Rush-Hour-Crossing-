# W04 Evidence — 006 AI Feature

**Date**: 2026-09-29
**Scope**: Delayed post-game Option C advice on the feature 005 local server.

## Decision and user scenario

The student pair approved Option C: a loss with zero crossings maps to survival advice, a partial loss maps to goal progress, and a win or unclear evidence maps to general advice. The user asked to complete the W04 assignment, including tests and required artifacts; that request is recorded as implementation authorization. Advice for a completed run stays hidden until the next run ends. A pending old result is replaced by the safe unavailable notice at supersession. Ready advice survives a mid-run restart or difficulty switch.

## Architecture and trust boundary

~~~mermaid
flowchart LR
  Game[Browser game and pure summary] -->|POST /api/advice: compact validated summary| API[Local TypeScript API]
  API --> V[Runtime input validator]
  V --> Service[Advice service: 15s deadline, max 2 attempts]
  Service --> Adapter[Gemini adapter]
  Adapter -->|structured nextTip only| Gemini[Gemini API]
  Gemini --> Adapter --> Service -->|validated fixed DTO or safe error| API --> Client[Browser runtime validator]
  Client -->|textContent, polite live region| Player[Player]
~~~

The API stays on the existing 127.0.0.1 server with its Host allowlist, same-origin proxy, security headers, and no CORS. src/ never imports Node.js or the provider SDK. The only SDK importer is server/advice/gemini-provider.ts. GEMINI_API_KEY is read only by the server adapter after optional process.loadEnvFile() in server startup. .env.example contains an empty value and .gitignore excludes local .env files. The local .env value was not inspected or recorded.

The backend returns only focus, deterministic evidence, and one validated tip. The browser validates the DTO and assigns it as literal text. The game transition module is unchanged.

## Contracts

The request contains exactly eight fields: outcome, difficulty, ticks, crossings, targetCrossings, startingLives, remainingLives, and score. Runtime validation enforces exact keys, safe integer ranges, score consistency, win/loss invariants, UTF-8 JSON, and a 4,096-byte request cap. Invalid requests are rejected before the service/provider is called.

Gemini is configured as gemini-3.1-flash-lite, JSON structured output, one required nextTip string capped at 160 characters, and at most 120 generated tokens. The service enforces a 15-second deadline per attempt, no more than two attempts, and one bounded 250 ms retry only for transient failures/timeouts. SDK-level retries are disabled so the service owns the attempt ceiling. Missing key, malformed output, permanent failures, and invalid input are not retried.

Success is HTTP 200 with { focus, evidence, nextTip }. Public failures use fixed JSON error codes; provider exception text, keys, raw response data, and stack traces are not returned or logged. Browser disconnect and supersession abort work where supported; local job IDs reject stale completions even if cancellation is ignored.

## Validation signal

The test-first expectation files were run before implementation. Initial pre-implementation result: six targeted files failed, with 10 failed and 4 passed tests; missing modules and the missing /api/advice route were the expected causes. After implementation, typecheck passed; Vitest passed 16 files / 148 tests; build passed; audit returned 0 vulnerabilities; Playwright passed 22 browser tests. The first E2E attempt found Chromium absent, so Playwright Chromium was installed and the suite was rerun successfully. No live API request was used by the tests.

| Check | Result |
|---|---|
| npm ci | Pass; installed the locked dependency set, 86 packages added, audit reported 0 vulnerabilities |
| npm run typecheck | Pass; browser and server TypeScript projects |
| npm run test:run | Pass; 16 files, 148 tests |
| npm run build | Pass; typecheck and Vite production build |
| npm audit --audit-level=high | Pass; 0 vulnerabilities |
| npm run test:e2e | Pass; 22 browser smoke and advice tests |
| Secret/bundle review | Pass; 155 tracked and untracked non-secret files scanned with no provider credential patterns, .env is ignored and untracked, and the browser bundle contains no SDK, model ID, or key variable |
| Limited live provider confirmation | Not run; the required W04 confirmation is pending explicit user authorization |

## Safe usage record

Live provider calls: **0**. Automated checks use fake providers and controlled timers. The SDK is wired but no actual account access, provider latency, token usage, or billed cost has been verified. Model catalog, account availability, and pricing can change. After the fake test suite passes, the required W04 limited live confirmation needs explicit user authorization; then make one deliberate call and record the model, attempts, latency, and token counts if available without retaining a key, full prompt, or raw private payload.

## Known limitations

- The submitted run summary is runtime-validated but the server cannot prove a browser-created summary is truthful.
- Advice is intentionally broad because no action history, collision data, player identity, or lane details are collected.
- Provider access and live quality/cost remain unverified because no live request was made.
- The supplied record documents student-pair scope approval but not individual names or driver/reviewer assignments. Add both students’ confirmed contributions before submission; no names or roles are inferred here.

## Contributions

- **Student pair**: approved the bounded Option C scope.
- **User in this workspace**: clarified pending supersession and restart/difficulty behavior and requested completion of the W04 implementation and artifacts.
- **OpenAI Codex**: prepared the spec artifacts and test-first expectations, implemented the browser/server/provider changes, and recorded actual verification results.
- **Individual student driver/reviewer split**: not identified in the supplied material; fill in from the pair’s actual work before presenting the assignment.
