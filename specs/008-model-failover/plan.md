# Implementation Plan: Bounded backup model failover

**Date**: 2026-10-06 | **Spec**: [spec.md](spec.md)
**Branch**: Use the existing checkout for documentation; suggested future branch codex/008-model-failover.
**Status**: User-approved scope and profile; implementation and fake/regression verification are complete. Live calls remain unauthorized.

## Summary

Add server-owned primary/backup routing to generator decisions and advice jobs. Each adapter
performs one provider attempt; each service selects and counts attempts. Never hide two
requests inside one counted adapter invocation. In enabled mode use primary8s, backup7s and
a shared15s provider phase. Disabled mode preserves current primary-only behavior.

## Technical Context

**Language/Version**: Existing strict TypeScript, Node24+ and npm11+.
**Primary Dependencies**: Existing node:http/tsx/@google/genai/Zod/Vitest/Playwright. The
selected Gemini 2.5 Flash profile supports documented structured output and uses the existing SDK.
**Storage**: Request-local routing, counters and at most32 safe evidence events; no database.
**Testing**: Fake transports/clocks; actual local solver; existing route/browser regressions.
**Target Platform / Project Type**: Existing local browser game and loopback Node API.
**Performance Goals**: Enabled provider phase ends within15s; generation retains40s decision
cutoff/45s total. These are local cutoffs, not guarantees about remote execution or billing.
**Constraints**: Exactly two configured roles, sequential attempts, no live routine tests,
unchanged gameplay/DTOs/validation/advice delay, server-only credentials.
**Scale/Scope**: One active generator run and independent advice jobs; no global cooldown.

## Constitution Check

| Principle | Planning response | Implementation gate |
|---|---|---|
| I Locked scope | Draft explicitly records conflicting single-provider restrictions | Accept narrow amendments before feature code |
| II Pure logic / III Determinism | No game/input/render changes | Same engine/proofs/golden paths |
| IV Runtime boundaries | Validate configuration, classified errors and both operation outputs | Equal gates for both providers |
| V Configuration outside logic | Routing/timing remain server policy | No values moved into turn logic |
| VI Tests before change | AI_EVALS.md fixes expectations before implementation | Failing regressions before behavior |
| VII Small controlled change | Share only useful error/config/timing helpers | No generic routing framework; preserve baseline tag |
| VIII Traceability | Safe evidence and actual results only | Update log/evidence without raw payloads |
| Technical constraints | Extend existing server boundary only after acceptance | Reconcile constitution/GAME_SPEC/features006/007; retain loopback/Host/no-CORS |

The user-approved compatibility amendment is recorded in the authority documents. The selected
profile is Gemini 2.5 Flash (`gemini-2.5-flash`); account access remains unverified. Tests and
fake transports are required before behavior changes; no live calls are authorized.

## Project Structure

### Documentation

spec.md, plan.md, research.md, data-model.md, contracts/failover-policy.md,
contracts/provider-boundary.md, contracts/compatibility.md, AI_EVALS.md, quickstart.md,
tasks.md, checklists/requirements.md, IMPLEMENTATION_GUIDE.md and README.md.
No source code or paste-ready test bodies are included.

### Expected source responsibilities

| Area | Smallest intended change |
|---|---|
| server/ai/failover-policy.ts | Classified recovery, role selection, remaining phase/attempt time |
| server/ai/provider-config.ts | Opt-in enable flag, allowlisted identities and operation capabilities |
| server/advice/gemini-provider.ts | Sole Gemini SDK owner for both profiles; classify failures and accept clipped transport limits |
| server/advice/service.ts | Count/select attempts, shared enabled deadline, unchanged deterministic output |
| server/level-generator/model.ts | Provider-neutral attempt options/error contract |
| server/level-generator/service.ts | Request-local role, counted switch and existing verification/recovery |
| server/index.ts | Validate server configuration and inject profiles/adapters |
| tests/server/failover-policy.test.ts and provider-config.test.ts | Timing/error/configuration and role isolation tests |
| tests/server/gemini-backup-provider.test.ts | Fake selected transport, schemas, bounded output, safe errors |
| Existing provider/service/API/boundary/browser tests | Routing/counts/abort/security and lifecycle regressions |

Keep the two existing orchestrators. Reuse the existing Gemini adapter file as the sole SDK
owner; keep operation contracts, server-only environment access and exact import boundaries.

## Phase 0 Research

Read research.md. Existing services own timers/retries, whereas Gemini adapters hard-code15s
transport limits and combine availability failures into transient errors. Planning used local
Spec Kit templates/scripts and two read-only agents. No provider calls or credential reads.

The backup profile is Gemini 2.5 Flash. Official model/schema and project quota/access limits
are recorded in research.md; account access is not verified and no live request is made.

## Phase 1 Design and contracts

data-model.md defines request-local state and diagnostics. contracts/failover-policy.md is
the detailed timing/routing authority. provider-boundary.md defines one-attempt adapters and
equal validation. compatibility.md lists required narrow amendments. Public DTOs remain unchanged.

## Implementation sequence

1. Preserve current uncommitted feature007/debug work and establish the current baseline.
2. Record accepted scope/profile and reconcile authority documents before implementation.
3. Freeze expectations; add safe errors, explicit configuration and timing policy.
4. Add one-attempt provider boundaries with fake transport tests and no internal SDK retries.
5. Integrate generation, proving exact counters with the actual deterministic solver.
6. Integrate advice separately, preserving summary/focus/evidence and delayed visibility.
7. Verify route/security/browser regressions, bounded evidence and all required project gates.
8. Prepare a newly authorized live procedure; prior three-run debugging permission was exhausted.

## Risks and tradeoffs

- Eight seconds can abandon a healthy slow model. Tune from evidence, not by silently raising budgets.
- Abort cannot guarantee remote execution/billing stops. Invalidate locally and ignore late results.
- Independent access adds configuration and possibly one SDK; same-provider backup can share outages/quota.
- Provider schema formats differ. Preserve the Gemini envelope fix and test the backup wire request itself.
- Model failover cannot cure invalid schemas, forbidden tools, refusal or credentials.
- Revisit process-wide cooldown/cost controls only if measured repeated runs justify a separate design.
