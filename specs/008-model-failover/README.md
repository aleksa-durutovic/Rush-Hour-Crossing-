# Bounded backup model failover — feature008

**Status**: Implemented and offline verified, 2026-10-06. Live calls remain unauthorized.
**Start here**: [IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md).

The server can switch a slow/exhausted primary model to one approved backup while keeping
the same operation, validation and overall budget. Scope covers level generation and delayed
advice. The user selected Gemini 2.5 Flash (`gemini-2.5-flash`) for both backup operations.
Official structured-output support is recorded in research.md; actual account access remains
unverified without a live call.

| Document | Purpose |
|---|---|
| [spec.md](spec.md) | User outcomes,20 requirements and6 measurable criteria |
| [plan.md](plan.md) | Architecture, source responsibilities and implementation gates |
| [research.md](research.md) | Current code observations, decisions and official references |
| [data-model.md](data-model.md) | Profiles, phases, routing state, counters and bounded evidence |
| [failover policy](contracts/failover-policy.md) | Exact enabled/disabled routing, deadlines and recovery |
| [provider boundary](contracts/provider-boundary.md) | Single-attempt adapters and equal validation |
| [compatibility](contracts/compatibility.md) | Narrow amendments required to accepted006/007 restrictions |
| [AI_EVALS.md](AI_EVALS.md) |28 fixed fake evaluation expectations, not executed results |
| [tasks.md](tasks.md) |30 dependency-ordered, verified implementation tasks |
| [quickstart.md](quickstart.md) | Offline validation and later separately authorized live procedure |
| [quality checklist](checklists/requirements.md) | Document review, separate from implementation readiness |

Enabled policy: primary8s -> backup up to7s inside15s per provider phase; no hidden calls or
budget reset. Once switched, a generation run stays on backup. Disabled mode retains existing
behavior. Every level still needs deterministic verification and explicit Play; advice stays delayed.

This feature is implemented under the recorded compatibility amendment. Live calls remain
separately gated; do not inspect or display key values.
