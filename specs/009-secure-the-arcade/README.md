# Week 08: Secure the Arcade

User-approved scope, 2026-10-27. Planning package only; implementation is pending.

Continue on branch **codex/ai-level-generator-feature**, based on commit
06ff2534aa4e28abf65c3822d5f6695f3855103d. Feature 007 and Feature 008 are already
implemented there. Do not use the conflicted codex/ai-level-generator checkout or the
older main checkout as an implementation base.

Start with [IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md). It gives the read order,
test-first workflow, limits and completion conditions for a cheaper implementing model.

- [spec.md](spec.md): user outcomes, I1-I8 and acceptance requirements.
- [plan.md](plan.md): architecture, existing boundaries and implementation slices.
- [research.md](research.md): decisions, inspected evidence and source references.
- [data-model.md](data-model.md): bounded server-owned policy and lifecycle entities.
- [contracts/security-policy.md](contracts/security-policy.md): normative limits and errors.
- [SECURITY_EVALS.md](SECURITY_EVALS.md): prewritten T00-T17 expectations and fixtures.
- [tasks.md](tasks.md): dependency-ordered implementation tasks; all initially unchecked.
- [quickstart.md](quickstart.md): repeatable validation and eight-minute demo.
- [checklists/requirements.md](checklists/requirements.md): document quality, not test results.
- [../../docs/EVIDENCE_W08.md](../../docs/EVIDENCE_W08.md): actual planning baseline and
  pending implementation evidence. Do not mistake planned checks for executed checks.

The approved work hardens the existing generator, shared HTTP/browser boundaries and
advice resource handling. Preserve gameplay, deterministic solver proof, explicit Play,
delayed advice and bounded opt-in failover. No optional challenge, new authentication,
database, deployment, rich-text renderer or live provider call is included.
