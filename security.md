# Security Documentation

This document records the security-relevant decisions for Rush Hour Crossing. The application is a local-first browser game. Since feature 005 a small local Node.js server, bound to `127.0.0.1`, serves the built game and `/api` from one origin. There is no database, authentication, user accounts, file upload, analytics, or live external service.

## Project

| Field | Value |
|---|---|
| Name | Rush Hour Crossing |
| Stack | Vite 8.3.0, TypeScript 7.0.2, Vitest 5.0.1, Canvas 2D; local API server on Node.js `node:http` run with tsx 4.23.15; Playwright 1.63.0 and @types/node 24.19.0 (development only) |
| Deployment | Out of scope for Session 003 |
| Created | 2026-09-22 |
| Last updated | 2026-09-28 |

## Applied measures

### Environment and secrets

- `.env` variants, logs, build output, coverage, and dependencies are excluded by `.gitignore`.
- The game needs no credentials or environment variables.
- No live AI provider or external API is permitted yet. When a later accepted feature adds one, its key is read only by `server/` from the process environment; `src/` must not read `process.env` or `import.meta.env` (enforced by `tests/server/boundaries.test.ts`).

### Runtime input validation

- URL query parameters are the only external structured input.
- `lives`, `crossingsToWin`, and `difficulty` must be checked at runtime before use.
- A present invalid field rejects the whole configuration, applies all defaults, and produces a visible field-name error.
- TypeScript types are not treated as runtime validation.

### Local API server (feature 005)

- Binds only to `127.0.0.1`, so it is not reachable from other machines. `PORT` is validated at startup (integer 1024–65535, default 8787); an invalid value stops the server with a fixed message that does not repeat the value.
- One origin, no CORS: `npm start` serves `dist/` and `/api` from one server; in development Vite forwards `/api` to the server. The server never sends `Access-Control-Allow-Origin`, so other websites cannot read its responses.
- `Host` allowlist (`127.0.0.1:<port>`, `localhost:<port>`): any other `Host` gets `403 {"error":"FORBIDDEN_HOST"}` before routing. This blocks DNS-rebinding pages from reaching the API.
- Static files: only `GET`/`HEAD`; the decoded path must stay inside `dist/` and must have an allowlisted extension (`.html`, `.js`, `.css`, `.png`, `.svg`, `.ico`, `.json`, `.woff2`). Anything else is `404 Not found`. Traversal attempts are covered by `tests/server/app.test.ts`.
- Every response has `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, and `X-Frame-Options: DENY`; API responses have `Cache-Control: no-store`.
- Errors are fixed JSON codes (`NOT_FOUND`, `METHOD_NOT_ALLOWED`, `FORBIDDEN_HOST`) or fixed plain-text messages; no stack traces or file paths are sent.

### Dependency audit

Command: `npm audit --audit-level=high`

| Kind | Date | Dependency graph | Result |
|---|---|---|---|
| Current check | 2026-09-28 | Branch `005-backend-split`, code at `545b62c`, after `npm ci` | Exit 0; found 0 vulnerabilities |
| Historical | 2026-09-26 | Branch `003-review-fixes`, code at `2c1b3b1`, after a clean `npm ci` | Exit 0; 0 vulnerabilities (info 0, low 0, moderate 0, high 0, critical 0) across 86 dependencies |
| Historical | 2026-09-23 | `main`, code at `26ae68b`, after a clean `npm ci` | Exit 0; 0 vulnerabilities (info 0, low 0, moderate 0, high 0, critical 0) across 83 dependencies |
| Historical | 2026-09-23 | Voxel Night City redesign validation | No result: the npm advisory endpoint failed; no clean audit claimed |
| Historical | 2026-09-22 | Functional baseline and controlled change | Exit 0; zero vulnerabilities reported |

Historical rows describe the dependency graph at their recorded date. Only the current check describes the graph on `main` today.

### Development dependency: Playwright

- `@playwright/test` is a dev dependency used only by `npm run test:e2e` and `npm run evidence:screenshots`. It is not imported by `src/` and is not part of the production build in `dist/`.
- The tests open only `http://127.0.0.1:4173`, served by the local API server (`npm start`) from the local build. They make no request to any other host.
- `npx playwright install chromium` downloads a browser binary from the Playwright download servers into the user's cache, outside the repository. It is a one-time development step.

## Not applicable

SQL injection protection, rate limiting, authentication, authorization, CSRF, file upload protection, database hardening, HTTPS configuration, WAF, and production monitoring are not applicable because the project has no database, accounts, upload, or deployment target, and its only server listens on the loopback address. Adding any of them would violate the locked scope.

## Known limitations

- The browser used by the smoke test is downloaded by Playwright at development time; its integrity relies on Playwright's own download checks.
- Hosting-specific security headers cannot be selected or verified until deployment is explicitly brought into scope.
- No `Content-Security-Policy` header is sent yet; it needs its own browser test before it is added.
- The loopback bind and the `Host` allowlist protect a developer machine only; they are not a deployment security model.
- `scripts/dev.mjs` (the combined `npm run dev`) has no automated test; it was checked manually (see `docs/EVIDENCE_004.md`).
- Dependency audit results describe the installed dependency graph at the recorded time and must be rerun after dependency changes.

## Verification before publication

- Run `npm audit --audit-level=high`.
- Confirm no `.env` file, token, credential, or private URL is tracked.
- Run the configuration validation tests.
