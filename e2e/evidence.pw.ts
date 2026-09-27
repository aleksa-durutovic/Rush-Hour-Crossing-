import { expect, test, type Page } from '@playwright/test'
import { LOSING_PATHS, WINNING_PATHS } from '../tests/fixtures/golden-paths'
import { expectBoard, playActions } from './support'

const EVIDENCE_DIR = 'docs/evidence'

async function open(page: Page, url: string): Promise<void> {
  await page.goto(url)
  await page.waitForLoadState('networkidle')
}

async function capture(page: Page, file: string): Promise<void> {
  await page.screenshot({ path: `${EVIDENCE_DIR}/${file}`, fullPage: true })
}

test.describe('evidence screenshots', () => {
  test('active board, desktop', async ({ page }) => {
    await open(page, '/')
    await expectBoard(page, {
      lives: 3,
      crossings: 0,
      crossingsToWin: 3,
      score: 0,
      tick: 0,
      status: 'active',
    })
    await capture(page, 'active-desktop.png')
  })

  test('active board, 320 px wide', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 })
    await open(page, '/')
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBe(0)
    await capture(page, 'active-narrow-320.png')
  })

  test('keyboard focus', async ({ page }) => {
    await open(page, '/')
    const board = page.locator('#game-canvas')
    await page.locator('h1').click()
    await page.keyboard.press('Tab')
    await expect(board).toBeFocused()
    await capture(page, 'keyboard-focus.png')
  })

  test('invalid configuration (D5)', async ({ page }) => {
    await open(page, '/?lives=0&crossingsToWin=11&difficulty=insane')
    await expect(page.locator('#config-alert')).toBeVisible()
    await capture(page, 'd5-invalid-config.png')
  })

  test('E4 wrap case, normal preset at tick 4', async ({ page }) => {
    await open(page, '/')
    await playActions(page, ['wait', 'wait', 'wait', 'wait'])
    await expectBoard(page, {
      lives: 3,
      crossings: 0,
      crossingsToWin: 3,
      score: 0,
      tick: 4,
      status: 'active',
    })
    await capture(page, 'e4-wrap-normal-tick4.png')
  })

  const wins = [
    ['easy', 'd6-win.png'],
    ['normal', 'd6-win-normal.png'],
    ['hard', 'd6-win-hard.png'],
  ] as const

  for (const [difficulty, file] of wins) {
    test(`win (D6), ${difficulty}`, async ({ page }) => {
      const golden = WINNING_PATHS[difficulty]
      await open(page, `/?crossingsToWin=1&difficulty=${difficulty}`)
      await playActions(page, golden.actions)
      await expectBoard(page, {
        lives: golden.finalLives,
        crossings: 1,
        crossingsToWin: 1,
        score: 100,
        tick: golden.finalTick,
        status: 'won',
      })
      await capture(page, file)
    })
  }

  test('difficulty selector, hard chosen', async ({ page }) => {
    await open(page, '/')
    await page.locator('[data-difficulty="hard"]').click()
    await expect(page.locator('[data-difficulty="hard"]')).toHaveAttribute('aria-pressed', 'true')
    await expectBoard(page, {
      lives: 3,
      crossings: 0,
      crossingsToWin: 3,
      score: 0,
      tick: 0,
      status: 'active',
    })
    await capture(page, 'difficulty-switch.png')
  })

  test('loss (D6), easy', async ({ page }) => {
    const golden = LOSING_PATHS.easy
    await open(page, '/?crossingsToWin=1&difficulty=easy')
    await playActions(page, golden.actions)
    await expectBoard(page, {
      lives: golden.finalLives,
      crossings: 0,
      crossingsToWin: 1,
      score: 0,
      tick: golden.finalTick,
      status: 'lost',
    })
    await capture(page, 'd6-loss.png')
  })
})
