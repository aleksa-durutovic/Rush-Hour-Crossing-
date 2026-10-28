# Research and Decisions: Week 08

Date: 2026-10-27. Read-only inspection and one research subagent under speckit-plan.
No provider call, secret inspection or source implementation occurred in this phase.

## R01 - Continue the implemented generator branch

Decision: work directly in codex/ai-level-generator-feature at 06ff2534aa4e28abf65c3822d5f6695f3855103d.
The checkout was clean before this package. Features 007/008 are committed there.
The older codex/ai-level-generator checkout has unresolved merges. Main in the original
directory has unrelated uncommitted work. Neither is a safe base for this handoff.
The desktop app declined attachment because another chat owns the selected checkout;
all operations used its explicit path. No branch or original checkout was switched/reset.
Spec Kit's reported BRANCH=009-secure-the-arcade is a feature label, not Git branch evidence.

## R02 - Reuse the existing architecture

Decision: generator is the selected W05 flow; use advice for shared controls/regressions and
its existing untrusted-text rendering path. No authentication, database, rich text, RAG,
new user goal field or game mechanics. Candidate/evaluation IDs are scoped per run.
Rationale: assignment explicitly permits local-only projects and fake providers.

Inspection: strict Zod contracts, 2048-byte generator request body, fixed solveLevel dispatch,
incremental solver batches, same-run selection, final proof and explicit Play already exist.
Generator replaces model final summary with application text. Dynamic UI uses textContent;
src/main.ts initial innerHTML is a static app template, not a dynamic output sink.
No localStorage/sessionStorage usage was found. Score/summary data is browser-controlled.

## R03 - Shared admission and draining work

Decision: global five admissions per rolling 60000ms, one generation, one advice, two total,
no queue. Count only valid actually admitted work. Keep generator busy status compatible.
Use monotonic time and server state, never caller IDs/forwarded IPs.
Rationale: small demo policy, not an OWASP standard or distributed rate limiter.
Alternative rejected: UI-disabled button or generator-only guard does not bound advice
or repeated admitted jobs.

A logical timeout does not settle a non-cooperative underlying provider promise. Track
actual invocation promises and hold the job lease until logical completion AND settlement.
A hanging transport may keep its operation busy until process restart; document that
availability tradeoff. Do not block timely existing backup routing on abort acknowledgement.
All started attempts still use existing per-run ceilings, so outstanding work stays bounded.

