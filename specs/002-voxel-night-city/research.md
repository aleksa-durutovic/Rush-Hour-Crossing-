# Research: Voxel Night City Redesign

## Decision: Preserve Canvas dimensions and add visual depth inside the existing grid

**Rationale**: Fixed logical cells already support deterministic collision and lane placement. Layered shadows, curb bands, lane markings, and a visual HUD can make the board richer without coupling presentation to game logic.

**Alternatives considered**:

- Change the grid or state model: rejected because it would expand gameplay scope.
- Add a realtime camera: rejected because it would introduce continuous motion outside the approved turn model.

## Decision: Use one original optional bitmap only for non-playable city decoration

**Rationale**: The pair approved visual assets, but game readability and offline play must never depend on loading an image. Canvas geometry remains the source of all playable content.

**Alternatives considered**:

- Use a third-party game screenshot or asset pack: rejected because the project requires original visuals.
- Make the board itself a bitmap: rejected because traffic and state must remain dynamically rendered.

## Decision: Restrict motion to action feedback and respect reduced motion

**Rationale**: A short CSS or Canvas feedback effect can make a completed move feel intentional without an animation loop or automatic turn. The reduced-motion setting provides an accessible immediate state change.

**Alternatives considered**:

- Ambient/background animation: rejected because it is unnecessary and distracts from turn state.
- Animated vehicle progression over time: rejected because it conflicts with the locked turn-based model.

## Decision: Use manual browser visual checks plus existing automated regression tests

**Rationale**: Existing tests already protect pure rules; visual requirements are best confirmed through exact viewport screenshots, keyboard focus, and a reduced-motion check.

**Alternatives considered**:

- New screenshot-test dependency: rejected because it adds tooling beyond the narrow redesign scope.
