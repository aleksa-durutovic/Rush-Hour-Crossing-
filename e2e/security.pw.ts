import { createServer, type Server } from 'node:http'
import { readdir, readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { startW08Server, type W08ServerFixture } from '../tests/server/fixtures/w08-server'
import { maliciousForeignFinalDecision } from '../tests/security/fixtures'
import { WINNING_PATHS } from '../tests/fixtures/golden-paths'
import { playActions } from './support'

let fixture: W08ServerFixture
let markerServer: Server
let markerUrl: string

// Each test starts its own process-local composition on the required loopback port. A
// pre-existing server is never reused, and the production frontend is served by app.ts.
test.beforeEach(async () => {
  fixture = await startW08Server({ port: 4173, staticDir: resolve('dist') })
  markerServer = createServer((request, response) => {
    if (request.url === '/control') {
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
      response.end('<!doctype html><script src="/marker.js"></script>')
      return
    }
    if (request.url === '/marker.js') {
      response.writeHead(200, { 'content-type': 'application/javascript; charset=utf-8' })
      response.end('window.__w08MarkerExecuted = true;')
      return
    }
    response.writeHead(404)
    response.end('not found')
  })
  await new Promise<void>((resolve, reject) => {
    markerServer.once('error', reject)
    markerServer.listen(4174, '127.0.0.1', () => {
      markerServer.off('error', reject)
      resolve()
    })
  })
  markerUrl = 'http://127.0.0.1:4174'
})

test.afterEach(async () => {
  markerServer.closeAllConnections()
  await new Promise<void>((resolve, reject) => {
    markerServer.close((error) => error ? reject(error) : resolve())
  })
  await fixture.close()
})

test('security fixture serves the built game through the real local handler', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('#game-canvas')).toBeVisible()
  expect(fixture.sdkCalls).toHaveLength(0)
  expect(fixture.solverStarts).toHaveLength(0)
})

test('T00 real controls preview before explicit Play and preserve ordinary gameplay', async ({ page }) => {
  await page.goto('/?lives=3&crossingsToWin=1&difficulty=normal')
  const board = page.locator('#game-canvas')
  const before = await board.getAttribute('aria-label')
  expect(before).toContain('3 lives, 0 of 1 crossings, score 0, tick 0, status active')
  await expect(page.getByRole('button', { name: 'Play this level' })).toBeHidden()

  await page.getByLabel('Target challenge rating').selectOption('1')
  await page.getByRole('button', { name: 'Generate level' }).click()
  await expect(page.getByRole('status', { name: 'Level generation status' })).toContainText('Verified level ready to preview')
  await expect(page.getByRole('button', { name: 'Play this level' })).toBeVisible()
  await expect(board).toHaveAttribute('aria-label', before ?? '')
  await expect(page.getByText('Generated level active')).toBeHidden()
  expect(fixture.sdkCalls.filter((call) => call.operation === 'generation')).toHaveLength(2)
  expect(fixture.solverStarts).toHaveLength(2)

  await page.getByRole('button', { name: 'Play this level' }).click()
  await expect(page.getByText('Generated level active')).toBeVisible()
  await page.keyboard.press('Space')
  await expect(board).toHaveAttribute('aria-label', /tick 1/)
  await page.keyboard.press('r')
  await expect(board).toHaveAttribute('aria-label', /tick 0/)
  expect(fixture.solverStarts).toHaveLength(2)
})

