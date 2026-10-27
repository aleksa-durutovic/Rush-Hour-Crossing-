# Validation and Demo Runbook

This runbook describes future implementation verification. The new security scripts,
fixtures and controls do not exist yet. See tasks.md and the current evidence record.

## 1. Select the existing generator checkout

In PowerShell:

    Set-Location -LiteralPath 'C:\Users\AleksA\.codex\worktrees\feature-007-generator-publish\Rush hour crossing'
    git branch --show-current
    git rev-parse HEAD
    git status --short
    node --version
    npm --version

Expected branch: codex/ai-level-generator-feature. Planning base:06ff2534aa4e28abf65c3822d5f6695f3855103d.
Use Node24+/npm11+. Do not switch to the conflicted similarly named branch.
Verify .specify/feature.json selects specs/009-secure-the-arcade; if missing/wrong, set
only that local metadata field. A Spec Kit feature label is not a Git branch switch.

## 2. Repair baseline gate and install

Reproduce the actual checks, record the failing audit, then perform T002's targeted
compatible dependency repair. Run each command and retain exit/result:

    npm ci
    npm run typecheck
    npm run test:run
    npm run build
    npm audit --audit-level=high
    npx playwright install chromium
    npm run test:e2e

Planning's existing browser regression run set GEMINI_API_KEY empty and
AI_FAILOVER_ENABLED=false in its child shell. This prevented accidental provider use.
Do not load/read a real .env for adversarial checks. The new harness injects fake SDK
transport and synthetic config directly and does not invoke .env loading at all.

## 3. One security command after implementation

    npm run test:security

Expected: security unit/integration suites, production build and security browser suite
all pass; no real key or provider access. Each required T00-T17 result maps to a test.
For iteration, planned subcommands are:

    npm run test:security:unit
    npm run build
    npm run test:security:browser

Use the built frontend under the actual handler at127.0.0.1:4173, with one Playwright
worker, fresh fixture state and no server reuse/CSP bypass. Browser fixture factory may
start/reset that server programmatically. Normal npm start must not gain a fake-mode switch.
Close fixture servers in finally/teardown; restore any test stubbed environment.

Reset admission/event state with a new test server composition; fake clocks advance the
minute window without a real wait. Normal server restart resets its in-memory policy/ring.
A stuck draining provider intentionally retains its slot until settlement or restart.

## 4. Before/after evidence

Before changing each corresponding behavior, execute T02 privilege, T13 rate and T16 CSP
with exactly the fixtures in SECURITY_EVALS.md. Capture real counters, headers and browser
policy events; after change rerun the same tests. Record actual checkpoint/diff.
The existing good privilege control may pass both runs. Never remove it for the demo.

## 5. Eight-minute demonstration

| Time | Demonstration |
|---|---|
| 0:00-1:00 | Show game, chosen generator flow, local-only architecture and top risk. |
| 1:00-2:30 | Fake-backed normal two-decision run with real solve; preview unchanged state, explicit Play and working moves. |
| 2:30-5:00 | One direct API privilege/rate rejection and one malicious model/tool or foreign-evidence rejection. |
| 5:00-6:30 | Actual provider/tool counters, state snapshots and allow/deny events; explain draining work test. |
| 6:30-8:00 | Three before/after cases, actual production CSP proof, current audit and residual limits. |

Run the known available forbidden-script test and show its matching CSP violation, not
just a missing marker. Use existing executable tests/output instead of inventing results.
Each partner should explain one new payload/late-response variation and what it would
and would not prove. Record actual contributions when supplied.

## 6. Completion and delivery

Run final AGENTS.md gates and test:security from one recorded checkpoint. Summarize failures
honestly. Keep commands/results, six risks, three priorities, I1-I8, T00-T17 and three
comparisons in docs/EVIDENCE_W08.md. Record meaningful AI decisions in docs/AI_USAGE_LOG.md.
No live provider calls or remote publication is needed. Branch work remains unsubmitted
until main contains it; do not automatically push/merge.
