# Implementation Plan: 005 Backend Split (local API server next to the browser game)

This file is the whole feature package for a coding agent: specification, plan, tasks, exact code, expected results, and the prompts to paste into Codex. It is written so the agent **copies, not designs**.

- Written: 2026-09-27 by Claude Code (Opus 5.5), from a read of the code at `8926ec1` (`main`) and of the Week 04 course materials (weekly assignment, session 1 and 2 materials, AI API integration addendum, Retro AI Engineering Challenge).
- Implemented by: OpenAI Codex (Luna 6), one prompt per session (see §P at the end).
- Verification status of this plan: the repository files, the installed toolchain (Node `v24.14.0`, npm `11.12.1`), the absence of `@types/node`, the path `node_modules/vite/bin/vite.js`, and the registry versions `tsx@4.23.15` and `@types/node@24.19.0` were checked on 2026-09-27. **No code in this plan was executed** (the student chose "plan only, no copy, no build"). Therefore every "Expected" block is a strict prediction. If real output differs, the agent must stop and report, never improvise a fix.

Conventions:

- `§X` = a section of this file.
- "Create with exactly this content" / "Replace the whole content" means the file must contain exactly the block, with a final newline.
- "Replace exactly" means: find the `Old` text (it must occur exactly once), replace it with the `New` text, change nothing else. If `Old` is not found exactly once, stop and report.
- Line endings are not part of a match. Several docs (`README.md`, `AGENTS.md`, `security.md`, `docs/GAME_SPEC.md`, `docs/AI_USAGE_LOG.md`) use CRLF; keep each file's existing line endings when editing. All "Old" texts were checked on 2026-09-27 to occur exactly once in the files at `8926ec1`.
- `{{NAME}}` is a placeholder the agent fills with a real value it saw in command output or that the student typed.
- Commands work in PowerShell and in Git Bash unless a step says otherwise.

---

## §S Specification

### Problem

Session 004 adds an AI hint to the game. The Week 04 materials require that the AI provider is called **only from a server**: "API ključevi pripadaju serveru, nikada browseru" (AI API addendum, one-page summary, rule 3), with the flow `browser → naš server endpoint → server-side provider SDK + secret → validated result → browser-safe DTO` (addendum §10.3). Today the project is a static browser-only app, so there is no place where a key could live safely. This feature adds that place **before** any AI code exists, so the AI feature can later be a small, testable change.

### Decisions made by the student (2026-09-27)

| ID | Decision |
|---|---|
| DEC-1 | **Skeleton only.** The server has one route, `GET /api/health`. No game state, no hint route, no AI provider, no secrets. Gameplay stays 100 % in the browser. |
| DEC-2 | **Node.js built-in `node:http`**, run with **tsx**. New dev dependencies: `tsx` and `@types/node`. No framework, no runtime dependency. |
| DEC-3 | **Add `server/` only.** The frontend stays in `src/` (nothing moves). One `package.json`. |
| DEC-4 | **One origin (chosen as the more secure option).** In development Vite forwards `/api` to the API server. `npm start` runs one Node server that serves the built game (`dist/`) **and** `/api` on one port. Playwright tests use `npm start`. No CORS header is ever sent. |

### Plan defaults (proposed by Claude, accepted by the student when this plan is approved)

| ID | Default | Why |
|---|---|---|
| PD-1 | The server binds only to `127.0.0.1`. | Not reachable from other machines on the network. |
| PD-2 | Every request must carry `Host: 127.0.0.1:<port>` or `Host: localhost:<port>`; anything else gets `403 {"error":"FORBIDDEN_HOST"}`. | Blocks DNS-rebinding pages from reaching the local API once it holds a key. |
| PD-3 | `PORT` is validated at startup (integer 1024–65535, default 8787). | Constitution IV: external input is validated at runtime. |
| PD-4 | Static files: only `GET`/`HEAD`, the path must stay inside `dist/`, the extension must be on an allowlist. | No path traversal, no serving of unexpected files. |
| PD-5 | Fixed error bodies, no stack traces, security headers on every response. | Week 04: "Korisnik dobija stabilan status", no raw errors. |
| PD-6 | Dev ports: Vite `5173` (its default), API `8787`. Browser tests: `npm start` on `127.0.0.1:4173`. | 4173 keeps the existing test port; the IP avoids `localhost` → `::1` ambiguity. |
| PD-7 | A Vitest boundary test forbids `src/` from importing `server/` or Node built-ins, forbids `server/` from importing browser-only modules, and forbids `src/` from reading `process.env` / `import.meta.env`. | A weaker model in the AI feature cannot accidentally put the key into the browser bundle. |

### Functional requirements

- **FR-1** `GET /api/health` (and `HEAD`) returns `200`, `Content-Type: application/json; charset=utf-8`, `Cache-Control: no-store`, body exactly `{"status":"ok","service":"rush-hour-crossing-api"}`.
- **FR-2** Any other method on `/api/health` returns `405`, header `Allow: GET, HEAD`, body `{"error":"METHOD_NOT_ALLOWED"}`.
- **FR-3** `/api` and every other `/api/...` path return `404` `{"error":"NOT_FOUND"}`.
- **FR-4** A request whose `Host` header is not on the allowlist returns `403` `{"error":"FORBIDDEN_HOST"}` before any routing (API and static).
- **FR-5** With `--serve-dist`, `GET /` (with or without a query string) returns `dist/index.html`; `GET /assets/<file>` returns the file with its content type. Missing files, directories, non-allowlisted extensions, malformed percent-encoding and any path that resolves outside `dist/` return `404` `Not found` (plain text). Non-`GET`/`HEAD` methods return `405` `Method not allowed` with `Allow: GET, HEAD`.
- **FR-6** Every response has `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `X-Frame-Options: DENY`, and **no** `Access-Control-Allow-Origin`.
- **FR-7** `npm run dev` starts Vite and the API server together; `http://localhost:5173/api/health` answers through the Vite proxy. Ctrl+C stops both.
- **FR-8** `npm start` refuses to start with a clear message if `dist/index.html` is missing, and prints one line with the address when it listens.
- **FR-9** The game behaves exactly as before: all 69 existing unit tests and all 16 existing browser tests still pass unchanged (browser tests now run against `npm start`).

### Not changed

Rules R1–R7, everything in `src/` (no file in `src/` is edited), `tests/*.test.ts` outside `tests/server/`, `tests/fixtures/`, `e2e/support.ts`, `e2e/evidence.pw.ts`, `index.html`, `public/`, all screenshots in `docs/evidence/`, the tag `s003-baseline-v1`.

### Constitution check

| Principle | Result |
|---|---|
| I Locked scope | `GAME_SPEC.md` OUT OF SCOPE lists "backend". The student decided to allow a local API server; §C1 amends `GAME_SPEC.md` and records the decision in `AI_USAGE_LOG.md` **before** any code. No gameplay changes. |
| II Pure turn logic | `src/game/` untouched. |
| III Determinism | No randomness, no timers in game logic. |
| IV Runtime validation | `PORT`, `Host`, URL path and method are validated at runtime (tests in §C2, §C3). |
| V Config outside logic | Ports, hosts, content types live in `server/config.ts` and `server/static.ts`. |
| VI Tests first | §C2, §C3 and §C4 each start with failing tests. The boundary test (§C3) is a guard and passes immediately; this is stated there. |
| VII Smallest change | Skeleton only (DEC-1); one route; no framework. |
| VIII Traceable and safe | One commit per step, Conventional Commits, no secrets, run log + evidence + AI log. |
| Technical Constraints ("static and browser-only; backend … prohibited") | **Conflict.** Amended in §C1 as MINOR 1.1.1 → 1.2.0 (new allowed component), with the student's decision recorded. |

### What comes next (information only — do NOT implement in this feature)

The AI hint feature will add, inside `server/` only: a `POST /api/hint` route, a provider-neutral request/result contract, a fake provider for tests, the read-only `get_game_state` tool with allowlist and schema checks, and the provider key read from `process.env`. `src/` will get a small client that calls `/api/hint` on the same origin. None of that belongs to 005.

---

## §PL Plan (files)

Architecture after this feature:

```text
development:   browser ──> Vite :5173 ──(/api proxy)──> API server 127.0.0.1:8787
production /   browser ──> API server 127.0.0.1:<PORT>
browser tests:              ├── /api/*  -> server/app.ts (JSON)
                            └── /*      -> server/static.ts (files from dist/)
```

| File | Change | Step |
|---|---|---|
| `specs/005-backend-split/implementation-plan.md` | this plan | C0 |
| `specs/005-backend-split/run-log.md` | new; the agent appends real results after each task | C0–C5 |
| `.specify/memory/constitution.md` | MINOR 1.1.1 → 1.2.0, Technical Constraints | C1 |
| `docs/GAME_SPEC.md` | OUT OF SCOPE, technical boundary, D8, new section | C1 |
| `docs/AI_USAGE_LOG.md` | new entry (decisions) | C1 |
| `package.json`, `package-lock.json` | `tsx` + `@types/node` dev dependencies; `typecheck` and `build` scripts | C2 |
| `tsconfig.json` | exclude `tests/server` | C2 |
| `tsconfig.server.json` | new; Node types for `server/`, `tests/server/`, `vite.config.ts` | C2 |
| `tests/server/config.test.ts` | new, 14 tests | C2 |
| `server/config.ts` | new; `readServerConfig`, `allowedHostsFor` | C2 |
| `tests/server/app.test.ts` | new, 26 tests | C3 |
| `tests/server/boundaries.test.ts` | new, 3 tests | C3 |
| `server/responses.ts` | new; `sendJson`, `sendText` | C3 |
| `server/static.ts` | new; safe static file serving | C3 |
| `server/app.ts` | new; request handler (Host check, API routes, static) | C3 |
| `e2e/smoke.pw.ts` | 2 new browser tests appended | C4 |
| `server/index.ts` | new; entry point | C4 |
| `vite.config.ts` | new; dev proxy `/api` → `127.0.0.1:8787` | C4 |
| `scripts/dev.mjs` | new; starts Vite + API together | C4 |
| `package.json` | `dev`, `dev:web`, `dev:api`, `start` scripts | C4 |
| `playwright.config.ts` | run tests against `npm start` on `127.0.0.1:4173` | C4 |
| `AGENTS.md`, `README.md`, `security.md`, `docs/CONTEXT_MANIFEST.md`, `docs/EVIDENCE_004.md` (new), `docs/AI_USAGE_LOG.md` | documentation | C5 |

