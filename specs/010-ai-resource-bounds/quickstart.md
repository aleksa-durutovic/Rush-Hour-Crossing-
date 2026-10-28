# Validation and review quickstart

This is a future validation guide, not authorization to implement or spend quota.

1. Read IMPLEMENTATION_GUIDE.md, spec/plan/contracts/REGRESSION_EVALS.md. P1/P2/P3 are approved
   (60 attempts/process, restart reset, agreed exhaustion handling). Obtain a separate
   implementation instruction before code; retain the existing branch.
2. In the exact target worktree inspect branch/HEAD/status/remote refs again; preserve all
   edits. Select local .specify/feature.json -> specs/010-ai-resource-bounds without checkout.
3. Establish a fresh fake-only baseline. Use Node24+/npm11+ and explicitly empty provider
   key/disabled failover in server-launching child environments. Never display credentials.
4. For US1 run B00 before code through the existing real composition with approved N=60,
   without new budget APIs. Record the actual red signal; then add gate/accounting and
   small-limit injection, and run B01-B18/G01-G03. Repeat unchanged B00 after correction.
5. For US2 run S03 before code with a controlled128KiB source through actual generator
   client. Record reads/cancel/parse; then implement only local reader and rerun S01-S12.
6. Verify US3 manually from PROVIDER_ACCOUNT_CHECKLIST.md. Repository automated checks do
   not verify account settings. Do not change them or make a real call from this guide.
7. Run focused Vitest tests first, then project checkpoints below; record actual outcomes.

```text
npm ci
npm run typecheck
npm run test:run
npm run build
npm audit --audit-level=high
npm run test:security
npm run test:e2e
```

Run browser suites one after another: both use4173. Reuse existing Chromium if available;
npx playwright install chromium is a one-time prerequisite if missing, not an assumed pass.
No new test script is required: Vitest discovers new *.test.ts; existing explicit security
and generator browser files are already named in their respective scripts.

Expected future outcome: prewritten cases pass without changing006-009 limits, game logic,
presets/golden paths, proof/Play/delay or secret boundaries. See BASELINE.md for actual
planning-date results; never copy them as a future implementer's checkpoint.

No commit/push/merge/deploy or live provider check is included. Branch-only local work is
not submitted to main; do not resolve that distinction by publishing without instruction.
