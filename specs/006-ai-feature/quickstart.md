# Quickstart: 006-ai-feature

**State**: Implemented local workflow. The user authorized implementation on 2026-09-29; automated checks are recorded in docs/EVIDENCE_006.md. A live provider request was not made.

## Local setup

1. Install the repository's locked dependencies with npm ci.
2. Copy .env.example to .env.
3. Set GEMINI_API_KEY locally in .env. Node server startup loads this file if present using server-only process.loadEnvFile. Do not paste the key into source, browser tools, logs, screenshots, or evidence.
4. Start the combined local frontend and API with npm run dev.
5. Confirm GET /api/health returns the existing health response.
6. Open the Vite URL printed by the development server.

## Planned automated checks

After implementation, run npm run typecheck, npm run test:run, npm run build, npm audit --audit-level=high, and npm run test:e2e. The existing project also requires npm ci and a one-time npx playwright install chromium where needed. Record actual output only; this document records no check as passed.

Automated tests must inject fake providers and must not require GEMINI_API_KEY or make a live request.

## Expected browser flow

Use a deterministic one-crossing run on easy difficulty. The first result screen has no advice. A valid fake API response becomes ready but stays hidden while the next run is active, including after a manual restart or difficulty change. The previous-run advice appears once at the following completed-run screen. Reload clears in-memory advice.

For a pending previous request, completing the next run immediately displays “AI advice is currently unavailable.” The previous request is invalidated; a late response cannot alter the screen. Analysis starts for the newly completed run.

## Required limited provider confirmation for W04 submission

After fake-provider tests pass, W04 requires a limited live confirmation. Make it only after the user explicitly authorizes the external request; use one deliberate test-run summary. Record the model identifier, attempt count, and token usage if available, but do not retain the key, complete prompt, raw response, or personal data. No live provider call has been performed.
