# Evidence — Session 004

Part 0 records the preparation step: the split of a local API server from the browser game (feature 005). The AI hint parts are added by the AI hint feature.

# Part 0 — Backend split (feature 005, 2026-09-28, code at `545b62c`)

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
| C2 server config | `1 failed | 8 passed (9); 69 passed (69)` | `9 passed (9); 83 passed (83)` |
| C3 routes, Host allowlist, static files | `1 failed | 10 passed (11); 86 passed (86)` | `11 passed (11); 112 passed (112)` |
| C4 same-origin browser tests | `2 failed; 16 passed` | `18 passed` |

## Checks on `545b62c`

| Command | Result |
|---|---|
| `npm run typecheck` (browser and server projects) | exit 0 |
| `npm run test:run` | `11 passed (11); 112 passed (112)` |
| `npm run build` | exit 0 |
| `npm audit --audit-level=high` | Exit 0; found 0 vulnerabilities |
| `npm run test:e2e` | `18 passed` |

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

tests all passed, you can continue

## Known limitations

- `scripts/dev.mjs` (the combined `npm run dev`) has no automated test; it was checked manually above.
- No `Content-Security-Policy` header is sent yet.
- The loopback bind and the `Host` allowlist protect a developer machine only; deployment is out of scope.
- The server has no AI route yet. The provider key, the `get_game_state` tool, and `HintResponse` validation belong to the AI hint feature.

## Contribution

Nakon promena aplikacija je ponovo pokrenuta i proveren je gameplan. Funkcionalnosti su ostale iste kao sto je i planiran, svi testovi su prosli i nastavak rada je bezbedan.

AI use: Claude Code (Opus 5.5) wrote the plan; OpenAI Codex (Luna 6) implemented it; details in `docs/AI_USAGE_LOG.md` → *Backend split (feature 005)*.
