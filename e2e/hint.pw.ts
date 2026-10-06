/// <reference types="node" />

import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { createRequestHandler } from '../server/app'
import { allowedHostsFor } from '../server/config'
import { findSafePath } from '../server/agent/tools/find-safe-path'
import { createHintService, type HintProvider } from '../server/agent/hint-service'
import { isHintResponse, isHintSnapshot, type HintResponse, type HintSnapshot } from '../shared/hint-agent-contract'
import { DIFFICULTY_PRESETS } from '../src/config/presets'
import { applyAction } from '../src/game/turn'
import { createInitialState, type GameState, type PlayerAction } from '../src/game/state'

const initialSnapshot: HintSnapshot = {
  status: 'active',
  difficulty: 'easy',
  tick: 0,
  x: 4,
  y: 6,
  lives: 3,
  crossings: 0,
  crossingsToWin: 1,
}

const literalExplanation = '<img src=x onerror=alert(1)>'

test.describe('bounded safe-path Hint', () => {
  test('calls the local Hint API and captures its solver-verified response', async ({ page }) => {
    const origin = { ...initialSnapshot, tick: 4, x: 0, crossingsToWin: 3 }
    let providerSteps = 0
    const provider: HintProvider = {
      async proposePath() {
        providerSteps += 1
        return { calls: [{ name: 'find_safe_path', args: {} }], continuation: { testFixture: true } }
      },
      async explainVerifiedPath() {
        providerSteps += 1
        return { explanation: 'The server verified a safe route to the crossing.' }
      },
    }
    const hintService = createHintService(provider)
    const server = createServer()
    await new Promise<void>((resolveListen) => server.listen(0, '127.0.0.1', resolveListen))
    const port = (server.address() as AddressInfo).port
    server.on('request', createRequestHandler({
      allowedHosts: allowedHostsFor(port),
      staticDir: resolve('dist'),
      hintService,
    }))

    try {
      await page.goto(`http://127.0.0.1:${port}/?crossingsToWin=3&difficulty=easy`)
      for (let move = 0; move < 4; move += 1) await page.keyboard.press('ArrowLeft')
      await expect(page.locator('#game-canvas')).toHaveAttribute('aria-label', /tick 4/)
      const apiResponsePromise = page.waitForResponse((response) =>
        response.url() === `http://127.0.0.1:${port}/api/hint` && response.request().method() === 'POST',
      )
      await page.getByRole('button', { name: 'Hint' }).click()
      const apiResponse = await apiResponsePromise
      expect(apiResponse.status()).toBe(200)

      const payload: unknown = await apiResponse.json()
      expect(isHintResponse(payload, origin)).toBe(true)
      if (!isHintResponse(payload, origin)) throw new Error('The API did not return a valid verified Hint response.')
      expect(payload.explanation).toBe('The server verified a safe route to the crossing.')
      expect(payload.steps.at(-1)).toMatchObject({ entered: { y: 0 }, status: 'active', crossings: 1, lives: 3 })
      expect(payload.steps.at(-1)?.entered.x).not.toBe(4)
      expect(providerSteps).toBe(2)

      await expect(page.getByRole('status', { name: 'Hint status' })).toContainText(
        'Verified safe path to the next crossing. The server verified a safe route to the crossing.',
      )
      await expect(page.getByRole('list', { name: 'Verified route steps' })).toContainText('up')
      await page.screenshot({ path: 'docs/evidence/w05-hint-api-verified.png', fullPage: true })
    } finally {
      await new Promise<void>((resolveClose, reject) => server.close((error) => error ? reject(error) : resolveClose()))
    }
  })

  test('pauses, draws and describes the verified route, then reuses the cached result', async ({ page }) => {
    let requests = 0
    await page.route('**/api/hint', async (route) => {
      requests += 1
      const snapshot = route.request().postDataJSON()
      expect(isHintSnapshot(snapshot)).toBe(true)
      if (!isHintSnapshot(snapshot)) throw new Error('The browser sent an invalid test snapshot.')
      expect(snapshot).toMatchObject({
        status: 'active',
        difficulty: requests === 1 ? 'easy' : 'hard',
        tick: 0,
        x: 4,
        y: 6,
        lives: 3,
        crossings: 0,
        crossingsToWin: 1,
      })
      const solved = findSafePath(snapshot)
      expect(solved.outcome).toBe('verified')
      if (solved.outcome !== 'verified') throw new Error('The test snapshot must have a safe solver route.')
      const response: HintResponse = {
        outcome: 'verified',
        origin: snapshot,
        explanation: literalExplanation,
        steps: solved.steps,
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response),
      })
    })

    await page.goto('/?crossingsToWin=1&difficulty=easy')
    const hint = page.getByRole('button', { name: 'Hint' })
    await hint.click()
    await expect(page.getByRole('status', { name: 'Hint status' })).toContainText('Verified safe path to the next crossing')
    await expect(page.getByRole('status', { name: 'Hint status' })).toContainText('<img src=x onerror=alert(1)>')
    await expect(page.getByRole('status', { name: 'Hint status' }).locator('img')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Hide hint' })).toBeVisible()
    await expect(page.getByRole('list', { name: 'Verified route steps' })).toContainText('up')

    await page.keyboard.press('ArrowLeft')
    await page.keyboard.press('Space')
    await page.keyboard.press('r')
    await expect(page.getByRole('button', { name: 'HARD' })).toBeDisabled()
    await expect(page.locator('#game-canvas')).toHaveAttribute('aria-label', /tick 0/)
    await expect(page.locator('#game-canvas')).toHaveAttribute('aria-label', /Verified route overlay from tick 0/)
    await expect.poll(() => requests).toBe(1)

    await page.getByRole('button', { name: 'Hide hint' }).click()
    await expect(page.locator('#game-canvas')).toBeFocused()
    await expect(page.getByRole('button', { name: 'Hint' })).toBeVisible()
    await page.keyboard.press('ArrowLeft')
    await expect(page.locator('#game-canvas')).toHaveAttribute('aria-label', /tick 1/)

    await page.getByRole('button', { name: 'Hint' }).click()
    await expect(page.getByRole('status', { name: 'Hint status' })).toContainText('original tick 0')
    await expect(page.getByRole('list', { name: 'Verified route steps' })).toHaveCount(1)
    await expect.poll(() => requests).toBe(1)

    await page.getByRole('button', { name: 'Hide hint' }).click()
    await page.getByRole('button', { name: 'HARD' }).click()
    await expect(page.locator('#game-canvas')).toHaveAttribute('aria-label', /tick 0/)
    await expect(page.getByRole('button', { name: 'Hint' })).toBeVisible()
    await expect(page.getByRole('list', { name: 'Verified route steps' })).toBeHidden()
    await page.getByRole('button', { name: 'Hint' }).click()
    await expect.poll(() => requests).toBe(2)
    await expect(page.getByRole('button', { name: 'Hide hint' })).toBeVisible()
    await page.getByRole('button', { name: 'Hide hint' }).click()
    await page.keyboard.press('r')
    await page.getByRole('button', { name: 'Hint' }).click()
    await expect.poll(() => requests).toBe(3)
  })

  test('blocks gameplay during loading and shows an accessible static reduced-motion indicator', async ({ page }) => {
    let release: (() => void) | undefined
    const gate = new Promise<void>((resolve) => { release = resolve })
    await page.route('**/api/hint', async (route) => {
      await gate
      const snapshot = route.request().postDataJSON()
      if (!isHintSnapshot(snapshot)) throw new Error('The browser sent an invalid test snapshot.')
      const solved = findSafePath(snapshot)
      if (solved.outcome !== 'verified') throw new Error('The test snapshot must have a safe solver route.')
      const response: HintResponse = {
        outcome: 'verified',
        origin: snapshot,
        explanation: 'The solver returned a safe route.',
        steps: solved.steps,
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(response) })
    })

    await page.goto('/?crossingsToWin=1&difficulty=easy')
    await page.getByRole('button', { name: 'Hint' }).click()
    await expect(page.getByRole('status', { name: 'Hint status' })).toHaveText('Loading hint…')
    await expect(page.locator('.hint-spinner')).toBeVisible()
    await expect(page.locator('.hint-spinner')).toHaveCSS('animation-name', 'none')
    await page.keyboard.press('ArrowLeft')
    await page.keyboard.press('Space')
    await page.keyboard.press('r')
    await expect(page.locator('#game-canvas')).toHaveAttribute('aria-label', /tick 0/)
    release?.()
    await expect(page.getByRole('button', { name: 'Hide hint' })).toBeVisible()
  })

  test('allows one Hint request at each remaining life count', async ({ page }) => {
    const snapshots: HintSnapshot[] = []
    await page.route('**/api/hint', async (route) => {
      const origin = route.request().postDataJSON()
      expect(isHintSnapshot(origin)).toBe(true)
      if (!isHintSnapshot(origin)) throw new Error('The browser sent an invalid test snapshot.')
      snapshots.push(origin)
      const solved = findSafePath(origin)
      expect(solved.outcome).toBe('verified')
      if (solved.outcome !== 'verified') throw new Error('The test snapshot must have a safe solver route.')
      const response: HintResponse = {
        outcome: 'verified',
        origin,
        explanation: `Verified for ${origin.lives} remaining lives.`,
        steps: solved.steps,
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response),
      })
    })

    await page.goto('/?lives=3&crossingsToWin=10&difficulty=easy')
    let simulated = createInitialState({ lives: 3, crossingsToWin: 10, difficulty: 'easy' })

    for (const lives of [3, 2, 1]) {
      await page.getByRole('button', { name: 'Hint' }).click()
      await expect(page.getByRole('status', { name: 'Hint status' })).toContainText('Verified safe path to the next crossing')
      await expect(page.getByRole('list', { name: 'Verified route steps' })).toBeVisible()
      expect(snapshots.at(-1)?.lives).toBe(lives)
      expect(snapshots.at(-1)?.tick).toBe(simulated.tick)
      await page.getByRole('button', { name: 'Hide hint' }).click()

      if (lives > 1) {
        const collisionPath = findCollisionPath(simulated)
        for (const action of collisionPath) {
          await page.keyboard.press(keyForAction(action))
          simulated = applyAction(simulated, action, DIFFICULTY_PRESETS.easy)
        }
        expect(simulated.lives).toBe(lives - 1)
        await expect(page.locator('#game-canvas')).toHaveAttribute('aria-label', new RegExp(`${lives - 1} lives`))
        await expect(page.getByRole('status', { name: 'Hint status' })).toHaveText('')
        await expect(page.getByRole('list', { name: 'Verified route steps' })).toBeHidden()
        await expect(page.locator('#game-canvas')).not.toHaveAttribute('aria-label', /Verified route overlay/)
      }
    }

    expect(snapshots.map((snapshot) => snapshot.lives)).toEqual([3, 2, 1])
  })

  test('shows fixed, distinct messages for no route, search limit, and unavailable outcomes', async ({ page }) => {
    const outcomes = [
      { outcome: 'no_safe_path', origin: initialSnapshot, explanation: '', steps: [] },
      { outcome: 'search_limit', origin: initialSnapshot, explanation: '', steps: [] },
    ]
    const messages: string[] = []
    for (const result of outcomes) {
      await page.route('**/api/hint', (route) => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(result),
      }))
      await page.goto('/?crossingsToWin=1&difficulty=easy')
      await page.getByRole('button', { name: 'Hint' }).click()
      const status = page.getByRole('status', { name: 'Hint status' })
      await expect(status).toContainText(result.outcome === 'no_safe_path' ? 'Exhaustive search found' : 'Search limit reached')
      messages.push(await status.innerText())
      await page.unroute('**/api/hint')
    }
    expect(messages[0]).toContain('Exhaustive search found no safe path')
    expect(messages[1]).toContain('Search limit reached')
    expect(messages[0]).not.toBe(messages[1])

    await page.route('**/api/hint', (route) => route.fulfill({ status: 503, body: JSON.stringify({ error: 'HINT_UNAVAILABLE' }) }))
    await page.goto('/?crossingsToWin=1&difficulty=easy')
    await page.getByRole('button', { name: 'Hint' }).click()
    await expect(page.getByRole('status', { name: 'Hint status' })).toContainText('unavailable')
  })
})

