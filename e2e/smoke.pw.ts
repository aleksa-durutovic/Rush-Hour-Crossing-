import { expect, test } from '@playwright/test'
import type { Difficulty } from '../src/game/state'
import { LOSING_PATHS, WINNING_PATHS } from '../tests/fixtures/golden-paths'
import { expectBoard, playActions } from './support'

const difficulties: readonly Difficulty[] = ['easy', 'normal', 'hard']

test.describe('browser smoke', () => {
  test('starts without console problems and focuses the board', async ({ page }) => {
    const problems: string[] = []
    page.on('console', (message) => {
      if (message.type() === 'error' || message.type() === 'warning') {
        problems.push(`${message.type()}: ${message.text()}`)
      }
    })
    page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`))

    await page.goto('/')

    await expect(page.locator('#game-canvas')).toBeFocused()
    await expect(page.locator('main')).toHaveCount(1)
    await expect(page.locator('#config-alert')).toBeHidden()
    await expectBoard(page, {
      lives: 3,
      crossings: 0,
      crossingsToWin: 3,
      score: 0,
      tick: 0,
      status: 'active',
    })
    expect(problems).toEqual([])
  })

  test('Tab moves visible keyboard focus to the board', async ({ page }) => {
    await page.goto('/')
    const board = page.locator('#game-canvas')
    await page.locator('h1').click()
    await expect(board).not.toBeFocused()

    await page.keyboard.press('Tab')

    await expect(board).toBeFocused()
    expect(await board.evaluate((canvas) => canvas.matches(':focus-visible'))).toBe(true)
  })

  test('Space waits one turn', async ({ page }) => {
    await page.goto('/')

    await page.keyboard.press('Space')

    await expectBoard(page, {
      lives: 3,
      crossings: 0,
      crossingsToWin: 3,
      score: 0,
      tick: 1,
      status: 'active',
    })
  })

  test('an invalid configuration names every invalid field and uses defaults', async ({ page }) => {
    await page.goto('/?lives=0&crossingsToWin=11&difficulty=insane')

    await expect(page.locator('#config-alert')).toBeVisible()
    await expect(page.locator('#config-alert')).toHaveText(
      'Invalid configuration: lives, crossingsToWin, difficulty. All defaults are active.',
    )
    await expectBoard(page, {
      lives: 3,
      crossings: 0,
      crossingsToWin: 3,
      score: 0,
      tick: 0,
      status: 'active',
    })
  })

  for (const difficulty of difficulties) {
    test(`${difficulty}: a win locks input until R restarts`, async ({ page }) => {
      const golden = WINNING_PATHS[difficulty]
      const won = {
        lives: golden.finalLives,
        crossings: 1,
        crossingsToWin: 1,
        score: 100,
        tick: golden.finalTick,
        status: 'won',
      } as const
      await page.goto(`/?crossingsToWin=1&difficulty=${difficulty}`)

      await playActions(page, golden.actions)
      await expectBoard(page, won)

      await playActions(page, ['up', 'wait', 'left'])
      await expectBoard(page, won)

      await page.keyboard.press('r')
      await expectBoard(page, {
        lives: 3,
        crossings: 0,
        crossingsToWin: 1,
        score: 0,
        tick: 0,
        status: 'active',
      })
    })

    test(`${difficulty}: a loss locks input until R restarts`, async ({ page }) => {
      const golden = LOSING_PATHS[difficulty]
      const lost = {
        lives: golden.finalLives,
        crossings: 0,
        crossingsToWin: 1,
        score: 0,
        tick: golden.finalTick,
        status: 'lost',
      } as const
      await page.goto(`/?crossingsToWin=1&difficulty=${difficulty}`)

      await playActions(page, golden.actions)
      await expectBoard(page, lost)

      await playActions(page, ['up', 'wait', 'right'])
      await expectBoard(page, lost)

      await page.keyboard.press('r')
      await expectBoard(page, {
        lives: 3,
        crossings: 0,
        crossingsToWin: 1,
        score: 0,
        tick: 0,
        status: 'active',
      })
    })
  }
})
