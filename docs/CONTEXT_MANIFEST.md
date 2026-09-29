# Context Manifest — Session 003

This manifest records the context intentionally used for the Rush Hour Crossing build.

| Source | Included? | Why | Priority | Risk |
|---|---|---|---|---|
| `docs/GAME_SPEC.md` | Yes | Authoritative gameplay rules, scope, configuration contract, and Definition of Done | 1 — game | Derived artifacts may drift if this file changes without an explicit pair decision |
| `docs/ASSIGNMENT.md` | Yes | Authoritative process, evidence, evaluation, and budget requirements | 1 — process | Process requirements must not be converted into new gameplay mechanics |
| `docs/BUILD_PROMPT_V1.md` | Yes | Governs the planning and execution sequence | Control prompt | Repeating it unnecessarily consumes context |
| `.specify/memory/constitution.md` | After F1 | Project-wide non-negotiable engineering rules | 2 | An over-broad principle could block a small implementation |
| Active `.agents/skills/speckit-*/SKILL.md` | Yes, one workflow at a time | Exact local Spec Kit behavior | 2 | Project skills and globally installed CLI have different patch versions |
| `AGENTS.md` | Yes, after the second review | Root instructions that point agents to the sources above and to the required checks | 2 | Must stay a pointer; it must not restate or override `GAME_SPEC.md` |
| `specs/003-review-fixes/` | Yes, for the third-review corrections | Student decisions DEC-1–DEC-4, measured preset numbers, exact tasks and file contents | 2 | Numbers and golden paths are tied to the current rules and presets; a rule or preset change invalidates them |
| `specs/005-backend-split/` and the Week 04 course materials | Yes, for the backend split | Student decisions DEC-1–DEC-4, why a provider key must stay server-side, why one origin was chosen, exact server files and tests | 2 | Ports (8787 dev API, 4173 browser tests) and scripts are tied to the plan; changing them invalidates its expected outputs. Provider examples in the Week 04 addendum must not be copied before the AI hint is specified |
| `e2e/`, `playwright.config.ts` | Yes | Browser smoke test and evidence capture | 3 | The tests read the Canvas accessible description; changing that text in `src/main.ts` breaks them |
| `README.md`, `package.json`, `src/`, `server/`, `tests/` | Yes | Actual stack, scripts, structure, and baseline state | 3 | Starter details may become stale; commands must be verified, not assumed |
| Old chats, other projects, and Frogger examples from the web | No | Not approved as project sources | Excluded | Scope contamination and accidental copying |
| Environment values, credentials, private URLs, and tokens | No | Not required for the static game | Prohibited | Secret disclosure |

When sources conflict, `GAME_SPEC.md` controls gameplay, `ASSIGNMENT.md` controls process, local Spec Kit skills control workflow behavior, and the starter controls only technical implementation details.
