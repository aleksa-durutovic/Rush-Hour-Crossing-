# Review package: two security corrections (010)

Planning date:2026-10-28. Target:codex/ai-level-generator-feature at779cd397.
**Owner decisions and local implementation approved 2026-10-28; implementation and
verification are complete in this worktree. The owner subsequently authorized committing
and pushing these fixes to the existing feature branch. See EVIDENCE_W08 Section22 for
the publication checkpoint. Manual account review remains pending.**

Start with [specification](spec.md), [implementation plan](plan.md) and
[short handoff](IMPLEMENTATION_GUIDE.md). Supporting material:

- [Research decisions/alternatives](research.md), [data model](data-model.md) and
  [resource contract](contracts/resource-policy.md).
- [20 dependency-ordered tasks](tasks.md): T001-T015 and T018-T020 complete; T016-T017
  remain pending manual account review.
- [Prewritten regression/eval expectations](REGRESSION_EVALS.md), with B00/S03 measured
  before and after the fixes; other cases are represented in aggregate suite results or
  remain individually unrun as noted there.
- [Separate manual Gemini-account checklist](PROVIDER_ACCOUNT_CHECKLIST.md), all unverified.
- [Actual baseline results and preserved work](BASELINE.md), [validation guide](quickstart.md)
  and [specification quality review](checklists/requirements.md).

Owner decisions recorded2026-10-28: P1=60 attempts per server process; P2=process lifetime
with restart reset and independent allowances in other processes; P3=busy/rate precedence,
safe unavailability, existing verified generator fallback and delayed advice. The initial
503 acceptance scenario now explicitly applies to otherwise admissible requests.
The separate implementation instruction was supplied and completed. Local Spec Kit
selection remains010; Git branch is unchanged. Provider-account verification remains
pending. The final read-only Spec Kit consistency and convergence reports are in the chat.

Existing baseline passed391 unit tests and37 browser cases, build/typechecks/install/audit.
One overlapping browser invocation failed startup on occupied4173, then the serial rerun
passed. These results do not verify the planned fixes or actual provider-account settings.
