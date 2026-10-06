# Quickstart: Feature 007 Hint

## Automated local path

Use Node 24+ and npm 11+ as required by the repository.

1. Run `npm ci` if dependencies are not installed.
2. Run the new unit and server expectations with the targeted Vitest paths in `tasks.md`.
3. Run the browser suite with the E2E command recorded in `package.json`; tests intercept `/api/hint` and use fake responses.
4. Run the complete project checks in `docs/EVIDENCE_W05.md` after implementation.

Automated paths do not read `GEMINI_API_KEY` and do not make an external provider request.

## Manual browser flow

1. Start the application with `npm run dev` and use one of the existing difficulty presets.
2. During an active game, select **Hint**. Confirm “Loading hint…” and the spinner appear and keyboard/difficulty actions do not advance the game.
3. With a configured server key, a successful request can return the solver-verified numbered route. The route's explanation is supplementary; the numbered solver trace is the route evidence.
4. Select **Hide hint** to resume. Select **Show hint** to show the same cached result without another request.
5. Restart or switch difficulty while the Hint is hidden to clear its cache for the next run.

No provider key, request payload, or live response is part of this quickstart. A live provider demonstration needs separate explicit authorization.
