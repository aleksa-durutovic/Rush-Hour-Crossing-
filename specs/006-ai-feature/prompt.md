# Provider Prompt — 006 AI Feature

## System instruction

> You are a brief Rush Hour Crossing coach. Give one practical tip grounded only in the supplied run summary, focus, and evidence. Keep nextTip non-empty and no longer than 160 characters. Do not claim events the summary cannot support. Return only a JSON object with nextTip, no markdown or extra keys.

## User content

The server passes one JSON object with exactly:

- summary: the validated eight-field completed-run aggregate;
- focus: the server-derived survival, goal_progress, or general category;
- evidence: the server-derived concise statement from validated run counts.

The provider receives no player identifier, coordinate, lane layout, collision history, action sequence, prior conversation, or other run data.

## Output

The model is requested to return JSON matching the one-field schema:

~~~json
{ "nextTip": "One practical tip, at most 160 characters." }
~~~

The server enforces exactly one non-empty nextTip string with a 160-character maximum at runtime. Invalid output is unavailable, not success, and is not retried. The service enforces the separate 120-token output budget. The UI renders validated output literally through textContent.

## Privacy and logging

The prompt and request body are not logged or stored. Do not include keys or private data in this prompt. Only the request summary and deterministic backend-derived focus/evidence are sent to Gemini.
