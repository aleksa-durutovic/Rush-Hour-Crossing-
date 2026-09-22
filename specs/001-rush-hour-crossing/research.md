# Research: Rush Hour Crossing Core Game

## Decision 1: Vanilla TypeScript with Vite

**Decision**: Use the approved Vite `vanilla-ts` style project with no UI framework.

**Rationale**: The product is one Canvas screen with a small HUD. Direct browser APIs keep the state boundary visible and minimize dependencies.

**Alternatives considered**: React was rejected because component lifecycle adds no value to the Canvas-owned game view. A hand-built TypeScript compiler setup was rejected because Vite already supplies the agreed starter and build workflow.

## Decision 2: Explicit runtime configuration validation

**Decision**: Parse the three supported query fields into candidates, validate each present value, then either accept the complete result or return all defaults plus every invalid field name.

**Rationale**: The contract is small, atomic fallback behavior is unusual enough to keep explicit, and a hand-written validator is easy to exercise exhaustively.

**Alternatives considered**: Zod was rejected as an unnecessary runtime dependency for three fields. Type assertions were rejected because they provide no runtime proof.

## Decision 3: Tick-derived traffic

**Decision**: Store fixed vehicle starts and calculate occupied cells from lane direction, movement interval, vehicle length, grid width, and tick.

**Rationale**: Derived traffic eliminates mutable vehicle drift and directly supports the determinism invariant and arbitrary-tick tests.

**Alternatives considered**: Mutating every vehicle position after each action was rejected because it creates additional state and wrap-around failure modes. RNG-based spawning is prohibited.

## Decision 4: One pure turn transition

**Decision**: Resolve an action, collision A, tick advance, collision B, crossing, and end state in one pure transition with collision precedence.

**Rationale**: The exact required ordering is centralized and can be tested without Canvas. Returning new state prevents accidental partial mutation.

**Alternatives considered**: Event-driven mutations spread across input and rendering were rejected because ordering becomes implicit and difficult to test.

## Decision 5: Canvas renderer as a projection

**Decision**: Render the complete current state after initialization and after every accepted turn. Do not use a timer or animation frame loop.

**Rationale**: This matches turn-based behavior and prevents rendering from becoming a second source of game state.

**Alternatives considered**: Continuous rendering and animated traffic were rejected as real-time behavior outside scope.

## Decision 6: Node-environment behavior tests

**Decision**: Test config parsing, traffic occupancy, turn transitions, determinism, presets, and keyboard mapping as pure modules in Vitest's Node environment; use manual browser evidence for Canvas appearance and playable win/loss.

**Rationale**: Required rule coverage does not need a DOM emulator, which keeps the dependency graph small.

**Alternatives considered**: jsdom and browser automation were deferred because neither is required to prove the pure game contract in Session 003.