Commits, in order, on branch `005-backend-split`:

| Commit | Message |
|---|---|
| C0 | `docs(spec): add 005 backend split plan` |
| C1 | `docs: allow a local API server (constitution 1.2.0)` |
| C1a | `docs(spec): repair 005 run log encoding` (added 2026-09-28, see §C1a) |
| C2 | `feat(server): add validated server config and toolchain` |
| C3 | `feat(server): add health route, host allowlist and static files` |
| C4 | `feat(server): serve the game and the API from one origin` |
| C5 | `docs: record the backend split` |

Every commit message gets a second paragraph `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` (use `-m "<message>" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`).

Test counts (predictions):

| Moment | Unit (`npm run test:run`) | Browser (`npm run test:e2e`) |
|---|---|---|
| Baseline (T002) | 8 files / 69 tests | 16 passed |
| C2 red | 1 failed file, 69 tests passed | – |
| C2 green | 9 files / 83 tests | – |
| C3 red | 1 failed file, 86 tests passed | – |
| C3 green | 11 files / 112 tests | – |
| C4 red | 11 / 112 | 2 failed, 16 passed |
| C4 green | 11 / 112 | 18 passed |

---

## §T Tasks and hard rules

### Hard rules (apply to every task)

1. Work only on branch `005-backend-split`. Never `checkout main`, `switch main`, `merge`, `rebase`, `push`, `pull`, `tag`, `commit --amend`, `reset`, `stash`, or `clean`. Never touch tag `s003-baseline-v1`.
2. Copy code blocks exactly. Do not reformat, rename, reorder, add comments, add features, or "improve". No framework (no Express, Hono, Fastify, cors, dotenv, concurrently, nodemon).
3. Stage files only by explicit path (`git add <path> <path>`). Never `git add -A` / `git add .`. Never stage `docs/WEEK_03_REPORT_ALEKSA_DURUTOVIC.md`.
4. Never write a number, SHA, or result you did not see in real command output. Never claim a check that did not run.
5. If any output differs from the Expected text, stop immediately, paste the actual output, and report. Do not try a second fix. (Exception: Vitest/Playwright timing numbers such as `Duration 1.23s` may differ.)
6. Do not edit any file not listed in the step you are executing. Do not edit anything in `src/`.
7. Exactly **one** `npm install` command is allowed in the whole feature: the one in T004. No other package changes.
8. No secrets, no `.env` file, no API key, no private URL anywhere — not in code, not in docs, not in the run log.
9. After each task, append one row per command to `specs/005-backend-split/run-log.md` with the command and the real result (exit code and the summary lines, copied). This file is how the next session knows what happened.
10. Create and edit files **only with your own file-edit tool** (apply_patch). Never write or append to a file with PowerShell `Set-Content`, `Add-Content`, `Out-File`, `>` or `>>`, or with bash `echo >`/`cat >`: Windows PowerShell 5.1 saves in the Windows-1252 code page, not UTF-8 (this broke the run log in C0, see §C1a). Every file must be UTF-8 without BOM. If a file write fails, stop **before** any further `git add` or `git commit`.

### Task list

| ID | Step | Task |
|---|---|---|
| T001 | §C0 | Check start state, create branch, create run log, commit plan (C0) |
| T002 | §C0 | Run the baseline checks |
| T003 | §C1 | Amend constitution, GAME_SPEC, AI log; commit C1 |
| T003a | §C1a | Repair the run log (UTF-8, table, missing T002/T003 rows); commit C1a |
| T004 | §C2 | Install the two dev dependencies |
| T005 | §C2 | Update `tsconfig.json`, add `tsconfig.server.json`, update two scripts |
| T006 | §C2 | Add the config test; see it fail |
| T007 | §C2 | Add `server/config.ts`; see all pass; commit C2 |
| T008 | §C3 | Add app and boundary tests; see the app test fail |
| T009 | §C3 | Add `responses.ts`, `static.ts`, `app.ts`; see all pass; commit C3 |
| T010 | §C4 | Append 2 browser tests; see exactly 2 fail |
| T011 | §C4 | Add entry point, Vite proxy, dev script, scripts, Playwright config; see all pass |
| T012 | §C4 | Student manual check; commit C4 |
| T013 | §C5 | Update the six documents; commit C5 |
| T014 | §C6 | Final check and report |

---

## §C0 Start (T001, T002)

### T001

```bash
git branch --show-current
git status --short
git log --oneline -1
```

Expected:

```text
main
?? docs/WEEK_03_REPORT_ALEKSA_DURUTOVIC.md
?? specs/005-backend-split/
8926ec1 docs: record the difficulty selector
```

If the SHA is not `8926ec1` or any other file is modified or untracked, stop and report.

Create `specs/005-backend-split/run-log.md` with exactly this content:

```md
# Run log — 005 backend split

Real command results, appended by the coding agent after every task. Nothing here is predicted or edited by hand.

| Task | Command | Exit | Real result (copied summary lines) |
|---|---|---|---|
```

Then:

```bash
git switch -c 005-backend-split
git add specs/005-backend-split/implementation-plan.md specs/005-backend-split/run-log.md
git commit -m "docs(spec): add 005 backend split plan" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git branch --show-current
```

Expected last line: `005-backend-split`. From now on you are never on `main`.

### T002 — baseline (Node 24+, npm 11+)

```bash
node -v
npm -v
npm ci
npm run typecheck
npm run test:run
npm run build
npm audit --audit-level=high
```

Expected: every command exits 0. `npm run test:run` ends with:

```text
 Test Files  8 passed (8)
      Tests  69 passed (69)
```

If Playwright's Chromium is not installed yet, run `npx playwright install chromium` once, then:

```bash
npm run test:e2e
```

Expected: `16 passed`.

Append the results to the run log (rule 9). The run-log change is committed with C1.

---

## §C1 Governance first (T003)

The constitution currently forbids a backend. It must be amended before any server code exists.

### 1. `.specify/memory/constitution.md` (MINOR 1.1.1 → 1.2.0)

Replace exactly — Old:

```text
<!--
Sync Impact Report
- Version change: 1.1.0 -> 1.1.1
- Modified principles: none (Technical Constraints clarification: gameplay
  moves stay keyboard-only; the difficulty selector may also be used with a mouse)
- Added sections: none
- Removed sections: none
- Templates requiring updates: none
- Follow-up TODOs: none
-->
```

New:

```text
<!--
Sync Impact Report
- Version change: 1.1.1 -> 1.2.0
- Modified principles: none
- Modified sections: Technical Constraints (feature 005 allows a local API server in
  `server/`: loopback only, Host allowlist, one origin without CORS, no database, no
  deployment; live AI calls stay prohibited until an accepted specification allows them)
- Added sections: none
- Removed sections: none
- Templates requiring updates: none
- Follow-up TODOs: none
-->
```

Replace exactly — Old:

```text
- The approved stack is Vite, strict TypeScript, Canvas 2D, Vitest, and npm.
- The application is static and browser-only; backend, database, authentication,
  deployment, live AI calls, and network services are prohibited in Session 003.
```

New:

```text
- The approved stack is Vite, strict TypeScript, Canvas 2D, Vitest, npm, and, for the
  local API server only, the Node.js built-in `node:http` module run with tsx.
- The game runs in the browser. From feature 005 a local API server in `server/` may
  serve the built game and `/api` routes from one origin. It MUST bind only to
  `127.0.0.1`, MUST reject requests whose `Host` header is not on its allowlist, and
  MUST NOT send CORS headers. Database, authentication, deployment, and external
  network services remain prohibited. Live AI provider calls remain prohibited until
  an accepted feature specification allows them, and then only from `server/`.
- Game rules stay in the pure modules under `src/game/`; the server MUST NOT change
  them. Secrets, when a later feature needs them, MUST be read only by `server/` from
  the process environment and MUST never reach the browser bundle.
```

Replace exactly — Old:

```text
**Version**: 1.1.1 | **Ratified**: 2026-09-22 | **Last Amended**: 2026-09-27
```

New (`{{DATE}}` = today, from `Get-Date -Format yyyy-MM-dd` in PowerShell or `date +%F` in Git Bash):

```text
**Version**: 1.2.0 | **Ratified**: 2026-09-22 | **Last Amended**: {{DATE}}
```

### 2. `docs/GAME_SPEC.md` (student-approved amendment)

Replace exactly — Old:

```text
Konkretan izbor alata bira se u planu; nova infrastruktura se ne dodaje.
```

New:

```text
Konkretan izbor alata bira se u planu; nova infrastruktura se ne dodaje, osim lokalnog API servera iz feature 005 (vidi *Lokalni API server*), koji ne menja pravila R1–R7.
```

Replace exactly — Old:

```text
- backend, baza, deployment i druga nova infrastruktura
```

New:

```text
- baza, deployment i druga nova infrastruktura (izuzetak: lokalni API server u `server/`, feature 005 — samo `127.0.0.1`, bez baze, bez naloga, bez deploy-a)
```

Replace exactly — Old:

```text
nema AI/tool/mreže/backenda;
```

New:

```text
nema AI/tool poziva ni spoljnih mrežnih servisa; jedini backend je lokalni API server iz feature 005 (samo `127.0.0.1`, bez tajni);
```

Replace exactly — Old:

```text
- Dokaz: `tests/difficulty-query.test.ts`, `e2e/smoke.pw.ts` → *difficulty selector*, screenshot `docs/evidence/difficulty-switch.png`.

## Minimalni vizuelni zahtev
```

New:

