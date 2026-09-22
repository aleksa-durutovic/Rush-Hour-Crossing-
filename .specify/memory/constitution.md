<!--
Sync Impact Report
- Version change: template -> 1.0.0
- Added principles: Locked Gameplay Scope; Pure Turn Logic; Deterministic Simulation;
  Runtime-Validated Boundaries; Configuration Outside Logic; Tests and Expectations
  Before Change; Smallest Controlled Change; Traceable and Safe Work
- Added sections: Technical Constraints; Development Workflow and Quality Gates
- Removed sections: none; template placeholders were resolved
- Follow-up TODOs: none
-->
# Rush Hour Crossing Constitution

## Core Principles

### I. Locked Gameplay Scope
`docs/GAME_SPEC.md` MUST remain the authority for gameplay rules, configuration,
Definition of Done, and exclusions. Work MUST NOT add anything from its OUT OF SCOPE
list without an explicit decision by the student pair recorded in `docs/AI_USAGE_LOG.md`.
Process requirements come from `docs/ASSIGNMENT.md` and MUST NOT become new gameplay.

### II. Pure Turn Logic
Applying a player action MUST be a pure state transition independent of Canvas, DOM,
keyboard events, and wall-clock time. Rendering and input adaptation MUST remain outside
the game-state transition so every rule can be tested without a browser canvas.

### III. Deterministic Simulation
The game MUST use no random number generation. The same validated configuration and
ordered action sequence MUST produce an identical state sequence. Traffic positions MUST
be derived only from lane constants and the current tick.

### IV. Runtime-Validated Boundaries
All external structured input MUST be checked at runtime before it reaches game logic.
TypeScript types alone are not validation. A present invalid URL parameter MUST reject the
entire configuration, apply every default, expose the invalid field names, and never crash
the game.

### V. Configuration Outside Logic
Grid dimensions, starting values, difficulty presets, lane directions, speeds, vehicle
lengths, and placements MUST live in typed constants or configuration modules rather than
inside transition logic. Every preset MUST satisfy the non-blocking-lane invariant over
ticks 0 through 199.

### VI. Tests and Expectations Before Change
Automated tests MUST cover rules R1 through R7, configuration validation, determinism,
and preset invariants. Eval expectations MUST be written before their first execution.
A failing pre-existing check is a blocker and MUST be recorded before work expands.

### VII. Smallest Controlled Change
The first functional implementation MUST be preserved as an immutable baseline. After
baseline evaluation, exactly one documented hypothesis MUST drive one smallest reasonable
change, followed by the same eval cases without altered acceptance criteria.

### VIII. Traceable and Safe Work
The repository MUST contain no credentials, private tokens, or unnecessary infrastructure.
Commits MUST follow Conventional Commits with English messages. Important commands,
outputs, decisions, limitations, and both partners' contributions MUST be recorded in the
Session 003 evidence artifacts.

## Technical Constraints

- The approved stack is Vite, strict TypeScript, Canvas 2D, Vitest, and npm.
- The application is static and browser-only; backend, database, authentication,
  deployment, live AI calls, and network services are prohibited in Session 003.
- Dependencies MUST be kept to the minimum justified by the locked scope.
- Accessibility MUST include readable contrast, visible keyboard focus, and no required
  motion. Gameplay itself remains keyboard-only as specified.

## Development Workflow and Quality Gates

1. Review the locked source documents and context manifest before a major AI call.
2. Generate and review specification, plan, and tasks before implementation.
3. Record E1 through E3 expectations before baseline implementation.
4. Require typecheck, automated tests, production build, and dependency audit to pass at
   implementation checkpoints.
5. Preserve the baseline commit and tag before the controlled change.
6. Repeat the same eval set after the change and record measured results without rewriting
   expectations.

## Governance

This constitution governs generated specifications, plans, tasks, and implementation.
Conflicts with a MUST rule block implementation until the lower-level artifact is fixed.
Amendments require agreement by the student pair, a rationale in `docs/AI_USAGE_LOG.md`,
and a semantic version change: MAJOR for incompatible governance changes, MINOR for new
or materially expanded principles, and PATCH for clarifications. Every review MUST verify
constitution compliance and justify any added complexity against the locked scope.

**Version**: 1.0.0 | **Ratified**: 2026-09-22 | **Last Amended**: 2026-09-22
