/// <reference types="node" />

import { expect, test } from '@playwright/test'
import { findSafePath } from '../server/agent/tools/find-safe-path'
import { isHintResponse } from '../shared/hint-agent-contract'

const initialSnapshot = {
  status: 'active',
  difficulty: 'easy',
  tick: 0,
  x: 4,
  y: 6,
  lives: 3,
  crossings: 0,
  crossingsToWin: 1,
} as const

test.skip(process.env.RUN_LIVE_HINT_EVIDENCE !== '1', 'Set RUN_LIVE_HINT_EVIDENCE=1 to permit the live Gemini request.')

test('live Gemini Hint returns and displays the solver-verified route', async ({ page }) => {
  await page.goto('/?crossingsToWin=1&difficulty=easy')
  const responsePromise = page.waitForResponse((response) =>
    response.url().endsWith('/api/hint') && response.request().method() === 'POST',
  )
  await page.getByRole('button', { name: 'Hint' }).click()
  const response = await responsePromise
  expect(response.status()).toBe(200)

  const payload: unknown = await response.json()
  expect(isHintResponse(payload, initialSnapshot)).toBe(true)
  if (!isHintResponse(payload, initialSnapshot)) throw new Error('The live API did not return a valid Hint response.')

  const expected = findSafePath(initialSnapshot)
  expect(expected.outcome).toBe('verified')
  if (expected.outcome !== 'verified') throw new Error('The evidence fixture must have a solver-verified route.')
  expect(payload.steps).toEqual(expected.steps)
  expect(payload.explanation.length).toBeGreaterThan(0)
  await expect(page.getByRole('status', { name: 'Hint status' })).toContainText('Verified safe path to the next crossing.')
  await expect(page.getByRole('list', { name: 'Verified route steps' })).toContainText('Step 1: up')
  await page.screenshot({ path: 'docs/evidence/w05-hint-live-verified.png', fullPage: true })
})
