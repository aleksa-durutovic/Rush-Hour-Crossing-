import { expect, test, type Page } from '@playwright/test'
import { getGeneratedLevelTemplate } from '../src/config/generated-level'
import { measureTraffic } from '../src/game/level-metrics'
import { getTrafficPeriod } from '../src/game/solve-level'

const lanes = getGeneratedLevelTemplate(1)
const traffic = measureTraffic(lanes)

const successfulPreview = {
  runId: 'run-browser',
  status: 'completed',
  stopReason: 'goal_completed',
  completed: true,
  counters: { stepCount: 2, providerAttemptCount: 2, retryCount: 0, toolCallCount: 2, modelToolCallCount: 1, revisionCount: 0 },
  elapsedMs: 80,
  kind: 'preview',
  source: 'generated',
  settings: { lives: 3, crossingsToWin: 1 },
  lanes,
  requestedDifficulty: 1,
  computedDifficulty: 1,
  verified: true,
  measurements: {
    firstCrossingMinMoves: 6,
    minMoves: 6,
    ...traffic,
    trafficPeriod: getTrafficPeriod(lanes),
    exploredStates: 100,
    actionEvaluations: 500,
  },
  summary: 'Verified level meets the requested rating and full crossing target.',
}

async function stubGeneratedLevel(page: Page): Promise<void> {
  await page.route('**/api/levels/generate', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', json: successfulPreview })
  })
}

