import type { GameStatus } from '../game/state'

export interface EndStateMessage {
  title: string
  hint: string
}

const RESTART_HINT = 'PRESS R TO RESTART'

export function getEndStateMessage(status: GameStatus): EndStateMessage | null {
  if (status === 'won') {
    return { title: 'CITY CROSSED!', hint: RESTART_HINT }
  }
  if (status === 'lost') {
    return { title: 'GAME OVER', hint: RESTART_HINT }
  }
  return null
}