test('B15 browser reload keeps the process budget exhausted and delays unavailable advice', async ({ page }) => {
  await fixture.close()
  fixture = await startW08Server({ port: 4173, staticDir: resolve('dist'), providerAttemptLimit: 3 })
  await page.goto('/?crossingsToWin=1&difficulty=easy')

  await page.getByLabel('Target challenge rating').selectOption('1')
  const generation = page.waitForResponse('**/api/levels/generate')
  await page.getByRole('button', { name: 'Generate level' }).click()
  expect((await generation).status()).toBe(200)
  await expect(page.getByRole('button', { name: 'Play this level' })).toBeVisible()
  expect(fixture.sdkCalls).toHaveLength(2)

  const firstAdvice = page.waitForResponse('**/api/advice')
  await playActions(page, WINNING_PATHS.easy.actions)
  expect((await firstAdvice).status()).toBe(200)
  await expect(page.locator('#ai-advice')).toHaveText('')
  expect(fixture.sdkCalls).toHaveLength(3)

  await page.keyboard.press('r')
  const delayedAdvice = page.waitForResponse('**/api/advice')
  await playActions(page, WINNING_PATHS.easy.actions)
  expect((await delayedAdvice).status()).toBe(503)
  await expect(page.locator('#ai-advice')).toContainText('Previous run')
  expect(fixture.sdkCalls).toHaveLength(3)

  await page.keyboard.press('r')
  const unavailableAdvice = page.waitForResponse('**/api/advice')
  await playActions(page, WINNING_PATHS.easy.actions)
  expect((await unavailableAdvice).status()).toBe(503)
  await expect(page.locator('#ai-advice')).toContainText('unavailable')
  expect(fixture.sdkCalls).toHaveLength(3)

  await page.reload()
  await expect(page.locator('#game-canvas')).toHaveAttribute('aria-label', /status active/)
  await page.keyboard.press('Space')
  await expect(page.locator('#game-canvas')).toHaveAttribute('aria-label', /tick 1/)
  const deniedGeneration = page.waitForResponse('**/api/levels/generate')
  await page.getByRole('button', { name: 'Generate level' }).click()
  expect((await deniedGeneration).status()).toBe(503)
  await expect(page.getByRole('status', { name: 'Level generation status' })).toHaveText('The level response could not be verified.')
  await expect(page.getByRole('button', { name: 'Play this level' })).toBeHidden()
  await expect(page.locator('#game-canvas')).toHaveAttribute('aria-label', /tick 1, status active/)
  expect(fixture.sdkCalls).toHaveLength(3)
})

test('T15 forged URL and localStorage values do not replace initial game state', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('rush-hour-crossing', JSON.stringify({ score: 999_999, lives: 0, difficulty: 'admin' }))
    localStorage.setItem('w08-forged-game-state', JSON.stringify({ verified: true, provider: 'backup', maxSteps: 500 }))
  })
  await page.goto('/?lives=99&crossingsToWin=99&difficulty=administrator&score=999999&provider=backup&maxSteps=500')
  await expect(page.locator('#game-canvas')).toHaveAttribute(
    'aria-label',
    'Rush Hour Crossing. 3 lives, 0 of 3 crossings, score 0, tick 0, status active.',
  )
  await expect(page.locator('#config-alert')).toContainText('Invalid configuration')
  await expect(page.getByRole('button', { name: 'NORMAL' })).toHaveAttribute('aria-pressed', 'true')
  const before = await page.locator('#game-canvas').getAttribute('aria-label')

  await page.getByLabel('Target challenge rating').selectOption('1')
  await page.getByRole('button', { name: 'Generate level' }).click()
  await expect(page.getByRole('button', { name: 'Play this level' })).toBeVisible()
  await expect(page.locator('#game-canvas')).toHaveAttribute('aria-label', before ?? '')
  await expect(page.getByText('Generated level active')).toBeHidden()
  expect(fixture.solverStarts).toHaveLength(2)
})