Source: [OWASP API4 resource consumption](https://api-security.owasp.org/editions/2023/en/0xa4-unrestricted-resource-consumption/).

## R04 - Browser and origin policy

Decision: production scripts/styles/assets/connections self only; deny objects, base,
framing and forms; allow data images solely for existing empty favicon. No script unsafe-inline,
unsafe-eval or CSP bypass. Preserve nosniff/no-referrer. HMR remains a separate dev profile.
Use an available second-loopback script fixture for CSP proof; confirm HTTP 200 directly,
then require browser securitypolicyviolation and no execution.
Alternative rejected: missing-resource/404 or Report-Only cannot prove enforcement.

For AI POSTs, absent Origin remains allowed for direct local clients; a present Origin
must exactly match an application-configured local origin. Production accepts only the
served loopback origins; dev additionally permits the pinned Vite loopback port.
This strengthens access policy, not authentication or a claim of CSRF protection.
No automatically sent access credential exists; conditional credential-CSRF case is N/A,
while Host/Origin/media-type/budget tests remain mandatory.

Source: [OWASP CSP guidance](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html).

## R05 - Output bounds and privacy

Decision: retain generator 8192-byte output and compact evidence bounds; add advice raw
text cap 2048 UTF-8 bytes before JSON.parse and HTTP/browser advice cap 4096 bytes.
nextTip remains at most160 characters and120 output tokens; no model migration.
An SDK may already materialize its response before the adapter cap; record that limitation.

Use existing advice nextTip and generator unavailable message for malicious-text browser
tests, and prove model-summary discard separately. No renderer/input is added for a test.
Project only parsed evidence; reject forbidden fields inside evidence, and prove a sibling
secret outside evidence never enters later model context.

Events use fixed keys/enums and application correlation IDs, max32 per admitted job and a
128-event process ring; no raw prompt/statistics/provider output/exception or stack.
The local ring is not persistent or tamper-proof. Tests inspect an injected capture sink.
Source: [OWASP Logging guidance](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html).

## R06 - Dependency gate measured during planning

Actual installed versions: Vite8.3.0, Vitest5.0.1, @vitest/mocker5.0.1, Zod4.6.5.
npm audit --audit-level=high exited1:4 vulnerabilities (2 moderate,2 high).
These are package counts, not the number of individual advisory IDs.

| Package | Compatible patch floor researched | Exposure and action |
|---|---|---|
| Vite | 8.3.3 | Dev dependency; production custom node:http does not use its dev handlers. Update within current line; inspect all six listed advisories. |
| Zod | 4.6.6 | Runtime validator; constrained-collection allocation finding. Existing byte limits help but do not justify keeping an affected version. |
| Vitest / mocker | 5.0.3, resolved mocker at least5.0.3 | Dev-only public mocker-plugin endpoint prerequisites were not found in current Node Vitest configuration. Update compatible patch and verify lock resolution. |

Vite audit IDs: GHSA-698v-4r3x-3vcv, GHSA-r825-w8mm-5pxw, GHSA-587h-7wmj-h5pm,
GHSA-9jrq-w75r-8gcw, GHSA-rq7h-c2jc-7f22, GHSA-vfpm-58rq-9qcg.
Zod: GHSA-mrhx-c7xc-m3w5. Vitest/mocker: GHSA-qxg6-89mg-rqv8 and GHSA-xp26-3454-mjgp.

Primary evidence:
- [Vite8.3.3 release](https://github.com/vitejs/vite/releases/tag/v8.3.3).
- [launch-editor Windows escaping](https://github.com/vitejs/launch-editor/security/advisories/GHSA-698v-4r3x-3vcv),
  [CLI flags](https://github.com/vitejs/launch-editor/security/advisories/GHSA-r825-w8mm-5pxw),
  [Windows path check](https://github.com/vitejs/launch-editor/security/advisories/GHSA-587h-7wmj-h5pm).
- [Vite custom middleware](https://github.com/vitejs/vite/security/advisories/GHSA-9jrq-w75r-8gcw),
  [non-Windows path match](https://github.com/vitejs/vite/security/advisories/GHSA-rq7h-c2jc-7f22),
  [WASM disclosure](https://github.com/vitejs/vite/security/advisories/GHSA-vfpm-58rq-9qcg).
- [Zod4.6.6 release](https://github.com/colinhacks/zod/releases/tag/v4.6.6) and
  [maintainer fix](https://github.com/colinhacks/zod/pull/6652).
- [Vitest registration](https://github.com/vitest-dev/vitest/security/advisories/GHSA-qxg6-89mg-rqv8),
  [Windows traversal](https://github.com/vitest-dev/vitest/security/advisories/GHSA-xp26-3454-mjgp).

Do not run audit fix --force. Patch only measured causes, rerun audit and all regressions.
These researched floors do not guarantee a future clean audit; recheck current advisories.
No dependency was changed during planning.

## R07 - Source package and provenance

Course source: C:/Users/AleksA/Desktop/week-08-paket-za-studente-discord.zip.
SHA256:36D51F83BFE225D24C7A1ABA62AB64B23B6EE27E1E24BCD21375D1015119285E.
Read the complete assignment Markdown, evidence template, session material and relevant
pages of the30-page combined lesson PDF. Assignment version is W08,23 October2026.
This package adapts its I1-I8 and T00-T17 to the actual project; course example limits are
not universal standards. Screenshots are optional when executable evidence is clearer.
No slides, audio, new presentation or external testing is required.