function findCollisionPath(initialState: GameState): PlayerAction[] {
  const lanes = DIFFICULTY_PRESETS.easy
  const cycle = lanes.reduce((result, lane) => leastCommonMultiple(result, 9 * lane.moveEveryTicks), 1)
  const queue: { state: GameState; actions: PlayerAction[] }[] = [{ state: initialState, actions: [] }]
  const visited = new Set([collisionSearchKey(initialState, cycle)])
  const actionOrder: PlayerAction[] = ['up', 'down', 'left', 'right', 'wait']

  for (let cursor = 0; cursor < queue.length && cursor < 30_000; cursor += 1) {
    const current = queue[cursor]
    if (!current) continue
    for (const action of actionOrder) {
      const nextState = applyAction(current.state, action, lanes)
      const actions = [...current.actions, action]
      if (nextState.lives < initialState.lives) return actions
      if (nextState.status !== 'active') continue
      const key = collisionSearchKey(nextState, cycle)
      if (visited.has(key)) continue
      visited.add(key)
      queue.push({ state: nextState, actions })
    }
  }

  throw new Error('Could not find a deterministic collision path for the per-life Hint scenario.')
}

function collisionSearchKey(state: GameState, cycle: number): string {
  return `${state.player.x}:${state.player.y}:${state.tick % cycle}:${state.crossings}`
}

function leastCommonMultiple(left: number, right: number): number {
  return (left / greatestCommonDivisor(left, right)) * right
}

function greatestCommonDivisor(left: number, right: number): number {
  let a = left
  let b = right
  while (b !== 0) {
    const remainder = a % b
    a = b
    b = remainder
  }
  return a
}

function keyForAction(action: PlayerAction): string {
  return { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', wait: 'Space' }[action]
}
