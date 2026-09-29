# AI and lifecycle evaluation expectations — 006-ai-feature

Expectations were fixed before implementation and the 2026-09-29 pre-implementation run captured the expected red state. All listed automated cases now pass in the recorded full Vitest/E2E runs. No live provider request is part of routine tests.

| ID | Test surface | Input or action | Expected result | Status |
|---|---|---|---|---|
| A1 | summary unit | null or active GameState | no completed summary | Pass |
| A2 | summary unit | valid win state | exact eight fields; no unrelated state | Pass |
| A3 | summary unit | valid loss with zero crossings | outcome lost, crossings zero, score zero | Pass |
| A4 | focus unit | loss, zero crossings | focus survival; evidence reports lives lost before crossing | Pass |
| A5 | focus unit | loss with partial progress | focus goal_progress; evidence reports crossings/target | Pass |
| A6 | focus unit | completed win | focus general; evidence describes completed goal | Pass |
| A7 | lifecycle unit | first game ends | no previous advice displayed; one analysis job created | Pass |
| A8 | lifecycle unit | first response ready during next run | notice remains hidden | Pass |
| A9 | lifecycle unit | next run completes with ready advice | previous advice appears exactly once | Pass |
| A10 | lifecycle unit | restart during run with hidden ready advice | advice remains hidden and available for next completed run | Pass |
| A11 | lifecycle unit | difficulty switch during run with hidden ready advice | advice remains hidden and available for next completed run | Pass |
| A12 | lifecycle unit | restart or difficulty switch after display | visible notice clears | Pass |
| A13 | lifecycle unit | prior job still pending at next run end | safe unavailable notice appears immediately; new job starts | Pass |
| A14 | lifecycle unit | stale old job settles after supersession | no state change and no stale text | Pass |
| A15 | API integration | valid exact summary | 200 fixed DTO; service called once | Pass |
| A16 | API integration | each malformed/invalid/cross-field request | stable 4xx; provider call count remains zero | Pass |
| A17 | API integration | wrong media type, wrong method, oversized body | 415, 405, and 413 respectively; service not called | Pass |
| A18 | service unit | first transient error then valid tip | exactly two attempts and success | Pass |
| A19 | service unit | repeated transient errors | no more than two attempts; safe unavailable result | Pass |
| A20 | service unit | malformed provider DTO or permanent error | one attempt, no retry, safe failure | Pass |
| A21 | service unit | one provider attempt reaches deadline | abort at 15 seconds; at most one retry if still current | Pass |
| A22 | boundary test | search src and server imports/environment use | no SDK or environment access from src; SDK import only in adapter | Pass |
| A23 | browser | ready response after first run then another run | no advice after first run or during second; prior tip after second end | Pass |
| A24 | browser | ready response, restart and difficulty change mid-run | ready advice remains hidden until next completed run | Pass |
| A25 | browser | pending previous request when next run ends | unavailable text shown immediately; late response cannot overwrite | Pass |
| A26 | browser/accessibility | advice includes markup-looking literal text | status region exposes text literally, without creating elements | Pass |
| A27 | regression | existing golden win/loss paths | same status, tick, lives, crossings, and score | Pass |
| A28 | browser | reload after an analysis becomes ready but before display | volatile summary/advice state clears; the next post-reload run is treated as the first | Pass |
| A29 | lifecycle/browser | three runs with timely valid responses | run-one advice appears after run two, and run-two advice appears after run three, each once | Pass |
| A30 | server environment | temporary dummy .env and missing-file case | local values load only in server code; missing .env does not prevent startup; key is never printed | Pass |
