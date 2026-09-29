import { expect, test } from '@playwright/test'
import { WINNING_PATHS } from '../tests/fixtures/golden-paths'
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
    await playActions(page, WINNING_PATHS.easy.actions)
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
})
