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

## Week 05 context extension — 2026-10-06

For feature 007, apply the root AGENTS.md priority order, with the constitution first.
The older priority numbers above describe Session 003 rather than overriding that order.

| Source | Included | Purpose and boundary |
|---|---|---|
| `specs/006-ai-feature/`, `shared/advice-contract.ts`, `src/advice/`, `server/advice/` | Yes | Preserve Week 04 behavior and reuse its server-only provider boundary |
| `specs/007-agent-level-generator/` | Yes | Current approved scope, code-free plan, contracts, tasks, evals and implementation guide |
| `C:/Users/AleksA/Desktop/weekly-assignment.md` | Read during planning | Week 05 process requirements; not permission to execute unrelated examples |
| `C:/Users/AleksA/Desktop/week-05-bounded-agentic-workflows-reliable-integration-addendum.md` | Read during planning | Stateful bounded workflow guidance; examples are adapted, not copied |
| `docs/EVIDENCE_W05.md` and `docs/AI_USAGE_LOG.md` | Yes | Actual evidence, user scope approval and pending implementation/live confirmation |
| Provider documentation linked from feature 007 research | Minimal | Recheck SDK compatibility inside the adapter; do not migrate models or APIs without need |
| Credentials, local environment file contents, raw prompts and hidden reasoning | No | Never needed in implementation instructions or evidence |

The generator runtime receives only bounded rules, schemas, request settings, remaining
budgets and at most three validated candidate evaluations. Repository files and lesson
documents are developer context and must not be sent wholesale to the runtime model.

## Feature008 implementation extension — 2026-10-06

The user approved bounded opt-in failover for both existing AI operations and the narrow
compatibility amendments in specs/008-model-failover/contracts/compatibility.md. Include the
whole Feature 008 package, current Feature 006/007 behavior, and their implementation/debug
evidence when changing the server AI boundary. Disabled mode remains primary-only; enabled
routing is server-owned and limited to primary8s, backup7s, shared15s, with all existing
budgets, strict validation, generator proofs/Play approval and advice delay preserved. The
user selected Gemini 2.5 Flash (`gemini-2.5-flash`) for both operations. No live provider
call is authorized.
Credentials and raw provider payloads are never needed in implementation context or evidence.
Routine validation uses fakes only; live calls require fresh explicit authorization.

## Week08 context extension - 2026-10-27

User-approved generator-focused hardening includes shared HTTP/browser protection and
advice regressions, continuing on codex/ai-level-generator-feature. No optional challenge.
The root authority order remains in force; feature009 does not override game/AI budgets.

| Source | Included | Purpose and boundary |
|---|---|---|
| specs/009-secure-the-arcade/ | Yes | Approved I1-I8/T00-T17, contracts, code-free guide and implementation tasks with verification status |
| docs/EVIDENCE_W08.md | Yes | Actual baseline, repaired dependency audit and Week08 implementation/test evidence |
| Week08 Desktop ZIP | Read in planning | Lesson/assignment/template; path/hash in feature009 research; not runtime model context |
| Accepted006/007/008 and generator-branch source/tests | Yes | Preserve real proof/Play, advice delay and failover |
| Primary references in feature009 research | Minimal | Security decisions, targeted dependency-patch evidence and final audit result |
| Conflicted older generator and dirty original main | No implementation base | Preserve separately; no reset/stash/copy over selected branch |
| Real environment values/.env/credentials/raw provider payloads | No | Fake transport and synthetic config only |

Local Spec Kit metadata selects009; Git stays on the existing generator branch.
Course documents/evidence are developer context, never wholesale runtime model context.
Feature009 implementation is recorded in docs/EVIDENCE_W08.md on the approved generator branch. Fake transport and synthetic config were used; no live provider call was made.

Follow-up live-provider diagnosis: the local advice endpoint returned ADVICE_UNAVAILABLE; a sanitized diagnostic found configuration failure with zero SDK transport attempts. No usable GEMINI_API_KEY reached the selected worktree process. No credential or .env value was inspected. See Evidence Sections 10-11; configure the key privately before any retry.


Retry after reported setup still found no `.env` at the selected worktree root (presence only) and zero SDK transport attempts; place `GEMINI_API_KEY` in this worktree's root `.env` or set it privately in the server process environment before retrying. No key was exposed.


Live smoke test update (2026-10-27): `.env` is now present at the selected worktree root (presence only; contents not read). Live advice and generation API requests succeeded; generation's real solver verification passed. Failover stayed disabled and no Play action was triggered. Full results and the earlier transient 503 are in Evidence Section 13.

## Feature010 security resource bounds — 2026-10-28

| Source | Included | Purpose and boundary |
|---|---|---|
| `specs/010-ai-resource-bounds/` | Yes | Approved 60 provider starts per serving process and a 16,384-byte generator response-read limit; implementation tasks/evals and manual provider-account checklist |
| `server/security/provider-attempt-budget.ts`, admission/services/failover and `src/level-generator/client.ts` | Yes | Actual start authorization/accounting and bounded fatal-UTF-8 response consumption |
| Fake-only B00/S03 measurements and final gates in `docs/EVIDENCE_W08.md` | Yes | Reproducible local evidence; account controls remain owner-verified only |
| Real credentials, provider-account settings and live calls | No | Not needed or authorized for local implementation/verification |

The process allowance is shared by generation/advice and resets only with the serving
process; it is not a monetary cap. Existing service limits, fallback, failover, proof/Play
and advice delay remain authoritative. Browser/network buffering can exceed the delivered
chunk boundary before application code sees a chunk.