```text
- Dokaz: `tests/difficulty-query.test.ts`, `e2e/smoke.pw.ts` → *difficulty selector*, screenshot `docs/evidence/difficulty-switch.png`.

## Lokalni API server (feature 005)

- Igra se i dalje igra u browseru; pravila R1–R7, preseti i determinizam se ne menjaju.
- `server/` je lokalni Node.js server (`node:http`, pokreće ga `tsx`). Sluša samo na `127.0.0.1` i odbija svaki zahtev čiji `Host` nije `127.0.0.1:<port>` ili `localhost:<port>`.
- Jedan origin: `npm start` servira izgrađenu igru (`dist/`) i `/api`; u razvoju (`npm run dev`) Vite prosleđuje `/api` serveru. CORS nije potreban i ne šalje se.
- Jedina ruta je `GET /api/health` → `{"status":"ok","service":"rush-hour-crossing-api"}`. Server nema stanje igre, AI poziv, bazu ni tajne.
- Dokaz: `tests/server/*.test.ts`, `e2e/smoke.pw.ts` → *same-origin API*, `docs/EVIDENCE_004.md` → *Part 0*.

## Minimalni vizuelni zahtev
```

### 3. `docs/AI_USAGE_LOG.md`

Append at the very end of the file (after the last line, with one empty line before it):

```md
## Backend split (feature 005) — {{DATE}}

- **Why AI was involved**: The Session 004 AI hint needs a place where a provider key can live outside the browser. The student asked Claude Code (Opus 5.5) to read the Week 04 materials and the code and to write `specs/005-backend-split/implementation-plan.md` (2026-09-27); OpenAI Codex (Luna 6) implements it step by step.
- **Decisions recorded (student)**: skeleton only — `GET /api/health`, no game state and no AI on the server yet (DEC-1); Node.js built-in `node:http` run with tsx, new dev dependencies `tsx` and `@types/node` (DEC-2); the frontend stays in `src/`, new `server/` folder, one `package.json` (DEC-3); one origin — Vite forwards `/api` in development and `npm start` serves `dist/` and `/api` together, chosen as the more secure option because no CORS is needed (DEC-4). Plan defaults PD-1–PD-7 (loopback bind, `Host` allowlist, validated `PORT`, static allowlist, fixed errors, ports, boundary test) were accepted with the plan. Constitution 1.1.1 → 1.2.0 and `GAME_SPEC.md` (technical boundary, OUT OF SCOPE, D8, new *Lokalni API server* section) were amended before any server code.
- **Deviation noted**: As in feature 004, one combined plan file replaces the separate Spec Kit spec/plan/tasks files.
```

### Commit C1

```bash
git add .specify/memory/constitution.md docs/GAME_SPEC.md docs/AI_USAGE_LOG.md specs/005-backend-split/run-log.md
git commit -m "docs: allow a local API server (constitution 1.2.0)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git show --stat --oneline HEAD
```

Expected: exactly those 4 files changed.

---

## §C1a Run log repair (T003a) — added 2026-09-28

### What happened (diagnosed by Claude on 2026-09-28, read-only)

- In T001 the run log was written with Windows PowerShell 5.1, which saved it in Windows-1252, not UTF-8 (the `—` in the title became byte `0x97`). Appending the T002 results then failed with a UTF-8 decoding error.
- The first T001 row was glued to the table header (`|---|---|---|---|| T001 …`), so the table does not render.
- The T002 and T003 rows were never written, and C1 (`77898c2`) was committed after the failed write instead of stopping first.
- The C1 content itself (constitution, `GAME_SPEC.md`, `AI_USAGE_LOG.md`) was checked and is correct valid UTF-8. It is **not** changed here. History is not rewritten (no amend, no reset); the repair is a new commit.

### T003a

Start state:

```bash
git branch --show-current
git log --oneline -3
git status --short
```

Expected:

```text
005-backend-split
77898c2 docs: allow a local API server (constitution 1.2.0)
ff31da1 docs(spec): add 005 backend split plan
8926ec1 docs: record the difficulty selector
 M specs/005-backend-split/implementation-plan.md
?? docs/WEEK_03_REPORT_ALEKSA_DURUTOVIC.md
```

(The plan is modified because Claude added this section and rule 10; it is committed in C1a.)

**Step 1 — replace the run log.** Using your file-edit tool (rule 10), delete `specs/005-backend-split/run-log.md` and add it again with exactly this content. If your tool cannot delete or read the broken file, delete it with `Remove-Item specs/005-backend-split/run-log.md` (PowerShell) or `rm specs/005-backend-split/run-log.md` (Git Bash) — deleting is allowed, writing with the shell is not — and then create it with your file-edit tool.

```md
# Run log — 005 backend split

Real command results, appended by the coding agent after every task. Nothing here is predicted or edited by hand.

| Task | Command | Exit | Real result (copied summary lines) |
|---|---|---|---|
| T001 | `git branch --show-current` | 0 | `main` |
| T001 | `git status --short` | 0 | `?? docs/WEEK_03_REPORT_ALEKSA_DURUTOVIC.md`; `?? specs/005-backend-split/` |
| T001 | `git log --oneline -1` | 0 | `8926ec1 docs: record the difficulty selector` |
| T001 | `git switch -c 005-backend-split` | 0 | `Switched to a new branch '005-backend-split'` |
| T001 | `git commit -m "docs(spec): add 005 backend split plan" ...` | 0 | `[005-backend-split ff31da1] docs(spec): add 005 backend split plan` |
| T001 | `git branch --show-current` | 0 | `005-backend-split` |
| T002 | first run | – | Reported by the agent as passing (typecheck, 69 unit tests, build, audit, 16 browser tests), but the rows could not be written: the file was not UTF-8. Re-run in T003a below. |
| T003 | note | – | Appending the T002 rows failed with a UTF-8 decoding error; C1 was committed before stopping. The C1 content was checked and is correct. Repaired in T003a (commit C1a). |
```

(The six T001 rows are copied unchanged from the broken file; only the encoding and the line break after the header were fixed.)

**Step 2 — prove the file is UTF-8 without BOM:**

```bash
node -e "const b=require('fs').readFileSync('specs/005-backend-split/run-log.md'); new TextDecoder('utf-8',{fatal:true}).decode(b); console.log(b[0]===0xEF?'BOM':'utf8 ok, no BOM')"
```

Expected output exactly: `utf8 ok, no BOM`. Anything else (an error or `BOM`) → stop.

**Step 3 — record C1 and re-run the baseline:**

```bash
git show --stat --oneline 77898c2
node -v
npm -v
npm ci
npm run typecheck
npm run test:run
npm run build
npm audit --audit-level=high
npm run test:e2e
```

Expected: every command exits 0; `git show` lists exactly the 4 C1 files; `npm run test:run` ends with `Test Files  8 passed (8)` / `Tests  69 passed (69)`; `npm run test:e2e` ends with `16 passed`.

Append one row per command to the run log **with your file-edit tool**, using `T003` for the `git show` row and `T002` for the others, with the real exit code and copied summary lines. Then run the Step 2 check again: it must still print `utf8 ok, no BOM`.

**Step 4 — commit C1a:**

```bash
git add specs/005-backend-split/run-log.md specs/005-backend-split/implementation-plan.md
git commit -m "docs(spec): repair 005 run log encoding" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git show --stat --oneline HEAD
git status --short
```

Expected: exactly those 2 files in the commit; afterwards `git status --short` shows only `?? docs/WEEK_03_REPORT_ALEKSA_DURUTOVIC.md`.

---

## §C2 Toolchain and validated server config (T004–T007)

### T004 — the only install of this feature

```bash
npm install --save-dev tsx@4.23.15 @types/node@24.19.0
npm ls tsx @types/node
```

Expected: exit 0; `npm ls` shows `tsx@4.23.15` and `@types/node@24.19.0` at the top level. The `devDependencies` block of `package.json` must now be exactly:

```json
  "devDependencies": {
    "@playwright/test": "^1.63.0",
    "@types/node": "^24.19.0",
    "tsx": "^4.23.15",
    "typescript": "^7.0.2",
    "vite": "^8.3.0",
    "vitest": "^5.0.1"
  }
```

Also confirm the file `node_modules/tsx/dist/cli.mjs` exists (`Test-Path node_modules/tsx/dist/cli.mjs` in PowerShell → `True`, or `ls node_modules/tsx/dist/cli.mjs` in Git Bash). If anything differs, stop.

### T005 — TypeScript projects and scripts

Replace the whole content of `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "moduleResolution": "Bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "types": ["vite/client"],
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src", "tests", "e2e", "playwright.config.ts"],
  "exclude": ["tests/server"]
}
```

(Only the `"exclude"` line is new; the browser project must not see Node types.)

Create `tsconfig.server.json` with exactly this content:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "lib": ["ES2022"],
    "types": ["node"]
  },
  "include": ["server", "tests/server", "vite.config.ts"],
  "exclude": []
}
```

(`"exclude": []` is required: otherwise the inherited `exclude` would hide `tests/server`. `vite.config.ts` does not exist until §C4; a missing include path is allowed.)

In `package.json`, replace exactly — Old:

```text
    "build": "tsc --noEmit && vite build",
```

New:

```text
    "build": "npm run typecheck && vite build",
```

Replace exactly — Old:

```text
    "typecheck": "tsc --noEmit",
```

New:

```text
    "typecheck": "tsc --noEmit && tsc --noEmit -p tsconfig.server.json",
```

Do **not** run `npm run typecheck` yet (the server project has no source file until T007).

### T006 — failing config test first

Create `tests/server/config.test.ts` with exactly this content:

```ts
import { describe, expect, it } from 'vitest'
import { allowedHostsFor, DEFAULT_PORT, readServerConfig } from '../../server/config'

const PORT_ERROR = /^Invalid PORT: expected an integer from 1024 to 65535\.$/

const ACCEPTED_PORTS: [string, number][] = [
  ['1024', 1024],
  ['4173', 4173],
  ['65535', 65535],
]

const REJECTED_PORTS: string[] = ['0', '1023', '65536', 'abc', '80.5', '-1', ' 4173', '1e4']

describe('server config', () => {
  it('uses 127.0.0.1:8787 when PORT is missing', () => {
    expect(DEFAULT_PORT).toBe(8787)
    expect(readServerConfig({})).toEqual({ host: '127.0.0.1', port: 8787 })
  })

  it('uses the default port when PORT is empty', () => {
    expect(readServerConfig({ PORT: '' })).toEqual({ host: '127.0.0.1', port: 8787 })
  })

  it.each(ACCEPTED_PORTS)('accepts PORT=%s', (value, port) => {
    expect(readServerConfig({ PORT: value })).toEqual({ host: '127.0.0.1', port })
  })

  it.each(REJECTED_PORTS)('rejects PORT="%s" with a fixed message', (value) => {
    expect(() => readServerConfig({ PORT: value })).toThrow(PORT_ERROR)
  })

  it('allows only the loopback Host values for a port', () => {
    expect(allowedHostsFor(4173)).toEqual(['127.0.0.1:4173', 'localhost:4173'])
  })
})
```

```bash
npm run test:run
```

Expected: exit code 1. `tests/server/config.test.ts` fails because `../../server/config` cannot be resolved (Vitest reports something like `Failed to load url ../../server/config` / `Does the file exist?`). Summary (prediction):

```text
 Test Files  1 failed | 8 passed (9)
      Tests  69 passed (69)
```

If the config test does **not** fail, or any other file fails, stop.

### T007 — implement

Create `server/config.ts` with exactly this content:

```ts
export interface ServerConfig {
  host: '127.0.0.1'
  port: number
}

export const DEFAULT_PORT = 8787

const MIN_PORT = 1024
const MAX_PORT = 65535

/**
 * Reads the server settings from environment variables and validates them at runtime.
 * The host is fixed to the loopback address, so the server is never reachable from
 * another machine. The error message never repeats the rejected value.
 */
