import { describe, expect, it, vi } from 'vitest'
import { createHintController } from '../../src/hints/controller'
import type { HintResponse, HintSnapshot } from '../../shared/hint-agent-contract'
import { nearGoalHintResponse, nearGoalSnapshot } from './fixtures'

describe('Hint controller', () => {
  it('discards a valid response as stale if the live game snapshot changed while it was pending', async () => {
    let currentSnapshot: HintSnapshot | null = nearGoalSnapshot
    let finishRequest: ((response: HintResponse) => void) | undefined
    const sendRequest = vi.fn(() => new Promise<HintResponse>((resolve) => { finishRequest = resolve }))
    const controller = createHintController(vi.fn(), () => currentSnapshot, sendRequest)

    controller.activate(nearGoalSnapshot)
    expect(controller.getState().mode).toBe('loading')
    currentSnapshot = { ...nearGoalSnapshot, tick: 1 }
    finishRequest?.(nearGoalHintResponse())
    await Promise.resolve()

    expect(controller.getState()).toMatchObject({ mode: 'visible', notice: { kind: 'stale' } })
  })

  it('aborts and ignores a pending response after the game is reset', async () => {
    let finishRequest: ((response: HintResponse) => void) | undefined
    let signal: AbortSignal | undefined
    const sendRequest = vi.fn((_snapshot, requestSignal) => {
      signal = requestSignal
      return new Promise<HintResponse>((resolve) => { finishRequest = resolve })
    })
    const controller = createHintController(vi.fn(), () => nearGoalSnapshot, sendRequest)

    controller.activate(nearGoalSnapshot)
    controller.reset('difficulty')
    finishRequest?.(nearGoalHintResponse())
    await Promise.resolve()

    expect(signal?.aborted).toBe(true)
    expect(controller.getState()).toMatchObject({ mode: 'ready', usedLives: [], notice: null })
  })

  it('clears a hidden result after a life is lost and permits one new request for that life', async () => {
    let currentSnapshot: HintSnapshot = nearGoalSnapshot
    const sendRequest = vi.fn(async () => nearGoalHintResponse())
    const controller = createHintController(vi.fn(), () => currentSnapshot, sendRequest)

    controller.activate(currentSnapshot)
    await Promise.resolve()
    expect(controller.getState().mode).toBe('visible')
    controller.activate(currentSnapshot)
    expect(controller.getState().mode).toBe('hidden')

    currentSnapshot = { ...nearGoalSnapshot, lives: 2, tick: 4 }
    controller.lifeChanged(currentSnapshot.lives)
    expect(controller.getState()).toMatchObject({ mode: 'ready', snapshot: null, notice: null, usedLives: [3] })

    controller.activate(currentSnapshot)
    expect(sendRequest).toHaveBeenCalledTimes(2)
    expect(controller.getState().mode).toBe('loading')
  })

  it('aborts a pending result if the life changes and ignores its late response', async () => {
    let currentSnapshot: HintSnapshot = nearGoalSnapshot
    let finishRequest: ((response: HintResponse) => void) | undefined
    let signal: AbortSignal | undefined
    const sendRequest = vi.fn((_snapshot, requestSignal) => {
      signal = requestSignal
      return new Promise<HintResponse>((resolve) => { finishRequest = resolve })
    })
    const controller = createHintController(vi.fn(), () => currentSnapshot, sendRequest)

    controller.activate(currentSnapshot)
    currentSnapshot = { ...nearGoalSnapshot, lives: 2, tick: 4 }
    controller.lifeChanged(currentSnapshot.lives)
    finishRequest?.(nearGoalHintResponse())
    await Promise.resolve()

    expect(signal?.aborted).toBe(true)
    expect(controller.getState()).toMatchObject({
      mode: 'ready',
      usedLives: [nearGoalSnapshot.lives],
      snapshot: null,
      notice: null,
    })
  })
})
