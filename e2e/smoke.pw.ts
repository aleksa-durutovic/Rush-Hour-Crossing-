import { expect, test, type Page } from '@playwright/test'
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

async function expectPressed(page: Page, active: Difficulty): Promise<void> {
  for (const difficulty of difficulties) {
    await expect(page.locator(`[data-difficulty="${difficulty}"]`)).toHaveAttribute(
      'aria-pressed',
      String(difficulty === active),
    )
  }
}

function currentSearch(page: Page): string {
  return new URL(page.url()).search
}

test.describe('difficulty selector', () => {
  test('marks the active difficulty as pressed', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('#difficulty-switch button')).toHaveText(['EASY', 'NORMAL', 'HARD'])
    await expectPressed(page, 'normal')

    await page.goto('/?difficulty=hard')
    await expectPressed(page, 'hard')
  })

  test('a click on another difficulty restarts on that preset and updates the URL', async ({ page }) => {
    await page.goto('/?crossingsToWin=1')
    await page.keyboard.press('Space')
    await page.keyboard.press('Space')
    await expectBoard(page, {
      lives: 3,
      crossings: 0,
      crossingsToWin: 1,
      score: 0,
      tick: 2,
      status: 'active',
    })

    await page.locator('[data-difficulty="hard"]').click()

    await expectBoard(page, {
      lives: 3,
      crossings: 0,
      crossingsToWin: 1,
      score: 0,
      tick: 0,
      status: 'active',
    })
    await expectPressed(page, 'hard')
    await expect(page.locator('#game-canvas')).toBeFocused()
    expect(currentSearch(page)).toBe('?crossingsToWin=1&difficulty=hard')

    const golden = WINNING_PATHS.hard
    await playActions(page, golden.actions)
    await expectBoard(page, {
      lives: golden.finalLives,
      crossings: 1,
      crossingsToWin: 1,
      score: 100,
      tick: golden.finalTick,
      status: 'won',
    })
  })

  test('a click on the active difficulty keeps the current game', async ({ page }) => {
    await page.goto('/')
    await page.keyboard.press('Space')

    await page.locator('[data-difficulty="normal"]').click()

    await expectBoard(page, {
      lives: 3,
      crossings: 0,
      crossingsToWin: 3,
      score: 0,
      tick: 1,
      status: 'active',
    })
    await expectPressed(page, 'normal')
    await expect(page.locator('#game-canvas')).toBeFocused()
    expect(currentSearch(page)).toBe('')
  })

  test('a reload keeps the chosen difficulty', async ({ page }) => {
    await page.goto('/')
    await page.locator('[data-difficulty="easy"]').click()
    await expectPressed(page, 'easy')

    await page.reload()

    await expectPressed(page, 'easy')
    expect(currentSearch(page)).toBe('?difficulty=easy')
    await playActions(page, WINNING_PATHS.easy.actions)
    await expectBoard(page, {
      lives: 3,
      crossings: 1,
      crossingsToWin: 3,
      score: 100,
      tick: 6,
      status: 'active',
    })
  })

  test('choosing a difficulty after an invalid configuration clears the alert', async ({ page }) => {
    await page.goto('/?lives=0&crossingsToWin=11&difficulty=insane')
    await expect(page.locator('#config-alert')).toBeVisible()

    await page.locator('[data-difficulty="hard"]').click()

    await expect(page.locator('#config-alert')).toBeHidden()
    await expectPressed(page, 'hard')
    expect(currentSearch(page)).toBe('?difficulty=hard')
    await expectBoard(page, {
      lives: 3,
      crossings: 0,
      crossingsToWin: 3,
      score: 0,
      tick: 0,
      status: 'active',
    })
  })

  test('Tab reaches the buttons and Space selects without playing a turn', async ({ page }) => {
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

    await page.keyboard.press('Tab')
    await expect(page.locator('[data-difficulty="easy"]')).toBeFocused()
    await page.keyboard.press('Space')

    await expectPressed(page, 'easy')
    await expectBoard(page, {
      lives: 3,
      crossings: 0,
      crossingsToWin: 3,
      score: 0,
      tick: 0,
      status: 'active',
    })
    await expect(page.locator('#game-canvas')).toBeFocused()
  })
})

test.describe('same-origin API', () => {
  test('serves the API health check from the game origin', async ({ request }) => {
    const response = await request.get('/api/health')

    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toBe('application/json; charset=utf-8')
    expect(response.headers()['access-control-allow-origin']).toBeUndefined()
    expect(await response.json()).toEqual({ status: 'ok', service: 'rush-hour-crossing-api' })
  })

  test('answers an unknown API route with a JSON 404', async ({ request }) => {
    const response = await request.get('/api/does-not-exist')

    expect(response.status()).toBe(404)
    expect(await response.json()).toEqual({ error: 'NOT_FOUND' })
  })
})