export function readServerConfig(env: Readonly<Record<string, string | undefined>>): ServerConfig {
  const raw = env.PORT
  if (raw === undefined || raw === '') {
    return { host: '127.0.0.1', port: DEFAULT_PORT }
  }

  const port = Number(raw)
  if (!/^\d+$/.test(raw) || !Number.isInteger(port) || port < MIN_PORT || port > MAX_PORT) {
    throw new Error(`Invalid PORT: expected an integer from ${MIN_PORT} to ${MAX_PORT}.`)
  }

  return { host: '127.0.0.1', port }
}

/** `Host` header values the server accepts; everything else is rejected (DNS-rebinding guard). */
export function allowedHostsFor(port: number): readonly string[] {
  return [`127.0.0.1:${port}`, `localhost:${port}`]
}
```

```bash
npm run test:run
npm run typecheck
npm run build
npm audit --audit-level=high
```

Expected: every command exits 0. `npm run typecheck` prints nothing. Unit summary:

```text
 Test Files  9 passed (9)
      Tests  83 passed (83)
```

Append the T004–T007 results to the run log (including the T006 failing summary).

### Commit C2

```bash
git add package.json package-lock.json tsconfig.json tsconfig.server.json tests/server/config.test.ts server/config.ts specs/005-backend-split/run-log.md
git commit -m "feat(server): add validated server config and toolchain" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git show --stat --oneline HEAD
```

Expected: exactly those 7 files.

---

## §C3 Health route, Host allowlist and static files (T008, T009)

### T008 — failing tests first

Create `tests/server/app.test.ts` with exactly this content:

```ts
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { createServer, request, type IncomingHttpHeaders, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createRequestHandler, HEALTH_RESPONSE } from '../../server/app'
import { allowedHostsFor } from '../../server/config'

interface RawResponse {
  status: number
  headers: IncomingHttpHeaders
  body: string
}

interface RunningServer {
  server: Server
  port: number
}

const INDEX_HTML = '<!doctype html><title>fixture</title>'
const APP_JS = 'console.log("fixture")'
const SECRET = '{"secret":"outside the static root"}'

const NOT_FOUND_PATHS: string[] = [
  '/missing.html',
  '/assets',
  '/assets/notes.txt',
  '/..%2fsecret.json',
  '/%2e%2e/secret.json',
  '/..%5csecret.json',
  '/%2Fsecret.json',
  '/%E0%A4%A',
]

let tempDir = ''
let withStatic: RunningServer
let apiOnly: RunningServer

beforeAll(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'rhc-server-'))
  const staticDir = join(tempDir, 'public')
  await mkdir(join(staticDir, 'assets'), { recursive: true })
  await writeFile(join(staticDir, 'index.html'), INDEX_HTML)
  await writeFile(join(staticDir, 'assets', 'app.js'), APP_JS)
  await writeFile(join(staticDir, 'assets', 'notes.txt'), 'not on the allowlist')
  await writeFile(join(tempDir, 'secret.json'), SECRET)
  withStatic = await startServer(staticDir)
  apiOnly = await startServer(undefined)
})

afterAll(async () => {
  await stopServer(withStatic.server)
  await stopServer(apiOnly.server)
  await rm(tempDir, { recursive: true, force: true })
})

async function startServer(staticDir: string | undefined): Promise<RunningServer> {
  const server = createServer()
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as AddressInfo
  server.on('request', createRequestHandler({ allowedHosts: allowedHostsFor(port), staticDir }))
  return { server, port }
}

function stopServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
}

function send(
  target: RunningServer,
  method: string,
  path: string,
  host = `127.0.0.1:${target.port}`,
): Promise<RawResponse> {
  return new Promise((resolve, reject) => {
    const outgoing = request(
      { host: '127.0.0.1', port: target.port, method, path, headers: { host }, agent: false },
      (incoming) => {
        const chunks: Buffer[] = []
        incoming.on('data', (chunk: Buffer) => chunks.push(chunk))
        incoming.on('end', () =>
          resolve({
            status: incoming.statusCode ?? 0,
            headers: incoming.headers,
            body: Buffer.concat(chunks).toString('utf8'),
          }),
        )
      },
    )
    outgoing.on('error', reject)
    outgoing.end()
  })
}

describe('API routes', () => {
  it('GET /api/health returns the health body as JSON', async () => {
    const response = await send(apiOnly, 'GET', '/api/health')

    expect(response.status).toBe(200)
    expect(response.headers['content-type']).toBe('application/json; charset=utf-8')
    expect(response.headers['cache-control']).toBe('no-store')
    expect(JSON.parse(response.body)).toEqual({ status: 'ok', service: 'rush-hour-crossing-api' })
    expect(JSON.parse(response.body)).toEqual(HEALTH_RESPONSE)
  })

  it('HEAD /api/health returns the headers without a body', async () => {
    const response = await send(apiOnly, 'HEAD', '/api/health')

    expect(response.status).toBe(200)
    expect(response.body).toBe('')
  })

  it('rejects other methods on /api/health with a JSON 405', async () => {
    const response = await send(apiOnly, 'POST', '/api/health')

    expect(response.status).toBe(405)
    expect(response.headers.allow).toBe('GET, HEAD')
    expect(JSON.parse(response.body)).toEqual({ error: 'METHOD_NOT_ALLOWED' })
  })

  it.each(['/api', '/api/unknown', '/api/health/extra'])('answers the unknown API route %s with a JSON 404', async (path) => {
    const response = await send(withStatic, 'GET', path)

    expect(response.status).toBe(404)
    expect(response.headers['content-type']).toBe('application/json; charset=utf-8')
    expect(JSON.parse(response.body)).toEqual({ error: 'NOT_FOUND' })
  })

  it('sends the security headers and no CORS header', async () => {
    const response = await send(apiOnly, 'GET', '/api/health')

    expect(response.headers['x-content-type-options']).toBe('nosniff')
    expect(response.headers['referrer-policy']).toBe('no-referrer')
    expect(response.headers['x-frame-options']).toBe('DENY')
    expect(response.headers['access-control-allow-origin']).toBeUndefined()
  })
})

describe('Host allowlist', () => {
  it('accepts localhost with the server port', async () => {
    const response = await send(apiOnly, 'GET', '/api/health', `localhost:${apiOnly.port}`)

    expect(response.status).toBe(200)
  })

  it.each(['evil.example', 'evil.example:8787', '127.0.0.1', 'localhost:1'])('rejects the Host header %s with 403', async (host) => {
    const response = await send(apiOnly, 'GET', '/api/health', host)

    expect(response.status).toBe(403)
    expect(JSON.parse(response.body)).toEqual({ error: 'FORBIDDEN_HOST' })
  })

  it('checks the Host header before serving static files', async () => {
    const response = await send(withStatic, 'GET', '/', 'evil.example')

    expect(response.status).toBe(403)
    expect(response.body).not.toContain('fixture')
  })
})

describe('static files', () => {
  it('serves index.html for /', async () => {
    const response = await send(withStatic, 'GET', '/')

    expect(response.status).toBe(200)
    expect(response.headers['content-type']).toBe('text/html; charset=utf-8')
    expect(response.headers['cache-control']).toBe('no-cache')
    expect(response.body).toBe(INDEX_HTML)
  })

  it('ignores the query string', async () => {
    const response = await send(withStatic, 'GET', '/?difficulty=hard&lives=2')

    expect(response.status).toBe(200)
    expect(response.body).toBe(INDEX_HTML)
  })

  it('serves a built script with a JavaScript content type', async () => {
    const response = await send(withStatic, 'GET', '/assets/app.js')

    expect(response.status).toBe(200)
    expect(response.headers['content-type']).toBe('text/javascript; charset=utf-8')
    expect(response.body).toBe(APP_JS)
  })

  it.each(NOT_FOUND_PATHS)('answers %s with 404 and never leaks files', async (path) => {
    const response = await send(withStatic, 'GET', path)

    expect(response.status).toBe(404)
    expect(response.body).toBe('Not found')
    expect(response.body).not.toContain('secret')
  })

  it('rejects non-read methods for static paths with 405', async () => {
    const response = await send(withStatic, 'POST', '/')

    expect(response.status).toBe(405)
    expect(response.headers.allow).toBe('GET, HEAD')
    expect(response.body).toBe('Method not allowed')
  })

  it('serves no files when no static directory is configured', async () => {
    const response = await send(apiOnly, 'GET', '/')

    expect(response.status).toBe(404)
    expect(response.body).toBe('Not found')
  })
})
```

Create `tests/server/boundaries.test.ts` with exactly this content:

```ts
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const NODE_BUILTINS: readonly string[] = ['fs', 'path', 'http', 'https', 'net', 'os', 'child_process', 'crypto', 'process']