test.describe('verified level generator', () => {
  test.beforeEach(async ({ page }) => {
    await stubGeneratedLevel(page)
    await page.goto('/?lives=3&crossingsToWin=1&difficulty=normal')
  })

  test('previews a verified challenge without changing active play', async ({ page }) => {
    const board = page.locator('#game-canvas')
    await page.keyboard.press('ArrowUp')
    const before = await board.getAttribute('aria-label')
    await page.getByLabel('Target challenge rating').selectOption('1')
    await expect(page.getByLabel('Target challenge rating')).toHaveValue('1')
    await page.getByRole('button', { name: 'Generate level' }).click()

    await expect(page.getByRole('status', { name: 'Level generation status' })).toContainText(/verified/i)
    await expect(page.getByText('Five traffic lanes')).toBeVisible()
    await expect(page.getByText('Requested rating 1')).toBeVisible()
    await expect(page.getByText('Measured rating 1')).toBeVisible()
    await expect(page.getByText('Minimum safe first crossing: 6 moves')).toBeVisible()
    await expect(page.getByText('Minimum full win: 6 moves')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Play this level' })).toBeVisible()
    await expect(board).toHaveAttribute('aria-label', before ?? '')
    await expect(page.locator('#preview-canvas')).toBeVisible()
    await expect(page.getByRole('button', { name: 'NORMAL' })).toHaveAttribute('aria-pressed', 'true')
  })

  test('Play applies the exact verified preview, R reuses it, and a remembered preset restores original traffic', async ({ page }) => {
    await page.getByLabel('Target challenge rating').selectOption('1')
    await page.getByRole('button', { name: 'Generate level' }).click()
    await page.getByRole('button', { name: 'Play this level' }).click()

    await expect(page.getByText('Generated level active')).toBeVisible()
    await expect(page.getByRole('button', { name: 'EASY' })).toHaveAttribute('aria-pressed', 'false')
    await expect(page.getByRole('button', { name: 'NORMAL' })).toHaveAttribute('aria-pressed', 'false')
    await expect(page.getByRole('button', { name: 'HARD' })).toHaveAttribute('aria-pressed', 'false')
    const previewPixels = await page.locator('#preview-canvas').evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL())
    const activePixels = await page.locator('#game-canvas').evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL())
    expect(activePixels).toBe(previewPixels)

    await page.keyboard.press('ArrowUp')
    await expect(page.locator('#game-canvas')).toHaveAttribute('aria-label', /tick 1/)
    await page.keyboard.press('r')
    await expect(page.locator('#game-canvas')).toHaveAttribute('aria-label', /tick 0/)
    await expect(page.getByText('Generated level active')).toBeVisible()

    await page.getByRole('button', { name: 'NORMAL' }).click()
    await expect(page.getByText('Generated level active')).toBeHidden()
    await expect(page.getByRole('button', { name: 'NORMAL' })).toHaveAttribute('aria-pressed', 'true')
  })

  test('reload returns to the query preset and generator controls do not consume gameplay keys', async ({ page }) => {
    const board = page.locator('#game-canvas')
    await page.getByLabel('Target challenge rating').focus()
    const before = await board.getAttribute('aria-label')
    await page.keyboard.press('ArrowUp')
    await expect(board).toHaveAttribute('aria-label', before ?? '')

    await page.getByLabel('Target challenge rating').selectOption('1')
    await expect(page.getByLabel('Target challenge rating')).toHaveValue('1')
    await page.getByRole('button', { name: 'Generate level' }).click()
    await page.getByRole('button', { name: 'Play this level' }).click()
    await page.reload()
    await expect(page.getByText('Generated level active')).toBeHidden()
    await expect(page.getByRole('button', { name: 'NORMAL' })).toHaveAttribute('aria-pressed', 'true')
  })

  test('unavailable provider text is literal and disables Play', async ({ page }) => {
    await page.route('**/api/levels/generate', (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      json: {
        runId: 'run-unavailable', status: 'failed', stopReason: 'provider_failed', completed: false,
        counters: { stepCount: 1, providerAttemptCount: 1, retryCount: 0, toolCallCount: 0, modelToolCallCount: 0, revisionCount: 0 },
        elapsedMs: 10, kind: 'unavailable', message: '<img src=x onerror=alert(1)> Provider unavailable',
      },
    }))
    const before = await page.locator('#game-canvas').getAttribute('aria-label')
    await page.getByRole('button', { name: 'Generate level' }).click()

    await expect(page.getByRole('status', { name: 'Level generation status' })).toContainText('<img src=x onerror=alert(1)>')
    await expect(page.locator('#level-generator img')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Play this level' })).toHaveCount(0)
    await expect(page.locator('#game-canvas')).toHaveAttribute('aria-label', before ?? '')
  })

  test('cancellation clears the preview and preserves active play despite a late response', async ({ page }) => {
    let releaseResponse: (() => void) | undefined
    const gate = new Promise<void>((resolve) => { releaseResponse = resolve })
    await page.route('**/api/levels/generate', async (route) => {
      await gate
      try {
        await route.fulfill({ status: 200, contentType: 'application/json', json: successfulPreview })
      } catch {
        // The browser may have aborted the request during cancellation.
      }
    })
    const board = page.locator('#game-canvas')
    const before = await board.getAttribute('aria-label')
    await page.getByRole('button', { name: 'Generate level' }).click()
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible()
    await page.getByRole('button', { name: 'Cancel' }).click()
    releaseResponse?.()

    await expect(page.getByRole('status', { name: 'Level generation status' })).toContainText('cancelled')
    await expect(page.getByRole('button', { name: 'Play this level' })).toHaveCount(0)
    await expect(board).toHaveAttribute('aria-label', before ?? '')
  })

  test('labels and permits an exact verified fallback preview', async ({ page }) => {
    await page.route('**/api/levels/generate', (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      json: { ...successfulPreview, status: 'stopped', stopReason: 'provider_failed', completed: false, source: 'last_verified' },
    }))
    await page.getByLabel('Target challenge rating').selectOption('1')
    await page.getByRole('button', { name: 'Generate level' }).click()

    await expect(page.getByText('Source: Previously verified level')).toBeVisible()
    await expect(page.getByText('Requested rating 1')).toBeVisible()
    await expect(page.getByText('Measured rating 1')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Play this level' })).toBeVisible()
  })
})
