# Agent Flow: On-Demand Safe-Path Hint

```mermaid
sequenceDiagram
    actor Player
    participant UI as Browser UI
    participant API as Local API
    participant Agent as Bounded orchestrator
    participant Model as Gemini provider
    participant Solver as find_safe_path solver

    Player->>UI: Select Hint
    UI->>UI: Validate snapshot; pause controls
    UI->>API: POST exact snapshot
    API->>API: Validate host, method, media type, bytes, schema
    API->>Agent: Start bounded run
    Agent->>Model: Step 1: require find_safe_path({})
    Model-->>Agent: One proposed function call + opaque continuation
    Agent->>Agent: Validate exact tool name and empty args
    Agent->>Solver: Execute once with validated snapshot
    Solver-->>Agent: verified route / no_safe_path / search_limit
    alt Verified route
        Agent->>Agent: Replay-check route and state trace
        Agent->>Model: Step 2: validated compact function result
        Model-->>Agent: Structured explanation only
        Agent->>Agent: Validate explanation; attach solver-owned route
    else Search did not prove a route
        Agent->>Agent: Use fixed status; no model-selected claim
    end
    Agent-->>API: Bounded fixed DTO or safe error
    API-->>UI: Same-origin response
    UI->>UI: Validate response + current snapshot; discard stale route
    UI-->>Player: Draw verified path or safe status; remain paused
    Player->>UI: Hide hint
    UI->>UI: Hide overlay/status and resume input
```

The backend is the only executor. Invalid proposals do not invoke the solver; the provider never selects route cells, game actions for live execution, or state changes.
