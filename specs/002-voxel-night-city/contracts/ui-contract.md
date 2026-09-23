# UI Contract: Voxel Night City

## Inputs

- The renderer receives the existing `GameState`, validated `GameConfig`, and lane definitions.
- The shell receives the existing configuration-resolution message and keyboard event mapping.

## Required visible outputs

- Active state: title, lives, crossings, score, tick, difficulty, goal, start, lanes, direction cues, vehicles, player, and controls.
- Win state: distinct result treatment plus restart instruction.
- Loss state: distinct result treatment plus restart instruction.
- Invalid configuration: visible readable fallback message.
- Focused board: visible focus indicator.

## Invariants

- A visual update follows only an existing user action or initial render.
- Rendering cannot mutate game state or start a timer.
- Asset failure cannot prevent play.
- Keyboard bindings and post-game input lock remain unchanged.
