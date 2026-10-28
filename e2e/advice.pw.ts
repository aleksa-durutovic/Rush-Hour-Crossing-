import { expect, test } from '@playwright/test'
import { WINNING_PATHS } from '../tests/fixtures/golden-paths'
import { getGeneratedLevelTemplate } from '../src/config/generated-level'
import { measureTraffic } from '../src/game/level-metrics'
import { getTrafficPeriod } from '../src/game/solve-level'
import { playActions } from './support'

const readyAdvice = {
  focus: 'general',
  evidence: 'You completed 1 of 1 crossings.',
  nextTip: 'Keep choosing a safe opening before you cross.',
}
const unavailableMessage = 'AI advice is currently unavailable.'

test.describe('delayed Option C advice', () => {
  test('holds ready advice through a restart and difficulty change until the next run ends', async ({ page }) => {
    let requests = 0
    await page.route('**/api/advice', async (route) => {
      requests += 1
      if (requests === 1) {
        expect(route.request().postDataJSON()).toEqual({
          outcome: 'won',
          difficulty: 'easy',
          ticks: WINNING_PATHS.easy.finalTick,
          crossings: 1,
          targetCrossings: 1,
          startingLives: 3,
          remainingLives: WINNING_PATHS.easy.finalLives,
          score: 100,
        })
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(readyAdvice),
      })
    })

    await page.goto('/?crossingsToWin=1&difficulty=easy')
    await playActions(page, WINNING_PATHS.easy.actions)
    await expect(page.locator('#game-canvas')).toHaveAttribute('aria-label', /status won/)
    await expect.poll(() => requests).toBe(1)
    await expect(page.locator('#ai-advice')).toHaveText('')

    await page.keyboard.press('r')
    await expect(page.locator('#ai-advice')).toHaveText('')
    await page.locator('[data-difficulty="hard"]').click()
    await expect(page.locator('#ai-advice')).toHaveText('')
    await expect.poll(() => requests).toBe(1)

    const hardPath = WINNING_PATHS.hard.actions
    await playActions(page, hardPath.slice(0, 1))
    await expect(page.locator('#ai-advice')).toHaveText('')
    await playActions(page, hardPath.slice(1))
    await expect(page.locator('#ai-advice')).toContainText(readyAdvice.nextTip)
    await expect(page.locator('#ai-advice')).toHaveAttribute('role', 'status')
    await expect.poll(() => requests).toBe(2)

    await page.keyboard.press('r')
    await expect(page.locator('#ai-advice')).toHaveText('')
    await playActions(page, hardPath.slice(0, 1))
    await expect(page.locator('#ai-advice')).toHaveText('')
    await playActions(page, hardPath.slice(1))
    await expect(page.locator('#ai-advice')).toContainText(readyAdvice.nextTip)
    await expect.poll(() => requests).toBe(3)
  })

  test('clears hidden advice after a page reload', async ({ page }) => {
    let requests = 0
    await page.route('**/api/advice', async (route) => {
      requests += 1
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(readyAdvice),
      })
    })

    await page.goto('/?crossingsToWin=1&difficulty=easy')
    const response = page.waitForResponse('**/api/advice')
    await playActions(page, WINNING_PATHS.easy.actions)
    await response

    await page.reload()
    await expect(page.locator('#ai-advice')).toHaveText('')
    await playActions(page, WINNING_PATHS.easy.actions)

    await expect(page.locator('#ai-advice')).toHaveText('')
    await expect.poll(() => requests).toBe(2)
  })

  test('renders advice markup-looking text as literal text', async ({ page }) => {
    const literalTip = '<img src=x onerror=alert(1)>'
    await page.route('**/api/advice', (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ...readyAdvice, nextTip: literalTip }),
    }))

    await page.goto('/?crossingsToWin=1&difficulty=easy')
    const firstAdviceResponse = page.waitForResponse('**/api/advice')
    await playActions(page, WINNING_PATHS.easy.actions)
    await firstAdviceResponse
    await expect(page.locator('#ai-advice')).toHaveText('')
    await page.keyboard.press('r')
    await playActions(page, WINNING_PATHS.easy.actions)

    await expect(page.locator('#ai-advice')).toContainText(literalTip)
    await expect(page.locator('#ai-advice img')).toHaveCount(0)
  })

  test('shows unavailable when a pending prior result is superseded and ignores its late response', async ({ page }) => {
    let requests = 0
    let releaseFirst: (() => void) | undefined
    let finishFirst: (() => void) | undefined
    const firstGate = new Promise<void>((resolve) => { releaseFirst = resolve })
    const firstFinished = new Promise<void>((resolve) => { finishFirst = resolve })

    await page.route('**/api/advice', async (route) => {
      requests += 1
      if (requests === 1) {
        await firstGate
        try {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ ...readyAdvice, nextTip: 'This stale tip must not appear.' }),
          })
        } catch {
          // The browser may already have aborted this superseded request.
        } finally {
          finishFirst?.()
        }
        return
      }

      releaseFirst?.()
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(readyAdvice),
      })
    })

    await page.goto('/?crossingsToWin=1&difficulty=easy')
    await playActions(page, WINNING_PATHS.easy.actions)
    await expect.poll(() => requests).toBe(1)

    await page.keyboard.press('r')
    await playActions(page, WINNING_PATHS.easy.actions)

    await expect(page.locator('#ai-advice')).toHaveText(unavailableMessage)
    await expect.poll(() => requests).toBe(2)
    await firstFinished
    await expect(page.locator('#ai-advice')).not.toContainText('This stale tip must not appear.')
  })

  test('delays coaching for a generated run and labels its origin', async ({ page }) => {
    const lanes = getGeneratedLevelTemplate(1)
    await page.route('**/api/levels/generate', (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        runId: 'run-generated-advice', status: 'completed', stopReason: 'goal_completed', completed: true,
        counters: { stepCount: 2, providerAttemptCount: 2, retryCount: 0, toolCallCount: 2, modelToolCallCount: 1, revisionCount: 0 },
        elapsedMs: 80, kind: 'preview', source: 'generated', settings: { lives: 3, crossingsToWin: 1 }, lanes,
        requestedDifficulty: 1, computedDifficulty: 1, verified: true,
        measurements: { firstCrossingMinMoves: 6, minMoves: 6, ...measureTraffic(lanes), trafficPeriod: getTrafficPeriod(lanes), exploredStates: 100, actionEvaluations: 500 },
        summary: 'Verified level meets the requested rating and full crossing target.',
      }),
    }))
    let requestCount = 0
    await page.route('**/api/advice', async (route) => {
      requestCount += 1
      expect(route.request().postDataJSON()).toMatchObject({ outcome: 'won', difficulty: 'generated', targetCrossings: 1 })
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(readyAdvice) })
    })

    await page.goto('/?crossingsToWin=1&difficulty=normal')
    await page.getByLabel('Target challenge rating').selectOption('1')
    await page.getByRole('button', { name: 'Generate level' }).click()
    await page.getByRole('button', { name: 'Play this level' }).click()
    await expect(page.locator('#ai-advice')).toHaveText('')
    const firstAdviceResponse = page.waitForResponse('**/api/advice')
    await playActions(page, WINNING_PATHS.easy.actions)
    await firstAdviceResponse
    await expect.poll(() => requestCount).toBe(1)
    await expect(page.locator('#ai-advice')).toHaveText('')
    await page.keyboard.press('r')
    const secondAdviceResponse = page.waitForResponse('**/api/advice')
    await playActions(page, WINNING_PATHS.easy.actions)
    await secondAdviceResponse
    await expect.poll(() => requestCount).toBe(2)
    await expect(page.locator('#ai-advice')).toContainText(readyAdvice.nextTip)
  })
})
