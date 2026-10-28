<!--
Sync Impact Report
- Version change: 1.3.0 -> 1.4.0
- Modified principles: Technical Constraints adds the user-approved, opt-in feature 008
  backup route for existing AI operations; all safety and lifecycle constraints remain
- Modified sections: Technical Constraints adds sequential 8s/7s attempts in a shared 15s
  phase, retaining all operation budgets; backup is Gemini 2.5 Flash (`gemini-2.5-flash`)
- Added sections: none
- Removed sections: none
- Templates requiring updates: none
- Follow-up: remove this temporary sync report before a future governance commit
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
inside transition logic. Over ticks 0 through 199, every preset MUST satisfy the
non-blocking-lane invariant and the no-overlap invariant (no two vehicles of one lane share
a cell). Every preset MUST also allow a win from a fresh game without losing a life, and
an automated search MUST prove it.
Feature 007 generated levels MUST satisfy the same traffic invariants for their entire
traffic cycle and MUST have a verified no-life-loss winning path for the configured
crossing target before preview or play. The exact verified traffic configuration MUST be
the configuration applied; a search budget exhausted is not proof of impossibility.

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

- The approved stack is Vite, strict TypeScript, Canvas 2D, Vitest, npm, and, for the
  local API server only, the Node.js built-in `node:http` module run with tsx.
- The game runs in the browser. From feature 005 a local API server in `server/` may
  serve the built game and `/api` routes from one origin. It MUST bind only to
  `127.0.0.1`, MUST reject requests whose `Host` header is not on its allowlist, and
  MUST NOT send CORS headers. Database, authentication, deployment, and external
  network services remain prohibited. Live AI provider calls remain prohibited until
  an accepted feature specification allows them, and then only from `server/`.
- Game rules stay in the pure modules under `src/game/`; the server MUST NOT change
  them. Secrets, when a later feature needs them, MUST be read only by `server/` from
  the process environment and MUST never reach the browser bundle.
- Dependencies MUST be kept to the minimum justified by the locked scope.
- The user-approved Week 05 feature 007 MAY propose generated traffic on the existing
  nine-column, five-lane board. Generation MUST run only in `server/`, through a bounded
  orchestrator and the existing provider boundary. The model MAY request only the
  allowlisted read-only `solveLevel` tool. The application MUST validate proposals,
  arguments, results, and final output and MUST enforce step, attempt, tool-call,
  revision, repetition, and deadline limits. Only a player-operated Play this level
  action MAY apply a verified preview to the browser game. This does not authorize RNG
  in gameplay, automatic game-state mutation, arbitrary tools, or new game mechanics.
- The user-approved Feature 008 MAY enable one application-selected backup profile for
  the existing generator and delayed-advice operations. Failover is disabled by default;
  enabled routing is server-owned, sequential and bounded to one 15-second provider phase
  with primary capped at 8 seconds and backup at 7 seconds. Existing operation attempt/run
  budgets, strict validation, generator solver proofs and player approval, and delayed
  advice lifecycle MUST remain in force. No request selects a profile, and live provider
  calls still require fresh explicit authorization. The selected backup model is Gemini 2.5
  Flash (`gemini-2.5-flash`).
- Accessibility MUST include readable contrast, visible keyboard focus, and no required
  motion. Gameplay moves remain keyboard-only as specified; the difficulty selector
  may also be operated with a mouse.

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

**Version**: 1.4.0 | **Ratified**: 2026-09-22 | **Last Amended**: 2026-10-06
