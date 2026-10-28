# API and player interaction contract

## Local API

Add POST /api/levels/generate with the exact three-field request in ../data-model.md.
Use the existing local server, Host allowlist, loopback binding, fixed security headers,
no CORS and no-store responses. Maximum request body is 2,048 UTF-8 bytes; enforce streamed
bytes as well as declared Content-Length and reject invalid UTF-8/JSON before service work.

| Condition | HTTP behavior |
|---|---|
| Invalid JSON/schema/settings | 400 INVALID_GENERATION_REQUEST; zero attempts/tools |
| Busy: another generator run active | 409 GENERATION_BUSY; no queue or provider call |
| Too large | 413 REQUEST_TOO_LARGE |
| Wrong media type | 415 UNSUPPORTED_MEDIA_TYPE |
| Wrong method | 405 METHOD_NOT_ALLOWED with Allow POST |
| Accepted run reaches terminal state | 200 validated preview/unavailable DTO |
| Unexpected handler failure | 500 fixed INTERNAL_ERROR body |

Create no public execute-tool endpoint. Inject the generation service into the handler;
keep model work out of routing. The server releases its one-run guard in every completion,
abort and exception path. Advice requests remain independent and responsive. Abort accepted
work on disconnect; do not attempt to write to a destroyed response. The maximum response
DTO is 16,384 UTF-8 bytes; do not include proof witnesses or raw trace internals.

## Accessible controls

Place a small HTML panel below the board, preserving existing visual style and preset HUD.
Label a 1..5 target selector with default three, Generate level button, Cancel button while
running, and a polite status region. State that the level uses five lanes and the current
lives/crossing target. Use labelled controls, visible focus and no required motion.

Preview shows a compact noninteractive snapshot of candidate traffic at tick zero, using
the existing renderer with its drawing helpers if needed; do not duplicate traffic math.
Also show requested/measured rating, minimum safe first crossing, minimum full win, safe
verification/fallback wording, and Play this level. Do not reveal the winning path.
Use literal text for any untrusted string. A preview never becomes the active board by itself.

## Browser lifecycle

Lifecycle states: idle, running, ready, unavailable. Store monotonically increasing request
identity and immutable captured settings. New generation aborts/supersedes old work and
replaces the preview, not the active game. Allow one client request at a time; Generate can
be disabled while running and Cancel returns to idle with no preview. Ignore late settlements
even if a provider/transport ignores AbortSignal.

Ordinary gameplay moves continue during generation. R, selecting a preset and Play this
level invalidate pending generation and any preview. Captured request settings must still
match the intended session before Play; an invalid/stale DTO cannot enable that action.
Ignore global gameplay keyboard mapping when the event target is a generator input,
select, button or other editable control. Preserve ordinary keyboard gameplay on the board.

Play uses a validated immutable preview, replaces active lanes with exactly those returned,
uses its captured lives/crossing target, and calls normal fresh-state creation. It clears
the consumed preview, resets visible advice with the existing new-run semantics and returns
focus to the game. Generated mode is visibly labelled; all three preset buttons are unpressed.

R retains the active generated traffic/settings and restarts tick zero. A preset selection
restores original traffic even if the remembered GameConfig.difficulty equals that button.
Keep ordinary preset no-op behavior when that preset is already active. Preset selection
continues its existing URL update/default recovery behavior. Generated play does not encode
lanes in the URL, storage or query configuration; reload returns to the ordinary preset.

Completed generated games submit difficulty generated through the existing eight-field
advice summary. Hidden ready/pending prior advice remains hidden until the next completed
run; starting generated play clears displayed advice and preserves that established delay.
Do not send any lane, solver or action-history fields to the coaching endpoint.
