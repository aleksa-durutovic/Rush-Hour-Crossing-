# Implementation Plan: Voxel Night City Redesign

**Branch**: `codex/002-voxel-night-city` | **Date**: 2026-09-23 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-voxel-night-city/spec.md`

**Note**: This template is filled in by the `$speckit-plan` command; its definition describes the execution workflow.

## Summary

Redesign the existing static browser game as an original Voxel Night City while preserving its pure, deterministic turn logic. Extend the Canvas renderer and full page shell with a shared high-contrast visual theme, optional reduced-motion-aware visual feedback, and original decorative bitmap assets that are never required for play. Validate with existing logic tests, visual runtime checks for desktop and narrow layouts, and win/loss screenshots.

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: TypeScript 7, browser JavaScript

**Primary Dependencies**: Vite 8, Canvas 2D, Vitest 5; no new runtime dependency

**Storage**: N/A

**Testing**: Vitest for existing pure logic; browser runtime checks and screenshots for visual acceptance

**Target Platform**: Modern desktop and narrow mobile browsers; keyboard-only controls

**Project Type**: Single static web application

**Performance Goals**: Render a complete board immediately after every user action with no automatic gameplay progression

**Constraints**: Preserve deterministic state transitions and keyboard controls; no network calls, copied third-party assets, new game mechanics, touch controls, audio, or realtime loop. Normal text contrast is at least 4.5:1; focus and large text are at least 3:1. Motion must be optional and honor reduced-motion preference.

**Scale/Scope**: One page, one Canvas game board, one optional original decorative bitmap asset, active/win/loss visual states

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Constitution gate | Status | Evidence |
|---|---|---|
| Locked gameplay scope | PASS WITH RECORDED EXCEPTION | `docs/AI_USAGE_LOG.md` records pair approval for visual-only asset and optional-motion exception. |
| Pure turn logic | PASS | No change planned under `src/game/` or `src/input/`. |
| Deterministic simulation | PASS | Renderer consumes existing state; no random or time-driven game updates. |
| Runtime-validated boundaries | PASS | Existing URL configuration behavior remains visible and tested. |
| Configuration outside logic | PASS | No configuration change planned. |
| Tests and expectations before change | PASS | Visual acceptance scenarios are specified before implementation. |
| Smallest controlled change | PASS | One visual feature branch, limited to rendering, shell, visual asset, and evidence. |
| Traceable and safe work | PASS | Original asset provenance and validation commands are documented. |

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file ($speckit-plan command output)
├── research.md          # Phase 0 output ($speckit-plan command)
├── data-model.md        # Phase 1 output ($speckit-plan command)
├── quickstart.md        # Phase 1 output ($speckit-plan command)
├── contracts/           # Phase 1 output ($speckit-plan command)
└── tasks.md             # Phase 2 output ($speckit-tasks command - NOT created by $speckit-plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
src/
├── config/               # existing runtime configuration and traffic presets
├── game/                 # existing pure deterministic logic; not changed by this feature
├── input/                # existing keyboard mapping; not changed by this feature
├── render/
│   └── canvas.ts         # themed board, HUD, player, vehicles, and end-state rendering
├── main.ts               # game-shell semantic markup and render trigger
└── style.css             # responsive shell, theme, focus, and motion preference

public/
└── assets/               # original optional Voxel Night City decoration

tests/                    # existing rule and configuration regression tests
docs/                     # evidence and AI usage decision record
```

**Structure Decision**: Retain the existing single Vite application. The visual change stays in render and shell layers; pure game and input modules remain untouched.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
