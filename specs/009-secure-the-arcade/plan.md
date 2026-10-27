# Implementation Plan: Secure the Arcade

**Branch**: codex/ai-level-generator-feature | **Date**: 2026-10-27
**Spec**: [spec.md](spec.md)
**Base**: 06ff2534aa4e28abf65c3822d5f6695f3855103d
**Stage**: Documentation only. No feature 009 runtime behavior is implemented.

## Summary

Harden the existing generator end to end. Reuse strict contracts, real incremental solver,
provider adapters and browser lifecycle; add only missing controls and proofs. Shared
admission protects generation and delayed advice without coupling their model routing.
Preserve every existing game rule, preset, proof/Play requirement and advice delay.

## Technical Context

- Language/runtime: existing strict TypeScript, Node 24+, npm 11+, Windows-compatible paths.
- Dependencies: existing Vite, Vitest, Playwright, tsx, Zod and Gemini SDK. No new dependency
  is planned. Targeted baseline security updates are required; see research.md.
- Storage: no accounts/database/persistence; bounded in-process admission/event state only.
- Testing: Vitest production-unit/integration paths; Playwright on built assets served by
  the actual handler. Provider/transport/time fakes, actual local solver.
- Target: single loopback Node process and desktop browser; same origin, no CORS.
- Performance: reject excess work before providers, one generation plus one advice maximum,
  five accepted jobs per rolling minute; keep existing solver batches/budgets.
- Scale: one existing agent flow; shared browser/API protections and advice regressions.
- Unknowns: no unresolved design questions; actual installed dependency fixes must be
  revalidated during implementation, not assumed from this planning date.

## Constitution Check

| Principle / constraint | Pre-design and post-design disposition |
|---|---|
| Locked gameplay | PASS: no gameplay/preset/query contract changes; local score remains unverified. |
| Pure deterministic logic | PASS: leave src/game and existing generated policy/search semantics unchanged. |
| Runtime boundaries | PASS by design: retain and independently test input/model/tool/final contracts. |
| Tests before change | PASS by plan: expectations first; each behavior slice has a preceding failing test. |
| Failed baseline gate | OPEN BLOCKER: audit exits 1 with two high and two moderate findings; T002 must resolve it before functional slices. |
| Small controlled change | PASS by plan: each slice records claim, failing signal, smallest change and same-test result. |
| Provider/secret boundary | PASS: sole SDK owner retained; no browser env access or live calls. |
| Traceability | PASS by design: tasks/evals/evidence/AI log; no invented partner contribution. |

No constitution amendment or gameplay exception is needed. Feature 009 tightens HTTP
admission and observation around approved operations. Its new busy/rate/origin errors
extend transport behavior narrowly; accepted 006-008 success and timing contracts remain.
If implementing reveals an actual authority conflict, report the specific source and stop
that conflicting slice rather than weakening a MUST rule.

## Project Structure

Documentation: spec.md, plan.md, research.md, data-model.md, contracts/security-policy.md,
SECURITY_EVALS.md, tasks.md, quickstart.md, IMPLEMENTATION_GUIDE.md and requirements checklist.
Evidence: docs/EVIDENCE_W08.md; decisions: docs/AI_USAGE_LOG.md.

Planned source/test changes, only when a test demonstrates need:

