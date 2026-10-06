import { describe, expect, it } from 'vitest'
import {
  activateHint,
  advanceHintLife,
  createHintLifecycleState,
  resetHintForNewGame,
  settleHint,
} from '../../src/hints/lifecycle'
import { nearGoalHintResponse, nearGoalSnapshot } from './fixtures'

describe('per-life Hint lifecycle', () => {
  it('pauses while loading, shows the settled result, hides, and re-shows the cached result', () => {
    const started = activateHint(createHintLifecycleState(), nearGoalSnapshot)
    expect(started.state.mode).toBe('loading')
    expect(started.request).toEqual({ generation: 1, snapshot: nearGoalSnapshot })

    const visible = settleHint(started.state, 1, { kind: 'ready', response: nearGoalHintResponse() })
    expect(visible.mode).toBe('visible')
    expect(visible.notice).toEqual({ kind: 'ready', response: nearGoalHintResponse() })

    const hidden = activateHint(visible, nearGoalSnapshot)
    expect(hidden.state.mode).toBe('hidden')
    expect(hidden.request).toBeNull()

    const shown = activateHint(hidden.state, { ...nearGoalSnapshot, tick: 9 })
    expect(shown.state.mode).toBe('visible')
    expect(shown.state.notice).toEqual(visible.notice)
    expect(shown.state.snapshot).toEqual(nearGoalSnapshot)
    expect(shown.request).toBeNull()
  })

  it('allows one request for each life, including failures, but reuses the result within that life', () => {
    let lifecycle = createHintLifecycleState()

    for (const lives of [3, 2, 1]) {
      const snapshot = { ...nearGoalSnapshot, lives }
      const started = activateHint(lifecycle, snapshot)
      expect(started.request?.snapshot.lives).toBe(lives)
      expect(started.state.mode).toBe('loading')

      const duplicate = activateHint(started.state, snapshot)
      expect(duplicate.state).toBe(started.state)
      expect(duplicate.request).toBeNull()

      const failed = settleHint(started.state, started.request!.generation, { kind: 'unavailable' })
      expect(failed.mode).toBe('visible')
      expect(failed.usedLives).toContain(lives)
      const hidden = activateHint(failed, snapshot)
      const shown = activateHint(hidden.state, snapshot)
      expect(shown.state.notice).toEqual({ kind: 'unavailable' })
      expect(shown.request).toBeNull()

      if (lives > 1) {
        lifecycle = advanceHintLife(activateHint(shown.state, snapshot).state, lives - 1)
        expect(lifecycle.mode).toBe('ready')
        expect(lifecycle.notice).toBeNull()
        expect(lifecycle.snapshot).toBeNull()
        expect(lifecycle.usedLives).toContain(lives)
      } else {
        lifecycle = shown.state
      }
    }

    const exhausted = activateHint(lifecycle, { ...nearGoalSnapshot, lives: 1 })
    expect(exhausted.request).toBeNull()
    expect(exhausted.state.notice).toEqual({ kind: 'unavailable' })
  })

  it('clears a cached result whenever the life count changes, even if it is still visible', () => {
    const started = activateHint(createHintLifecycleState(), nearGoalSnapshot)
    const visible = settleHint(started.state, started.request!.generation, {
      kind: 'ready',
      response: nearGoalHintResponse(),
    })

    const nextLife = advanceHintLife(visible, nearGoalSnapshot.lives - 1)

    expect(nextLife).toMatchObject({
      mode: 'ready',
      snapshot: null,
      notice: null,
      usedLives: [nearGoalSnapshot.lives],
    })
  })

  it('leaves a pending request unchanged on another activation', () => {
    const started = activateHint(createHintLifecycleState(), nearGoalSnapshot)
    const duplicate = activateHint(started.state, nearGoalSnapshot)

    expect(duplicate.state).toBe(started.state)
    expect(duplicate.request).toBeNull()
  })

  it.each(['restart', 'difficulty'] as const)('clears the cache and invalidates an old request after %s', (reason) => {
    const pending = activateHint(createHintLifecycleState(), nearGoalSnapshot)
    const reset = resetHintForNewGame(pending.state, reason)

    expect(reset.mode).toBe('ready')
    expect(reset.notice).toBeNull()
    expect(reset.snapshot).toBeNull()
    expect(reset.usedLives).toEqual([])
    expect(settleHint(reset, pending.request!.generation, { kind: 'ready', response: nearGoalHintResponse() })).toBe(reset)

    const nextGame = activateHint(reset, { ...nearGoalSnapshot, difficulty: 'hard' })
    expect(nextGame.request?.generation).toBeGreaterThan(pending.request!.generation)
  })

  it('ignores a late settlement from a superseded generation', () => {
    const pending = activateHint(createHintLifecycleState(), nearGoalSnapshot)
    const reset = resetHintForNewGame(pending.state, 'restart')
    const next = activateHint(reset, { ...nearGoalSnapshot, tick: 1 })

    expect(settleHint(next.state, pending.request!.generation, { kind: 'unavailable' })).toBe(next.state)
    expect(next.state.mode).toBe('loading')
  })

  it('keeps a stale outcome visible and dismissible', () => {
    const pending = activateHint(createHintLifecycleState(), nearGoalSnapshot)
    const stale = settleHint(pending.state, pending.request!.generation, { kind: 'stale' })

    expect(stale.mode).toBe('visible')
    expect(stale.notice).toEqual({ kind: 'stale' })
    expect(activateHint(stale, nearGoalSnapshot).state.mode).toBe('hidden')
  })
})