function typeScriptFiles(directory: string): string[] {
  return readdirSync(directory, { recursive: true, encoding: 'utf8' })
    .filter((file) => file.endsWith('.ts'))
    .map((file) => join(directory, file))
}

function importSpecifiers(file: string): string[] {
  const source = readFileSync(file, 'utf8')
  return Array.from(source.matchAll(/(?:\bfrom|\bimport)\s*\(?\s*['"]([^'"]+)['"]/g), (match) => match[1])
}

function violations(directory: string, isForbidden: (specifier: string) => boolean): string[] {
  return typeScriptFiles(directory).flatMap((file) =>
    importSpecifiers(file)
      .filter(isForbidden)
      .map((specifier) => `${file} imports ${specifier}`),
  )
}

describe('frontend and backend boundaries', () => {
  it('src/ never imports server code or Node.js built-ins', () => {
    expect(
      violations(
        'src',
        (specifier) =>
          specifier.startsWith('node:') ||
          NODE_BUILTINS.includes(specifier) ||
          /(^|\/)server(\/|$)/.test(specifier),
      ),
    ).toEqual([])
  })

  it('server/ never imports browser-only modules', () => {
    expect(
      violations(
        'server',
        (specifier) => /(^|\/)src\/(main|render|input)(\/|\.|$)/.test(specifier) || specifier.endsWith('.css'),
      ),
    ).toEqual([])
  })

  it('src/ never reads environment variables', () => {
    const readers = typeScriptFiles('src').filter((file) => {
      const source = readFileSync(file, 'utf8')
      return source.includes('process.env') || source.includes('import.meta.env')
    })

    expect(readers).toEqual([])
  })
})
```

```bash
npm run test:run
```

Expected: exit code 1. Only `tests/server/app.test.ts` fails (cannot resolve `../../server/app`). The boundary test is a guard for rules that are already true, so its 3 tests **pass** now; that is intended. Summary (prediction):

```text
 Test Files  1 failed | 10 passed (11)
      Tests  86 passed (86)
```

If the app test does not fail, or any other file fails, stop.

### T009 — implement

Create `server/responses.ts` with exactly this content:

```ts
import type { ServerResponse } from 'node:http'

export function sendJson(response: ServerResponse, status: number, body: unknown): void {
  const text = JSON.stringify(body)
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(text),
  })
  response.end(text)
}

export function sendText(response: ServerResponse, status: number, text: string): void {
  response.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': Buffer.byteLength(text),
  })
  response.end(text)
}
```

Create `server/static.ts` with exactly this content:

```ts
import { readFile, stat } from 'node:fs/promises'
import type { ServerResponse } from 'node:http'
import { extname, resolve, sep } from 'node:path'
import { sendText } from './responses'

const CONTENT_TYPES: Readonly<Record<string, string>> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2',
}

/**
 * Maps a URL pathname to a file inside `rootDir`. Returns `null` when the path is
 * malformed, leaves `rootDir`, or has a file type that is not on the allowlist.
 */
export function resolveStaticPath(rootDir: string, pathname: string): string | null {
  let decoded: string
  try {
    decoded = decodeURIComponent(pathname)
  } catch {
    return null
  }

  if (decoded.includes('\0')) {
    return null
  }

  const root = resolve(rootDir)
  const filePath = resolve(root, decoded === '/' ? 'index.html' : decoded.slice(1))
  if (!filePath.startsWith(root + sep) || !Object.hasOwn(CONTENT_TYPES, extname(filePath).toLowerCase())) {
    return null
  }

  return filePath
}

export async function serveStaticFile(response: ServerResponse, rootDir: string, pathname: string): Promise<void> {
  const filePath = resolveStaticPath(rootDir, pathname)
  if (!filePath || !(await isFile(filePath))) {
    sendText(response, 404, 'Not found')
    return
  }

  const body = await readFile(filePath)
  response.writeHead(200, {
    'Content-Type': CONTENT_TYPES[extname(filePath).toLowerCase()],
    'Content-Length': body.length,
    'Cache-Control': 'no-cache',
  })
  response.end(body)
}

async function isFile(filePath: string): Promise<boolean> {
  try {
    return (await stat(filePath)).isFile()
  } catch {
    return false
  }
}
```

Create `server/app.ts` with exactly this content:

```ts
import type { IncomingMessage, ServerResponse } from 'node:http'
import { sendJson, sendText } from './responses'
import { serveStaticFile } from './static'

export interface RequestHandlerOptions {
  /** Exact `Host` header values that may reach the server; anything else gets 403. */
  allowedHosts: readonly string[]
  /** Built frontend to serve (`dist/`). Without it only `/api` routes answer. */
  staticDir?: string
}

export type RequestHandler = (request: IncomingMessage, response: ServerResponse) => void

export const HEALTH_RESPONSE = { status: 'ok', service: 'rush-hour-crossing-api' } as const

const READ_METHODS: readonly string[] = ['GET', 'HEAD']

const SECURITY_HEADERS: Readonly<Record<string, string>> = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY',
}

export function createRequestHandler(options: RequestHandlerOptions): RequestHandler {
  return (request, response) => {
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
      response.setHeader(name, value)
    }

    if (!options.allowedHosts.includes(request.headers.host ?? '')) {
      sendJson(response, 403, { error: 'FORBIDDEN_HOST' })
      return
    }

    const pathname = readPathname(request.url)

    if (pathname === '/api' || pathname.startsWith('/api/')) {
      handleApi(request, response, pathname)
      return
    }

    if (!READ_METHODS.includes(request.method ?? '')) {
      response.setHeader('Allow', 'GET, HEAD')
      sendText(response, 405, 'Method not allowed')
      return
    }

    if (!options.staticDir) {
      sendText(response, 404, 'Not found')
      return
    }

    serveStaticFile(response, options.staticDir, pathname).catch(() => {
      if (response.headersSent) {
        response.destroy()
        return
      }
      sendText(response, 500, 'Internal server error')
    })
  }
}

function handleApi(request: IncomingMessage, response: ServerResponse, pathname: string): void {
  response.setHeader('Cache-Control', 'no-store')

  if (pathname !== '/api/health') {
    sendJson(response, 404, { error: 'NOT_FOUND' })
    return
  }

  if (!READ_METHODS.includes(request.method ?? '')) {
    response.setHeader('Allow', 'GET, HEAD')
    sendJson(response, 405, { error: 'METHOD_NOT_ALLOWED' })
    return
  }

  sendJson(response, 200, HEALTH_RESPONSE)
}

function readPathname(url: string | undefined): string {
  try {
    return new URL(url ?? '/', 'http://127.0.0.1').pathname
  } catch {
    return ''
  }
}
```

```bash
npm run test:run
npm run typecheck
npm run build
```

Expected: every command exits 0; `npm run typecheck` prints nothing. Unit summary:

```text
 Test Files  11 passed (11)
      Tests  112 passed (112)
```

Append the T008–T009 results to the run log (including the T008 failing summary).

### Commit C3

```bash
git add tests/server/app.test.ts tests/server/boundaries.test.ts server/responses.ts server/static.ts server/app.ts specs/005-backend-split/run-log.md
git commit -m "feat(server): add health route, host allowlist and static files" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git show --stat --oneline HEAD
```

Expected: exactly those 6 files.

---

## §C4 One origin for game and API (T010–T012)

### T010 — failing browser tests first

Append at the very end of `e2e/smoke.pw.ts` (after its last line `})`, with one empty line before the new block):

```ts
test.describe('same-origin API', () => {
  test('serves the API health check from the game origin', async ({ request }) => {
    const response = await request.get('/api/health')

    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toBe('application/json; charset=utf-8')
    expect(response.headers()['access-control-allow-origin']).toBeUndefined()
    expect(await response.json()).toEqual({ status: 'ok', service: 'rush-hour-crossing-api' })
  })

  test('answers an unknown API route with a JSON 404', async ({ request }) => {
    const response = await request.get('/api/does-not-exist')

    expect(response.status()).toBe(404)
    expect(await response.json()).toEqual({ error: 'NOT_FOUND' })
  })
})
```

```bash
npm run test:e2e
```

Expected: exit code 1 with exactly **2 failed, 16 passed**. Both failures are the two new `same-origin API` tests (the old config still serves the game with `vite preview`, which answers `/api/...` with the game's `index.html`, so the content type or the status is wrong). If the number of failures is not exactly 2, or an old test fails, stop.

### T011 — implement

Create `server/index.ts` with exactly this content:

```ts
import { existsSync } from 'node:fs'
import { createServer } from 'node:http'
import { join, resolve } from 'node:path'
import { createRequestHandler } from './app'
import { allowedHostsFor, readServerConfig } from './config'

function main(): void {
  const config = readServerConfig(process.env)
  const staticDir = process.argv.includes('--serve-dist') ? resolve('dist') : undefined

  if (staticDir && !existsSync(join(staticDir, 'index.html'))) {
    throw new Error('dist/index.html was not found. Run "npm run build" first.')
  }

  const server = createServer(createRequestHandler({ allowedHosts: allowedHostsFor(config.port), staticDir }))

  server.on('error', (error) => {
    console.error(`Server error: ${error.message}`)
    process.exitCode = 1
  })

  server.listen(config.port, config.host, () => {
    const mode = staticDir ? 'game and API' : 'API only'
    console.log(`Rush Hour Crossing server (${mode}) on http://${config.host}:${config.port}`)
  })
}

try {
  main()
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Server failed to start.')
  process.exitCode = 1
}
```

Create `vite.config.ts` with exactly this content:

```ts
import { defineConfig } from 'vite'