| Path | Responsibility |
|---|---|
| server/security/admission.ts | Fixed admission/rate policy, leases, monotonic clock, no environment access. |
| server/security/events.ts | Fixed event schema/projection, bounded local ring and injectable sink. |
| server/security/active-work.ts | Per-job tracking of actual started provider promises until settlement. |
| server/app.ts | Early HTTP checks, exact Origin policy, admission/release, safe error mapping, production CSP. |
| server/index.ts, server/config.ts | Compose shared server-owned controls and explicit development origins. |
| server/advice/service.ts, server/level-generator/service.ts | Narrow injected observation/tracking hooks around actual provider attempts and tool execution; preserve loops and counters. |
| server/advice/gemini-provider.ts | Advice text byte bound before parse, same primary/backup validation; sole SDK importer. |
| shared/advice-contract.ts | Only narrow additional public error codes if its error guard needs them. |
| src/advice/client.ts | Bounded response text before JSON parse; retain delayed lifecycle. |
| vite.config.ts | Pin documented loopback dev origin/port if required for explicit Origin policy. |
| package.json, package-lock.json | Targeted vulnerable-package fixes and explicit security scripts. |
| tests/security/*.test.ts | Full HTTP/service/solver flows and adversarial probes. |
| tests/server/fixtures/w08-server.ts | Test-only composition of actual handler/services/adapters with fake SDK, built assets and synthetic config. |
| e2e/security.pw.ts, playwright.security.config.ts | Production browser proof using that composition, no CSP bypass. |
| tsconfig.json, tsconfig.server.json | Exclude tests/security from the browser project, include it in the Node-only server project, and typecheck the new Playwright config; never weaken checks. |

Do not create generic middleware frameworks, stores, tool endpoints or new runtime fake-mode
environment flags. Controls may be small functions; boundaries matter more than class count.

## Implementation Slices

1. Reproduce baseline, preserve initial checkpoint, resolve audit with targeted compatible
   updates and rerun all gates. Do not pretend historical audit success is current.
2. Write full-path characterization tests for existing valid/rejected flows. Capture
   T02, T13 and T16 fixtures before corresponding changes.
3. Add shared admission and active-work tracking behind actual HTTP routes. Keep capacity
   held while unresolved promises drain; release once after all started work settles.
4. Add missing output bounds, safe event projection and sentinel proofs without sending
   raw internal objects to models. Keep exact tool/final scope checks.
5. Add production CSP and safe Origin checks, then prove real-browser output safety and
   blocked available script. HMR is not production evidence.
6. Finish T00-T17 traceability, fake-only aggregate command, demo and actual evidence.

Each slice uses one documented hypothesis; do not bundle independent behavior changes.
Run focused tests then full gates at meaningful checkpoints, not after every wording edit.

## Test Composition and Fake Isolation

The test harness composes createRequestHandler, actual services, production validators,
real solveLevel and actual provider adapters where transport encoding is being tested.
Only SDK/client transport, clocks and controlled dependency outputs are replaced.
Tests injecting bad tool output must still exercise service validation/projection.

At least one normal and one initial-denial HTTP integration case exercise the complete
composition. Browser T00/T16 use the real backend composition, not page.route fake success.
Existing stubbed browser tests remain useful lifecycle/DOM regressions.

The fixture server lives under tests/, imports server modules, and is unreachable from
normal server startup. It does not load local .env files. It supplies a synthetic key
and injected fake SDK client; unexpected fake calls fail, never fall through to network.
There is no normal-runtime FAKE_PROVIDER switch or public diagnostics/configuration route.

Add future npm scripts:
- test:security:unit: Vitest tests/security plus explicitly mapped existing relevant suites.
- test:security:browser: Playwright with playwright.security.config.ts.
- test:security: unit suite, production build, then security browser suite; fail on any error.
Keep normal test:run discovery and existing 29 browser cases. Document security browser
as an additional gate alongside test:e2e; never assume an explicit file list discovers it.

## Evidence and Completion

SECURITY_EVALS.md owns fixtures/expectations; contracts/security-policy.md owns numerical
policy; tasks.md owns work order; EVIDENCE_W08 owns actual runs. Link rather than copy.
Task checkmarks mean implemented AND verified, not just code written.

All new results start NOT RUN. Baseline typecheck/305 unit tests/build/29 browser tests
passed in planning; audit failed. npm ci was not rerun in planning. Final implementation
must use a fresh clean install and all AGENTS.md gates plus test:security.

No automatic commit/push/merge is included. Reviewers read main; branch-only work is not
submitted. Preserve s003-baseline-v1. Report implementation and delivery status separately.

## Complexity Tracking

No justified constitution violations. Three small server security modules are acceptable
only for testable admission, underlying-work lifetime and event projection; combine them
if a smaller design retains those independently testable boundaries.
