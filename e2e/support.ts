import { expect, type Page } from '@playwright/test'
import type { GameStatus, PlayerAction } from '../src/game/state'

export const ACTION_KEYS: Readonly<Record<PlayerAction, string>> = {
  up: 'ArrowUp',
  down: 'ArrowDown',
  left: 'ArrowLeft',
  right: 'ArrowRight',
  wait: 'Space',
}

export interface BoardState {
  lives: number
  crossings: number
  crossingsToWin: number
  score: number
  tick: number
  status: GameStatus
}

/** Mirrors the accessible description that `src/main.ts` writes after every render. */
export function boardLabel(state: BoardState): string {
  return `Rush Hour Crossing. ${state.lives} lives, ${state.crossings} of ${state.crossingsToWin} crossings, score ${state.score}, tick ${state.tick}, status ${state.status}.`
}

export async function playActions(page: Page, actions: readonly PlayerAction[]): Promise<void> {
  for (const action of actions) {
    await page.keyboard.press(ACTION_KEYS[action])
  }
}

export async function expectBoard(page: Page, state: BoardState): Promise<void> {
  await expect(page.locator('#game-canvas')).toHaveAttribute('aria-label', boardLabel(state))
}
