# Data Model: Voxel Night City Redesign

## Visual Theme

- **Purpose**: Presentation-only source of named palette, typography, shape, and motion choices.
- **Validation**: Contrast pairs must satisfy the feature specification.
- **Relationship**: Applied by the page shell and Canvas renderer; it never changes game state.

## Board Visual State

- **Purpose**: Existing game state and lane data as presented in the Canvas.
- **Fields consumed**: player position, tick, lives, crossings, score, status, configuration, lane direction, and vehicle cells.
- **Validation**: Rendering must be a read-only projection of the existing state.

## Decorative Asset

- **Purpose**: Optional original bitmap for night-city atmosphere outside the playable board.
- **Fields**: local project path and descriptive alt-free decorative role.
- **Validation**: Its absence or load failure cannot cover or disable any game UI.