test('T17 foreign final stays unavailable and leaves active play untouched', async ({ page }) => {
  await fixture.close()
  fixture = await startW08Server({ port: 4173, staticDir: resolve('dist'), decide: maliciousForeignFinalDecision })
  await page.goto('/?lives=3&crossingsToWin=1&difficulty=normal')
  const board = page.locator('#game-canvas')
  const before = await board.getAttribute('aria-label')
  await expect(page.getByRole('button', { name: 'Play this level' })).toBeHidden()

  await page.getByLabel('Target challenge rating').selectOption('1')
  await page.getByRole('button', { name: 'Generate level' }).click()
  await expect(page.getByRole('status', { name: 'Level generation status' })).toHaveText('The selected evidence is not available for this run.')
  await expect(page.locator('#generation-status img, #generation-status script')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Play this level' })).toBeHidden()
  await expect(board).toHaveAttribute('aria-label', before ?? '')
  await expect(page.getByText('Generated level active')).toBeHidden()
  expect(fixture.sdkCalls.filter((call) => call.operation === 'generation')).toHaveLength(2)
  expect(fixture.solverStarts).toHaveLength(1)
})
test('T04 advice marker remains literal and respects the one-run delay', async ({ page }) => {
  const markerTip = '<img src="/w08-missing.png" onerror="window.__w08XssMarker=true">'
  await fixture.close()
  fixture = await startW08Server({ port: 4173, staticDir: resolve('dist'), nextTip: markerTip })
  await page.addInitScript(() => {
    ;(globalThis as unknown as { __w08XssMarker?: boolean }).__w08XssMarker = false
  })
  await page.goto('/?crossingsToWin=1&difficulty=easy')
  const firstAdviceResponse = page.waitForResponse('**/api/advice')
  await playActions(page, WINNING_PATHS.easy.actions)
  expect((await firstAdviceResponse).status()).toBe(200)
  await expect.poll(() => fixture.sdkCalls.filter((call) => call.operation === 'advice').length).toBe(1)
  await expect(page.locator('#ai-advice')).toHaveText('')
  await page.keyboard.press('r')
  await playActions(page, WINNING_PATHS.easy.actions)
  await expect(page.locator('#ai-advice')).toContainText(markerTip)
  await expect(page.locator('#ai-advice img, #ai-advice script, #ai-advice a')).toHaveCount(0)
  expect(await page.evaluate(() => (globalThis as unknown as { __w08XssMarker?: boolean }).__w08XssMarker)).toBe(false)
  expect(new URL(page.url()).origin).toBe('http://127.0.0.1:4173')
  expect(fixture.sdkCalls.filter((call) => call.operation === 'advice')).toHaveLength(2)
})

test('T05 link-like and Unicode advice remains plain text', async ({ page }) => {
  const literalTip = 'Čekaj, Đorđe — igrač kaže \'sad\'; a < b. javascript:window.__w08XssMarker=true [klik](javascript:window.__w08XssMarker=true) <b>raw</b>'
  await fixture.close()
  fixture = await startW08Server({ port: 4173, staticDir: resolve('dist'), nextTip: literalTip })
  await page.addInitScript(() => {
    ;(globalThis as unknown as { __w08XssMarker?: boolean }).__w08XssMarker = false
  })
  await page.goto('/?crossingsToWin=1&difficulty=easy')
  const firstAdviceResponse = page.waitForResponse('**/api/advice')
  await playActions(page, WINNING_PATHS.easy.actions)
  expect((await firstAdviceResponse).status()).toBe(200)
  await expect.poll(() => fixture.sdkCalls.filter((call) => call.operation === 'advice').length).toBe(1)
  await page.keyboard.press('r')
  await playActions(page, WINNING_PATHS.easy.actions)
  await expect(page.locator('#ai-advice')).toContainText(literalTip)
  await expect(page.locator('#ai-advice a, #ai-advice img, #ai-advice script, #ai-advice b')).toHaveCount(0)
  expect(await page.locator('#ai-advice').textContent()).toContain("Čekaj, Đorđe — igrač kaže 'sad'; a < b.")
  expect(await page.evaluate(() => (globalThis as unknown as { __w08XssMarker?: boolean }).__w08XssMarker)).toBe(false)
  expect(new URL(page.url()).origin).toBe('http://127.0.0.1:4173')
  expect(fixture.sdkCalls.filter((call) => call.operation === 'advice')).toHaveLength(2)
})
test('T16 built assets and optional source maps omit the synthetic sentinel', async () => {
  const files = await listFiles(resolve('dist'))
  const productionAssets = files.filter((path) => path.includes(join('dist', 'assets')) || path.endsWith('.map'))
  expect(productionAssets.length).toBeGreaterThan(0)
  for (const path of productionAssets) {
    expect(await readFile(path, 'utf8')).not.toContain('W08_SERVER_SECRET_DO_NOT_EXPOSE')
  }
  const sourceMaps = files.filter((path) => path.endsWith('.map'))
  expect(sourceMaps.every((path) => productionAssets.includes(path))).toBe(true)
})

async function listFiles(root: string): Promise<string[]> {
  const children = await readdir(root, { withFileTypes: true })
  const nested = await Promise.all(children.map(async (child) => {
    const path = join(root, child.name)
    return child.isDirectory() ? listFiles(path) : [path]
  }))
  return nested.flat()
}
test('T16 production CSP blocks an available second-loopback script', async ({ page, browser }) => {
  const scriptResponse = await fetch(`${markerUrl}/marker.js`)
  expect(scriptResponse.status).toBe(200)
  expect(scriptResponse.headers.get('content-type')).toContain('application/javascript')

  const control = await browser.newPage()
  await control.goto(`${markerUrl}/control`)
  await expect.poll(() => control.evaluate(() => (
    globalThis as unknown as { __w08MarkerExecuted?: boolean }
  ).__w08MarkerExecuted))
    .toBe(true)
  await control.close()

  const gameResponse = await page.goto('/')
  const csp = gameResponse?.headers()['content-security-policy'] ?? ''
  await page.evaluate(() => {
    const target = globalThis as unknown as {
      __w08MarkerExecuted?: boolean
      __w08PolicyViolations?: string[]
      document: {
        addEventListener(type: 'securitypolicyviolation', listener: (event: { effectiveDirective: string }) => void): void
      }
    }
    target.__w08PolicyViolations = []
    target.document.addEventListener('securitypolicyviolation', (event) => {
      target.__w08PolicyViolations?.push(event.effectiveDirective)
    })
  })
  await page.evaluate((url) => {
    const target = globalThis as unknown as {
      document: {
        createElement(name: 'script'): { src: string }
        head: { append(child: unknown): void }
      }
    }
    const script = target.document.createElement('script')
    script.src = url
    target.document.head.append(script)
  }, `${markerUrl}/marker.js`)
  await expect.poll(() => page.evaluate(() => {
    const target = globalThis as unknown as { __w08MarkerExecuted?: boolean; __w08PolicyViolations?: string[] }
    return target.__w08MarkerExecuted === true || (target.__w08PolicyViolations?.length ?? 0) > 0
  })).toBe(true)

  const observed = await page.evaluate(() => {
    const target = globalThis as unknown as { __w08MarkerExecuted?: boolean; __w08PolicyViolations?: string[] }
    return {
      markerExecuted: target.__w08MarkerExecuted === true,
      policyViolations: target.__w08PolicyViolations ?? [],
    }
  })
  expect(gameResponse?.headers()['x-content-type-options']).toBe('nosniff')
  expect(gameResponse?.headers()['referrer-policy']).toBe('no-referrer')
  expect(gameResponse?.headers()['x-frame-options']).toBe('DENY')
  expect({
    enforcingPolicy: csp.includes("script-src 'self'"),
    markerBlocked: !observed.markerExecuted,
    matchingViolation: observed.policyViolations.some((directive) => directive.startsWith('script-src')),
  }).toEqual({ enforcingPolicy: true, markerBlocked: true, matchingViolation: true })

  await page.getByLabel('Target challenge rating').selectOption('1')
  await page.getByRole('button', { name: 'Generate level' }).click()
  await expect(page.getByRole('status', { name: 'Level generation status' })).toContainText('Verified level ready to preview')
  await expect(page.getByRole('button', { name: 'Play this level' })).toBeVisible()
  expect(fixture.sdkCalls.filter((call) => call.operation === 'generation')).toHaveLength(2)
  expect(fixture.solverStarts).toHaveLength(2)
})