// Development only: the page calls /api on the Vite origin and Vite forwards it to the local API server.
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
      },
    },
  },
})
```

(`changeOrigin: true` makes the forwarded `Host` header `127.0.0.1:8787`, which is on the server's allowlist.)

Create `scripts/dev.mjs` with exactly this content:

```js
// Starts the Vite dev server and the API server together. Ctrl+C stops both.
import { spawn } from 'node:child_process'

const commands = [
  ['node_modules/vite/bin/vite.js'],
  ['node_modules/tsx/dist/cli.mjs', 'watch', '--clear-screen=false', 'server/index.ts'],
]

const children = commands.map((args) => spawn(process.execPath, args, { stdio: 'inherit' }))
let stopping = false

function stopAll(exitCode) {
  if (stopping) {
    return
  }
  stopping = true
  process.exitCode = exitCode
  for (const child of children) {
    if (child.exitCode === null) {
      child.kill()
    }
  }
}

for (const child of children) {
  child.on('exit', (code) => stopAll(code ?? 0))
}

process.on('SIGINT', () => stopAll(0))
process.on('SIGTERM', () => stopAll(0))
```

In `package.json`, replace exactly — Old:

```text
    "dev": "vite",
```

New:

```text
    "dev": "node scripts/dev.mjs",
    "dev:web": "vite",
    "dev:api": "tsx watch server/index.ts",
    "start": "tsx server/index.ts --serve-dist",
