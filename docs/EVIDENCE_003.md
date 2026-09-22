# Evidence — Session 003

## Initial claim

The approved minimal stack is Vite with vanilla TypeScript, Canvas 2D, Vitest, npm, and explicit runtime validation without a validation library. No gameplay code existed before this starter setup.

## F0 — starter status

Environment observed on 2026-09-22:

- Node.js: `v24.14.0`
- npm: `11.12.1`
- Vitest installed by the lockfile: `5.0.1`

Initial commands and actual results:

| Command | Exit | Actual result |
|---|---:|---|
| `npm run test:run` | 0 | One starter test file and one test passed |
| `npm run typecheck` | 1 | TypeScript TS2882: missing declarations for the side-effect import `./style.css` |
| `npm run build` | 1 | Stopped at the same TS2882 error before Vite build |
| `npm audit --audit-level=high` | 1 | Audit endpoint/cache access failed in the sandbox; no vulnerability result was claimed |

The first visible problem is a starter TypeScript configuration omission: Vite client declarations were not loaded. The allowed correction is limited to adding the Vite client type declaration to `tsconfig.json`, after which the same commands must be repeated. Gameplay implementation remains paused until the repeated F0 checks are green.

### F0 repeated after the minimal correction

| Command | Exit | Actual result |
|---|---:|---|
| `npm run typecheck` | 0 | TypeScript completed without diagnostics |
| `npm run test:run` | 0 | One starter test file and one test passed |
| `npm run build` | 0 | Vite 8.3.0 built five modules successfully |
| `npm audit --audit-level=high` | 0 | Zero vulnerabilities reported |

F0 is green. The project may proceed to constitution and specification work.
