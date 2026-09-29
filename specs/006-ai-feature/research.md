# Research: 006-ai-feature

**Checked**: 2026-09-29

**Purpose**: Record current choices. Provider SDK configuration was rechecked on 2026-09-29 before adding the dependency; live account access and provider behavior remain unverified.

## Backend and repository fit

Feature 005 already provides a local Node.js API server using node:http, a Vite same-origin proxy in development, a built-game server for npm start, a Host allowlist, and boundary tests. A single POST route fits without adding another service or CORS. Server code is type-checked separately through tsconfig.server.json. The server is the only layer allowed to read process.env.

Node 24 is the project minimum. Node's environment-variable documentation includes process.loadEnvFile for local .env loading. The server should call it only when a local .env file exists and should never print loaded values. The committed .env.example currently contains only an empty GEMINI_API_KEY field, and .gitignore excludes .env and other .env.* files except .env.example. Never inspect or record the local .env value.

## Provider choice

Use Google’s official JavaScript/TypeScript SDK package @google/genai, installed at version 2.24.0 on 2026-09-29, behind an interface so tests use a fake. The installed SDK type definitions confirm GenerateContentConfig supports abortSignal, responseJsonSchema, and HTTP retryOptions; HTTP retry attempts can be set to 1. The SDK must be imported only by server/advice/gemini-provider.ts. The service sends a compact summary and server-derived category/evidence, requests one structured nextTip field, uses no tools or conversation history, and limits generated output to about 120 tokens.

Candidate model: gemini-3.1-flash-lite. Google's model page lists it as stable and supports structured output. Standard paid pricing shown on 2026-09-29 is $0.25 per million input text tokens and $1.50 per million output tokens. The Gemini 3.5 Flash-Lite page shows $0.30 input and $2.50 output per million tokens. Gemini 2.5 Flash-Lite is cheaper on the pricing page, but access is limited to users with active prior use; Google recommends newer options for new projects. Model access for this student account was not checked. These are dated provider facts, not a guarantee of account access, cost, or quality.

## Reliability decisions

- Per-attempt deadline: 15,000 ms.
- Maximum total attempts: 2.
- Retry only a typed transient network/provider/rate-limit/server error or a timeout. Use at most one short bounded backoff, no longer than 250 ms.
- Do not retry invalid local requests, missing key/configuration, permanent provider errors, or malformed structured output.
- Propagate an AbortSignal for API disconnect/supersession. Lifecycle job IDs still reject a late result if abort is ignored.
- Provider and route errors map to fixed safe bodies. Logs may record event type, status class, attempt number, and duration only; never log request summaries, tip text, API key, raw provider response, or raw exception message.
- Fake providers and controlled timers are sufficient for routine verification. A real call is not part of planning or automated tests.

## Official sources

- Gemini model catalog: https://ai.google.dev/gemini-api/docs/models
- Gemini 3.1 Flash-Lite model details and stable status: https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite
- Gemini 3.5 Flash-Lite model details: https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite
- Gemini API pricing: https://ai.google.dev/gemini-api/docs/pricing
- Gemini structured output: https://ai.google.dev/gemini-api/docs/structured-output
- Official JavaScript/TypeScript SDK: https://ai.google.dev/gemini-api/docs/libraries
- Node.js environment variables and process.loadEnvFile: https://nodejs.org/download/release/v24.14.0/docs/api/environment_variables.html
