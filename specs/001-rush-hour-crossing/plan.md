# Implementation Plan: Rush Hour Crossing Core Game

**Branch**: `codex/001-rush-hour-crossing` | **Date**: 2026-09-22 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-rush-hour-crossing/spec.md`

## Summary

Build the locked deterministic crossing game as a single static browser page. A pure TypeScript state transition owns all turn, traffic, collision, score, win, and loss behavior; thin input and Canvas adapters translate browser events and render resulting state. URL configuration is parsed and validated at runtime with an explicit all-default fallback, while Vitest exercises core rules without Canvas.

## Technical Context

**Language/Version**: TypeScript 7.0.2 in strict mode; Node.js 24.14.0 for development tooling

**Primary Dependencies**: Vite 8.3.0 and browser Canvas 2D API; no runtime library dependency

**Storage**: N/A; state exists only in memory and resets on reload

**Testing**: Vitest 5.0.1 in its Node environment for pure logic, configuration, presets, and input mapping

**Target Platform**: Modern desktop browsers with keyboard and Canvas 2D support

**Project Type**: Single static browser application

**Performance Goals**: A turn performs one bounded 9-by-7 state update and immediate render without perceptible input delay; no timer or animation loop

**Constraints**: Deterministic and offline after initial load; no RNG, network request, backend, persistence, audio, copied assets, touch control, live AI, or deployment work

**Scale/Scope**: One screen, one player, 63 grid cells, five fixed traffic lanes, three presets, and three URL configuration fields

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Design response | Status |
|---|---|---|
| Locked Gameplay Scope | Requirements trace directly to R1–R7 and D1–D8; excluded capabilities have no component or task | PASS |
| Pure Turn Logic | `applyAction` consumes state, action, and lane configuration and returns a new state without browser APIs | PASS |
| Deterministic Simulation | Traffic position is derived from tick and fixed lane data; no random or time input exists | PASS |
| Runtime-Validated Boundaries | Query parsing returns validated config, defaults, and invalid field names before state creation | PASS |
| Configuration Outside Logic | Grid and all preset data live in config modules | PASS |
| Tests and Expectations Before Change | Rule/config tests and E1–E3 expectations precede feature implementation | PASS |
| Smallest Controlled Change | Baseline commit/tag occurs before E4-driven corrective task | PASS |
| Traceable and Safe Work | Static app has no credentials or network services; evidence and Conventional Commits are required | PASS |

Post-design re-check: PASS. The data model, query contract, quickstart, and source structure introduce no exception or unexplained complexity.

## Project Structure

### Documentation (this feature)

```text
specs/001-rush-hour-crossing/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── query-config.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── config/
│   ├── game-config.ts
│   └── presets.ts
├── game/
│   ├── constants.ts
│   ├── state.ts
│   ├── traffic.ts
│   └── turn.ts
├── input/
│   └── keyboard.ts
├── render/
│   └── canvas.ts
├── main.ts
└── style.css

tests/
├── config.test.ts
├── presets.test.ts
├── traffic.test.ts
├── turn.test.ts
└── input.test.ts
```

**Structure Decision**: Use one small project with domain-oriented folders. The game and config modules remain browser-independent; only `main.ts`, `input/`, and `render/` touch DOM or Canvas. Tests mirror behaviors rather than implementation layers.

## Complexity Tracking

No constitution violations require justification.
