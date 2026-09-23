# Security Documentation

This document records the security-relevant decisions for Rush Hour Crossing. The application is a static, local-first browser game with no backend, database, authentication, user accounts, file upload, analytics, or live external service.

## Project

| Field | Value |
|---|---|
| Name | Rush Hour Crossing |
| Stack | Vite 8.3.0, TypeScript 7.0.2, Vitest 5.0.1, Canvas 2D |
| Deployment | Out of scope for Session 003 |
| Created | 2026-09-22 |
| Last updated | 2026-09-23 |

## Applied measures

### Environment and secrets

- `.env` variants, logs, build output, coverage, and dependencies are excluded by `.gitignore`.
- The game needs no credentials or environment variables.
- No live AI provider or external API is permitted in Session 003.

### Runtime input validation

- URL query parameters are the only external structured input.
- `lives`, `crossingsToWin`, and `difficulty` must be checked at runtime before use.
- A present invalid field rejects the whole configuration, applies all defaults, and produces a visible field-name error.
- TypeScript types are not treated as runtime validation.

### Dependency audit

Command: `npm audit --audit-level=high`

| Kind | Date | Dependency graph | Result |
|---|---|---|---|
| Current check | 2026-09-23 | `main`, code at `26ae68b`, after a clean `npm ci` | Exit 0; 0 vulnerabilities (info 0, low 0, moderate 0, high 0, critical 0) across 83 dependencies |
| Historical | 2026-09-23 | Voxel Night City redesign validation | No result: the npm advisory endpoint failed; no clean audit claimed |
| Historical | 2026-09-22 | Functional baseline and controlled change | Exit 0; zero vulnerabilities reported |

Historical rows describe the dependency graph at their recorded date. Only the current check describes the graph on `main` today.

## Not applicable in Session 003

SQL injection protection, server security headers, rate limiting, authentication, authorization, CSRF, file upload protection, server logging, database hardening, HTTPS configuration, WAF, and production monitoring are not applicable because the project has no server, database, accounts, network API, upload, or deployment target. Adding any of them would violate the locked scope.

## Known limitations

- Hosting-specific security headers cannot be selected or verified until deployment is explicitly brought into scope.
- Dependency audit results describe the installed dependency graph at the recorded time and must be rerun after dependency changes.

## Verification before publication

- Run `npm audit --audit-level=high`.
- Confirm no `.env` file, token, credential, or private URL is tracked.
- Run the configuration validation tests.