```

Replace the whole content of `playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.pw.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://127.0.0.1:4173',
    viewport: { width: 1280, height: 1000 },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
  },
  webServer: {
    command: 'npm run build && npm start',
    url: 'http://127.0.0.1:4173/api/health',
    env: { PORT: '4173' },
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
```

After these edits the `"scripts"` block of `package.json` must be exactly:

```json
  "scripts": {
    "dev": "node scripts/dev.mjs",
    "dev:web": "vite",
    "dev:api": "tsx watch server/index.ts",
    "start": "tsx server/index.ts --serve-dist",
    "build": "npm run typecheck && vite build",
    "test": "vitest",
    "test:run": "vitest run",
    "typecheck": "tsc --noEmit && tsc --noEmit -p tsconfig.server.json",
    "preview": "vite preview",
    "test:e2e": "playwright test e2e/smoke.pw.ts",
    "evidence:screenshots": "playwright test e2e/evidence.pw.ts"
  },
```

Run:

```bash
npm run typecheck
npm run test:run
npm run build
npm audit --audit-level=high
npm run test:e2e
```

Expected: every command exits 0; typecheck prints nothing; unit summary `Test Files  11 passed (11)` / `Tests  112 passed (112)`; e2e ends with `18 passed`.

Do **not** run `npm run evidence:screenshots` (the existing screenshots must not change). Then check:

```bash
git status --short
```

Expected: no file under `docs/evidence/` is listed.

Append the T010–T011 results to the run log (including the T010 failing summary).

### T012 — student manual check (ask the student, wait for the answer)

Ask the student to do this and to reply in their own words. Do not do it yourself and do not commit before the answer.

1. In a terminal: `npm run dev`. Two startup outputs appear: Vite (with a `Local:` URL, normally `http://localhost:5173/`) and `Rush Hour Crossing server (API only) on http://127.0.0.1:8787`.
2. Open the Vite URL. The game looks and plays exactly as before (arrows, Space, R, EASY/NORMAL/HARD).
3. Open `<Vite URL>api/health` (for example `http://localhost:5173/api/health`). The page shows `{"status":"ok","service":"rush-hour-crossing-api"}`.
4. Press Ctrl+C in the terminal. Both servers stop.
5. Run `npm run build`, then `npm start`. The line `Rush Hour Crossing server (game and API) on http://127.0.0.1:8787` appears. Open `http://127.0.0.1:8787/` (game works) and `http://127.0.0.1:8787/api/health` (same JSON). Ctrl+C to stop.
6. Optional security check while `npm start` runs, in a second terminal (PowerShell must use `curl.exe`, not `curl`):

```bash
curl.exe -i -H "Host: evil.example" http://127.0.0.1:8787/api/health
```

Expected: `HTTP/1.1 403 Forbidden` and the body `{"error":"FORBIDDEN_HOST"}`.

Write the student's answer word for word into the run log as `T012 | manual check | – | <answer>`.

### Commit C4

```bash
git add e2e/smoke.pw.ts server/index.ts vite.config.ts scripts/dev.mjs package.json playwright.config.ts specs/005-backend-split/run-log.md
git commit -m "feat(server): serve the game and the API from one origin" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git show --stat --oneline HEAD
```

Expected: exactly those 7 files.

---

## §C5 Documentation (T013)

Placeholders in this section: `{{DATE}}` (today), `{{C4_SHA}}` (short SHA of commit C4 from `git log --oneline -1`), `{{C2_RED}}`, `{{C2_GREEN}}`, `{{C3_RED}}`, `{{C3_GREEN}}`, `{{E2E_RED}}`, `{{E2E_GREEN}}`, `{{AUDIT_RESULT}}`, `{{MANUAL_ANSWER}}` — all copied from `specs/005-backend-split/run-log.md`. `{{TSX_VERSION}}` and `{{TYPES_NODE_VERSION}}` come from `npm ls tsx @types/node`. `{{CONTRIBUTION}}`: ask the student for one or two sentences on who did what and paste their answer unchanged.

### 1. `AGENTS.md`

Replace exactly — Old:

```text
7. `docs/CONTEXT_MANIFEST.md` — which context is included and which is deliberately excluded.
```

New:

```text
7. `specs/005-backend-split/` — accepted infrastructure addendum: a local API server in `server/` that serves the built game and `/api` from one origin (`127.0.0.1` only, `Host` allowlist, no CORS). It changes no rule R1–R7 and adds no AI call.
8. `docs/CONTEXT_MANIFEST.md` — which context is included and which is deliberately excluded.
```

Replace exactly — Old:

```text
- `src/main.ts` — wiring only.
```

New:

```text
- `src/main.ts` — wiring only.
- `server/` — local Node.js API server (`node:http`, run with tsx). It may import the pure modules in `src/game/` and `src/config/`, never `src/main.ts`, `src/render/`, `src/input/`, or CSS. It is the only code that may read `process.env`; a future provider key lives only here.
- `src/` never imports `server/` or Node.js built-ins and never reads `process.env` or `import.meta.env` (enforced by `tests/server/boundaries.test.ts`).
- `scripts/dev.mjs` — starts Vite and the API server together for `npm run dev`.
```

Replace exactly — Old:

```text
- `tests/` — Vitest unit tests; `tests/fixtures/golden-paths.ts` holds the recorded paths. `e2e/` — Playwright browser tests (`*.pw.ts`). Keep the two separate.
```

New:

```text
- `tests/` — Vitest unit tests; `tests/fixtures/golden-paths.ts` holds the recorded paths; `tests/server/` holds the server tests (type-checked by `tsconfig.server.json`). `e2e/` — Playwright browser tests (`*.pw.ts`), run against `npm start` on `http://127.0.0.1:4173`. Keep the two separate.
```

Replace exactly — Old:

```text
Record claim, signal, change, and result in `docs/EVIDENCE_003.md`.
```

New:

```text
Record claim, signal, change, and result in `docs/EVIDENCE_003.md` (Session 004 work: `docs/EVIDENCE_004.md`).
```

Replace exactly — Old:

```text
Session 004 AI hint and tool calling, backend, database,
```

New:

```text
Session 004 AI hint and tool calling (until their own specification is accepted), any backend other than the local API server in `server/`, database,
```

### 2. `README.md`

Replace exactly — Old:

```text
- `npm run dev` — start the local development server
```

New:

```text
- `npm run dev` — start the Vite dev server and the local API server (`http://127.0.0.1:8787`) together; Vite forwards `/api` to the API server. Ctrl+C stops both
- `npm run dev:web` / `npm run dev:api` — start only one of the two
- `npm start` — serve the production build (`dist/`, run `npm run build` first) and `/api` from one local server on `http://127.0.0.1:8787` (set `PORT` to change the port)
```

Replace exactly — Old:

```text
- `npm run test:e2e` — build the game and run the browser smoke test (startup, focus, invalid configuration, win/loss input lock, restart, difficulty selector)
```

New:

```text
- `npm run test:e2e` — build the game, serve it with `npm start` on `http://127.0.0.1:4173`, and run the browser smoke test (startup, focus, invalid configuration, win/loss input lock, restart, difficulty selector, same-origin API)
```

Replace exactly — Old:

```text
Corrections from the third review (non-overlapping and winnable presets, browser smoke test) are specified in `specs/003-review-fixes/`.
```

New:

```text
Corrections from the third review (non-overlapping and winnable presets, browser smoke test) are specified in `specs/003-review-fixes/`. Feature 005 (`specs/005-backend-split/`) separates a local Node.js API server (`server/`) from the browser game (`src/`) as preparation for the Session 004 AI hint; it adds no AI call and changes no game rule.
```

Replace exactly — Old:

```text
Session 004 AI functionality, backend services, deployment, audio, real-time movement, and additional game mechanics are out of scope.
```

New:

```text
Session 004 AI functionality (until its own specification is accepted), backend services other than the local API server in `server/`, deployment, audio, real-time movement, and additional game mechanics are out of scope.
```

### 3. `security.md`

Replace exactly — Old:

```text
The application is a static, local-first browser game with no backend, database, authentication, user accounts, file upload, analytics, or live external service.
```

New:

```text
The application is a local-first browser game. Since feature 005 a small local Node.js server, bound to `127.0.0.1`, serves the built game and `/api` from one origin. There is no database, authentication, user accounts, file upload, analytics, or live external service.
```

Replace exactly — Old:

```text
| Stack | Vite 8.3.0, TypeScript 7.0.2, Vitest 5.0.1, Canvas 2D; Playwright 1.63.0 (development only) |
```

New:

```text
| Stack | Vite 8.3.0, TypeScript 7.0.2, Vitest 5.0.1, Canvas 2D; local API server on Node.js `node:http` run with tsx {{TSX_VERSION}}; Playwright 1.63.0 and @types/node {{TYPES_NODE_VERSION}} (development only) |
```

Replace exactly — Old:

```text
| Last updated | 2026-09-26 |
```

New:

```text
| Last updated | {{DATE}} |
```

Replace exactly — Old:

```text
- No live AI provider or external API is permitted in Session 003.
```

New:

```text
- No live AI provider or external API is permitted yet. When a later accepted feature adds one, its key is read only by `server/` from the process environment; `src/` must not read `process.env` or `import.meta.env` (enforced by `tests/server/boundaries.test.ts`).
```

Replace exactly — Old:

```text
### Dependency audit
```

New:

```text
### Local API server (feature 005)

- Binds only to `127.0.0.1`, so it is not reachable from other machines. `PORT` is validated at startup (integer 1024–65535, default 8787); an invalid value stops the server with a fixed message that does not repeat the value.
- One origin, no CORS: `npm start` serves `dist/` and `/api` from one server; in development Vite forwards `/api` to the server. The server never sends `Access-Control-Allow-Origin`, so other websites cannot read its responses.
- `Host` allowlist (`127.0.0.1:<port>`, `localhost:<port>`): any other `Host` gets `403 {"error":"FORBIDDEN_HOST"}` before routing. This blocks DNS-rebinding pages from reaching the API.
- Static files: only `GET`/`HEAD`; the decoded path must stay inside `dist/` and must have an allowlisted extension (`.html`, `.js`, `.css`, `.png`, `.svg`, `.ico`, `.json`, `.woff2`). Anything else is `404 Not found`. Traversal attempts are covered by `tests/server/app.test.ts`.
- Every response has `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, and `X-Frame-Options: DENY`; API responses have `Cache-Control: no-store`.
- Errors are fixed JSON codes (`NOT_FOUND`, `METHOD_NOT_ALLOWED`, `FORBIDDEN_HOST`) or fixed plain-text messages; no stack traces or file paths are sent.

### Dependency audit
```

Replace exactly — Old:

```text
| Current check | 2026-09-26 |
```

New:

```text
| Current check | {{DATE}} | Branch `005-backend-split`, code at `{{C4_SHA}}`, after `npm ci` | {{AUDIT_RESULT}} |
| Historical | 2026-09-26 |
```

Replace exactly — Old:

```text
- The tests open only `http://localhost:4173`, served by `vite preview` from the local build. They make no request to any other host.
```

New:

```text
- The tests open only `http://127.0.0.1:4173`, served by the local API server (`npm start`) from the local build. They make no request to any other host.
```

Replace exactly — Old:

```text
## Not applicable in Session 003

SQL injection protection, server security headers, rate limiting, authentication, authorization, CSRF, file upload protection, server logging, database hardening, HTTPS configuration, WAF, and production monitoring are not applicable because the project has no server, database, accounts, network API, upload, or deployment target. Adding any of them would violate the locked scope.
```

New:

```text
## Not applicable

SQL injection protection, rate limiting, authentication, authorization, CSRF, file upload protection, database hardening, HTTPS configuration, WAF, and production monitoring are not applicable because the project has no database, accounts, upload, or deployment target, and its only server listens on the loopback address. Adding any of them would violate the locked scope.
```

Replace exactly — Old:

```text
- Hosting-specific security headers cannot be selected or verified until deployment is explicitly brought into scope.
```

New:

```text
- Hosting-specific security headers cannot be selected or verified until deployment is explicitly brought into scope.
- No `Content-Security-Policy` header is sent yet; it needs its own browser test before it is added.
- The loopback bind and the `Host` allowlist protect a developer machine only; they are not a deployment security model.
- `scripts/dev.mjs` (the combined `npm run dev`) has no automated test; it was checked manually (see `docs/EVIDENCE_004.md`).
```

### 4. `docs/CONTEXT_MANIFEST.md`

Replace exactly — Old:

```text
| `e2e/`, `playwright.config.ts` | Yes | Browser smoke test and evidence capture |
```

New:

```text
| `specs/005-backend-split/` and the Week 04 course materials | Yes, for the backend split | Student decisions DEC-1–DEC-4, why a provider key must stay server-side, why one origin was chosen, exact server files and tests | 2 | Ports (8787 dev API, 4173 browser tests) and scripts are tied to the plan; changing them invalidates its expected outputs. Provider examples in the Week 04 addendum must not be copied before the AI hint is specified |
| `e2e/`, `playwright.config.ts` | Yes | Browser smoke test and evidence capture |
```

Replace exactly — Old:

```text
| `README.md`, `package.json`, `src/`, `tests/` |
```

New:

```text
| `README.md`, `package.json`, `src/`, `server/`, `tests/` |
```

### 5. `docs/EVIDENCE_004.md` (new file)

Create with exactly this content, then fill the placeholders:

````md
# Evidence — Session 004

Part 0 records the preparation step: the split of a local API server from the browser game (feature 005). The AI hint parts are added by the AI hint feature.

# Part 0 — Backend split (feature 005, {{DATE}}, code at `{{C4_SHA}}`)

## Claim

The game still runs unchanged in the browser. A separate local API server (`server/`) serves the built game and `/api` from one origin, listens only on `127.0.0.1`, rejects unknown `Host` headers, and sends no CORS header. No AI code and no secret exists yet.

## Decisions (student, 2026-09-27)

| ID | Decision |
|---|---|
| DEC-1 | Skeleton only: one route, `GET /api/health`; no game state, no AI, no secrets on the server |
| DEC-2 | Node.js built-in `node:http`, run with tsx (dev dependencies `tsx`, `@types/node`) |
| DEC-3 | Frontend stays in `src/`; new `server/` folder; one `package.json` |
| DEC-4 | One origin (chosen as the more secure option): Vite proxy in development, `npm start` serves `dist/` and `/api` together; no CORS |

Plan defaults PD-1–PD-7 are listed in `specs/005-backend-split/implementation-plan.md` §S.

## Tests first

| Step | Before the implementation | After |
|---|---|---|
| C2 server config | `{{C2_RED}}` | `{{C2_GREEN}}` |
| C3 routes, Host allowlist, static files | `{{C3_RED}}` | `{{C3_GREEN}}` |
| C4 same-origin browser tests | `{{E2E_RED}}` | `{{E2E_GREEN}}` |

## Checks on `{{C4_SHA}}`

| Command | Result |
|---|---|
| `npm run typecheck` (browser and server projects) | exit 0 |
| `npm run test:run` | `{{C3_GREEN}}` |
| `npm run build` | exit 0 |
| `npm audit --audit-level=high` | {{AUDIT_RESULT}} |
| `npm run test:e2e` | `{{E2E_GREEN}}` |

Full command log: `specs/005-backend-split/run-log.md`.

## Success and failure examples (from `tests/server/app.test.ts`)

```text
GET /api/health                         -> 200 {"status":"ok","service":"rush-hour-crossing-api"}
POST /api/health                        -> 405 {"error":"METHOD_NOT_ALLOWED"}   Allow: GET, HEAD
GET /api/unknown                        -> 404 {"error":"NOT_FOUND"}
GET /api/health  (Host: evil.example)   -> 403 {"error":"FORBIDDEN_HOST"}
GET /..%2fsecret.json                   -> 404 Not found   (file outside dist/ is never read)
```

No response contains a stack trace, a file path, or an `Access-Control-Allow-Origin` header.

## Manual check (student)

{{MANUAL_ANSWER}}

## Known limitations

- `scripts/dev.mjs` (the combined `npm run dev`) has no automated test; it was checked manually above.
- No `Content-Security-Policy` header is sent yet.
- The loopback bind and the `Host` allowlist protect a developer machine only; deployment is out of scope.
- The server has no AI route yet. The provider key, the `get_game_state` tool, and `HintResponse` validation belong to the AI hint feature.

## Contribution

{{CONTRIBUTION}}

AI use: Claude Code (Opus 5.5) wrote the plan; OpenAI Codex (Luna 6) implemented it; details in `docs/AI_USAGE_LOG.md` → *Backend split (feature 005)*.
````

### 6. `docs/AI_USAGE_LOG.md`

Append at the very end of the file (directly after the *Deviation noted* line added in §C1, no empty line between):

```md
- **Verification signal**: the server tests failed before each module existed and pass after (`{{C2_RED}}` → `{{C2_GREEN}}`; `{{C3_RED}}` → `{{C3_GREEN}}`); the 2 new browser tests failed while the game was served by `vite preview` and pass on the local server (`{{E2E_RED}}` → `{{E2E_GREEN}}`). On `{{C4_SHA}}`: typecheck (browser and server projects), build, audit ({{AUDIT_RESULT}}), and the student's manual check of `npm run dev` and `npm start`.
```

### Placeholder check

```bash
git grep -n "{{" -- AGENTS.md README.md security.md docs/CONTEXT_MANIFEST.md docs/EVIDENCE_004.md docs/AI_USAGE_LOG.md docs/GAME_SPEC.md .specify/memory/constitution.md
```

Expected: no output (exit code 1 means "nothing found", which is correct here). If anything is listed, fill it from real output; if a value is unknown, stop and ask.

### Commit C5

```bash
git add AGENTS.md README.md security.md docs/CONTEXT_MANIFEST.md docs/EVIDENCE_004.md docs/AI_USAGE_LOG.md specs/005-backend-split/run-log.md
git commit -m "docs: record the backend split" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git show --stat --oneline HEAD
```

Expected: exactly those 7 files.

---

## §C6 Final check (T014)

```bash
git branch --show-current
git log --oneline -8
git status --short
npm ci
npm run typecheck
npm run test:run
npm run build
npm audit --audit-level=high
npm run test:e2e
```

Expected: branch `005-backend-split`; the top seven commits are C5, C4, C3, C2, C1a, C1, C0 on top of `8926ec1`; `git status` shows only `?? docs/WEEK_03_REPORT_ALEKSA_DURUTOVIC.md`; every check exits 0 with `112 passed` (unit) and `18 passed` (browser).

Report to the student: the seven SHAs, the check results, and the sentence "not pushed, not merged". The student merges into `main` themselves (reviewers read `main`).

---

## §R If a prediction is wrong (report, do not fix)

These are the places where the plan is most likely to differ from reality, because nothing was executed. For each, the agent stops and reports the real output; the student brings it back to Claude.

| Where | What might differ | Report |
|---|---|---|
| T004 | npm writes different version ranges or adds other packages | the `devDependencies` block and `npm ls` output |
| T006 / T008 | Vitest words the "cannot resolve" error differently | fine if only the expected file fails and the passing count matches; otherwise stop |
| T007 / T009 | a TypeScript error from `tsc -p tsconfig.server.json` (e.g. a Node type) | the full error text; do not add `any`, casts, or `@ts-ignore` |
| T009 | a traversal path returns something other than 404 | the test name and actual status/body — this is a security bug, never loosen the test |
| T010 | not exactly 2 failures | the list of failing test names |
| T011 | Playwright waits for the server and times out | the webServer output (for example `dist/index.html was not found`, `EADDRINUSE`) |
| T012 | `tsx watch` rejects `--clear-screen=false` | the exact message from `npm run dev` |

---

## §P Prompts for Codex

Start a **new** Codex session for each prompt. After each one, do the student check before sending the next.

### Prompt 0 — Read and confirm (no changes)

```text
Pre implementacije:
1. Sažmi razumevanje zadatka.
2. Navedi plan u nekoliko koraka.
3. Navedi nejasnoće ili pretpostavke.
4. Ne proširuj scope bez eksplicitnog razloga.

Role: You are a coding agent in the Rush Hour Crossing repository. In this session you only READ. Do not edit, create, delete, stage, or commit any file. Do not run npm install.

Read, in this order: AGENTS.md, .specify/memory/constitution.md, docs/GAME_SPEC.md, specs/005-backend-split/implementation-plan.md, package.json, tsconfig.json, playwright.config.ts, e2e/smoke.pw.ts (only its last 20 lines), security.md, README.md, docs/CONTEXT_MANIFEST.md.

Then answer:
1. Which branch must all work happen on, and which git commands are forbidden?
2. Which is the only npm install command allowed, and in which task?
3. Why must the constitution be amended (C1) before any server code is written?
4. Which files are created in C2, C3 and C4?
5. What are the predicted unit test summaries after C2 and after C3, and the browser summary before and after T011?
6. Why does the server check the Host header, and why does vite.config.ts use changeOrigin: true?
7. List every "Old" text in the plan that does NOT occur exactly once in the current files. If none, say "none".

Stop after answering.
```

**Student check**: branch `005-backend-split`; forbidden include checkout/switch main, merge, push, `git add -A`; the only install is T004 (`tsx@4.23.15`, `@types/node@24.19.0`); C1 because the constitution currently forbids a backend; 83 → 112 unit tests; browser 2 failed/16 passed → 18 passed; Host check = DNS-rebinding guard, `changeOrigin` so the proxied `Host` is `127.0.0.1:8787` which is allowed. Answer 7 must be "none" — anything else, bring it back to Claude before continuing.

### Prompt 1 — Start and governance (T001–T003)

```text
Pre implementacije:
1. Sažmi razumevanje zadatka.
2. Navedi plan u nekoliko koraka.
3. Navedi nejasnoće ili pretpostavke.
4. Ne proširuj scope bez eksplicitnog razloga.

Role: You are a coding agent in the Rush Hour Crossing repository. Implement tasks T001 to T003 from specs/005-backend-split/implementation-plan.md (sections §T, §C0, §C1) and nothing else.

Rules:
- Follow the hard rules in §T exactly.
- Make every "Replace exactly" edit exactly as written; if an Old text is not found exactly once, stop.
- {{DATE}} is today's date from the command given in §C1.
- Append real results to specs/005-backend-split/run-log.md after each task.
- If any output differs from the Expected text, stop immediately, paste the actual output, and report. Do not try another fix.

Finish with: completed task IDs, the T002 check results, and the C0 and C1 short SHAs. Then stop.
```

**Student check**: `git log --oneline -3` shows C1, C0, `8926ec1`; `git show --stat HEAD` lists the 4 files; read the new constitution bullets and the new *Lokalni API server* section in `GAME_SPEC.md`.

### Prompt 1a — Run log repair (T003a) — added 2026-09-28

```text
Pre implementacije:
1. Sažmi razumevanje zadatka.
2. Navedi plan u nekoliko koraka.
3. Navedi nejasnoće ili pretpostavke.
4. Ne proširuj scope bez eksplicitnog razloga.

Role: You are a coding agent in the Rush Hour Crossing repository, on branch 005-backend-split. Implement task T003a from specs/005-backend-split/implementation-plan.md (section §C1a) and nothing else. Do not start T004.

Rules:
- Follow the hard rules in §T exactly, especially the new rule 10: create and edit files only with your file-edit tool (apply_patch). Never write files with PowerShell Set-Content, Add-Content, Out-File, > or >>.
- Do not change .specify/memory/constitution.md, docs/GAME_SPEC.md or docs/AI_USAGE_LOG.md. Do not amend, reset or rewrite any commit.
- The Step 2 check must print exactly "utf8 ok, no BOM", both before and after you append the T002/T003 rows.
- If any output differs from the Expected text, or any file write fails, stop before git add, paste the actual output, and report.

Finish with: the Step 2 output, the re-run T002 summary lines, and the C1a short SHA. Then stop.
```

**Student check**: `git log --oneline -4` shows C1a, C1, C0, `8926ec1`; `git show --stat HEAD` lists only `run-log.md` and `implementation-plan.md`; open `specs/005-backend-split/run-log.md` in your editor — the title dash shows correctly and the table renders. Then continue with Prompt 2.

### Prompt 2 — Server config, routes and static files (T004–T009)

```text
Pre implementacije:
1. Sažmi razumevanje zadatka.
2. Navedi plan u nekoliko koraka.
3. Navedi nejasnoće ili pretpostavke.
4. Ne proširuj scope bez eksplicitnog razloga.

Role: You are a coding agent in the Rush Hour Crossing repository, on branch 005-backend-split. Implement tasks T004 to T009 from specs/005-backend-split/implementation-plan.md (sections §C2 and §C3) and nothing else.

Rules:
- Follow the hard rules in §T exactly. The npm install in T004 is the only package change allowed.
- Copy every code block exactly. Do not add a framework, a comment, a cast, `any`, or `@ts-ignore`.
- T006 must fail (only tests/server/config.test.ts) before you create server/config.ts. T008 must fail (only tests/server/app.test.ts) before you create server/app.ts. If not, stop.
- Never change a test to make it pass. A failing traversal/Host test is a security bug: stop and report.
- Append real results to specs/005-backend-split/run-log.md after each task.
- If any output differs from the Expected text, stop, paste the actual output, and report.

Finish with: completed task IDs, the T006 and T008 failing summary lines, the T007 and T009 passing summary lines, and the C2 and C3 short SHAs. Then stop.
```

**Student check**: `git log --oneline -6`; `git show --stat HEAD~1` (7 files) and `git show --stat HEAD` (6 files); open `server/app.ts` and follow one request: Host check → `/api` → static.

### Prompt 3 — One origin (T010–T012)

```text
Pre implementacije:
1. Sažmi razumevanje zadatka.
2. Navedi plan u nekoliko koraka.
3. Navedi nejasnoće ili pretpostavke.
4. Ne proširuj scope bez eksplicitnog razloga.

Role: You are a coding agent in the Rush Hour Crossing repository, on branch 005-backend-split. Implement tasks T010 to T012 from specs/005-backend-split/implementation-plan.md (section §C4) and nothing else.

Rules:
- Follow the hard rules in §T exactly. Do not edit anything in src/.
- T010 must end with exactly 2 failed and 16 passed browser tests before you create server/index.ts. If not, stop.
- Never run npm run evidence:screenshots. If any file in docs/evidence/ is modified, stop.
- Before committing C4, ask me (the student) to do the manual check in T012 and wait for my answer. Record my answer word for word in the run log and in your final report.
- If any output differs from the Expected text, stop, paste the actual output, and report.

Finish with: the T010 failing summary, the T011 check results (typecheck, unit summary, build, audit, e2e summary), my manual-check answer, and the C4 short SHA. Then stop.
```

**Student check**: do the T012 steps yourself when Codex asks (both `npm run dev` and `npm start`); `git show --stat HEAD` lists the 7 files; `git status --short` shows nothing under `docs/evidence/`.

### Prompt 4 — Documentation and final check (T013–T014)

```text
Pre implementacije:
1. Sažmi razumevanje zadatka.
2. Navedi plan u nekoliko koraka.
3. Navedi nejasnoće ili pretpostavke.
4. Ne proširuj scope bez eksplicitnog razloga.

Role: You are a coding agent in the Rush Hour Crossing repository, on branch 005-backend-split. Implement tasks T013 and T014 from specs/005-backend-split/implementation-plan.md (sections §C5 and §C6) and nothing else.

Rules:
- Follow the hard rules in §T exactly.
- Fill every {{...}} placeholder only with values from specs/005-backend-split/run-log.md, from `git log`, from `npm ls tsx @types/node`, or from my answers. Ask me for {{CONTRIBUTION}} and paste my answer unchanged.
- Make every "Replace exactly" edit exactly as written; if an Old text is not found exactly once, stop.
- If any output differs from the Expected text, stop, paste the actual output, and report.
- Do not push and do not merge.

Finish with: the seven commit SHAs (C0, C1, C1a, C2–C5), the §C6 check results, and the sentence "not pushed, not merged". Then stop.
```

**Student check**: `git log --oneline -8`; read `docs/EVIDENCE_004.md`, the new `security.md` section and the AI log entry; the placeholder `git grep` from §C5 returns nothing. Then merge into `main` yourself when satisfied.
