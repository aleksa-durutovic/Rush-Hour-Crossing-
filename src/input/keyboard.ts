import type { PlayerAction } from '../game/state'

export type KeyboardCommand = PlayerAction | 'restart'

export interface KeyboardEventLike {
  key: string
  repeat: boolean
}

const KEY_COMMANDS: Readonly<Record<string, KeyboardCommand>> = {
  ArrowUp: 'up',
  w: 'up',
  ArrowDown: 'down',
  s: 'down',
  ArrowLeft: 'left',
  a: 'left',
  ArrowRight: 'right',
  d: 'right',
  ' ': 'wait',
  Space: 'wait',
  Spacebar: 'wait',
  r: 'restart',
}

export function mapKeyboardEvent(event: KeyboardEventLike): KeyboardCommand | null {
  if (event.repeat) {
    return null
  }

  return KEY_COMMANDS[event.key.length === 1 ? event.key.toLowerCase() : event.key] ?? null
}
