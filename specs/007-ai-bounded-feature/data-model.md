# Data Model: On-Demand Safe-Path Hint

## HintSnapshot

Exact browser-to-server object. No unknown properties are allowed.

| Field | Type / bound | Rule |
|---|---|---|
| `status` | literal `active` | Terminal states cannot request a Hint. |
| `difficulty` | `easy`, `normal`, `hard` | Selects an existing preset. |
| `tick` | safe integer `0..Number.MAX_SAFE_INTEGER - 512` | Leaves headroom for every permitted route step. |
| `x` | integer `0..8` | Player column. |
| `y` | integer `1..6` | Player is in a traffic row or the start row; goal states resolve immediately. |
| `lives` | integer `1..5` | Active run has at least one life. This value must remain constant along a safe route. |
| `crossings` | integer `0..crossingsToWin - 1` | A run already at target is not active. |
| `crossingsToWin` | integer `1..10` | Existing game configuration bound. |

Request body is UTF-8 JSON no larger than 2,048 bytes.

## HintToolProposal

Provider-produced untrusted object. Exact shape is `{ name: "find_safe_path", args: {} }` with no additional keys. The provider adapter keeps any function-call continuation content opaque and server-side; it is not a tool argument or client field.

## SafePathStep

One validated action and its deterministic result:

```ts
type SafePathStep = {
  action: 'up' | 'down' | 'left' | 'right' | 'wait'
  entered: { x: number; y: number } // attempted cell before crossing reset
  tick: number
  x: number // post-turn player position
  y: number
  lives: number
  crossings: number
  status: 'active' | 'won'
}
```

Each step MUST equal a replay through `applyAction` from the preceding state. `lives` equals the snapshot value for every step. The final step MUST enter `y = 0` in any column and increase crossings by exactly one. It has `status: 'won'` only when this crossing reaches `crossingsToWin`; otherwise the final status is `'active'`. No earlier step may enter the goal row or increase crossings.

## HintResponse

Exact validated successful HTTP body, maximum 65,536 UTF-8 bytes:

```ts
type HintResponse = {
  outcome: 'verified' | 'no_safe_path' | 'search_limit'
  origin: HintSnapshot
  explanation: string // 1..160 characters; empty for fixed non-verified outcomes
  steps: SafePathStep[] // 1..512 only for verified; [] otherwise
}
```

For `verified`, the route ends at exactly the next crossing. The final step has `entered.y === 0`, and its status is `'won'` only if the configured crossing target was reached; otherwise it remains `'active'`. For `no_safe_path`, finite search was exhausted without a safe next crossing and `steps` is empty. For `search_limit`, a node/depth/size cap prevented proof and `steps` is empty. Provider/internal/cancellation errors use fixed non-2xx error DTOs and never include the untrusted payload.

## Browser HintLifecycle

Volatile state for one game:

```ts
type HintLifecycle =
  | { phase: 'ready'; usedLives: number[] }
  | { phase: 'loading'; usedLives: number[]; requestId: number; origin: HintSnapshot }
  | { phase: 'visible'; usedLives: number[]; result: HintResponse | SafeHintFailure }
  | { phase: 'hidden'; usedLives: number[]; result: HintResponse | SafeHintFailure }
```

`usedLives` records the life counts that have already requested a Hint, including failures and stale results. Losing a life clears the cached result and invalidates any pending response while preserving `usedLives`, making the new life count eligible. Restart or difficulty change clears `usedLives` and the cache; reload always starts with no recorded life counts.
