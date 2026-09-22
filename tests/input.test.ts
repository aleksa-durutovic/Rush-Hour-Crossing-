import { describe, expect, it } from 'vitest'
import { mapKeyboardEvent } from '../src/input/keyboard'

describe('keyboard mapping', () => {
  it.each([
    ['ArrowUp', 'up'],
    ['w', 'up'],
    ['W', 'up'],
    ['ArrowDown', 'down'],
    ['s', 'down'],
    ['ArrowLeft', 'left'],
    ['a', 'left'],
    ['ArrowRight', 'right'],
    ['d', 'right'],
    [' ', 'wait'],
    ['Space', 'wait'],
    ['r', 'restart'],
    ['R', 'restart'],
  ] as const)('maps %s to %s', (key, expected) => {
    expect(mapKeyboardEvent({ key, repeat: false })).toBe(expected)
  })

  it('ignores unsupported and repeated keys', () => {
    expect(mapKeyboardEvent({ key: 'Enter', repeat: false })).toBeNull()
    expect(mapKeyboardEvent({ key: 'ArrowUp', repeat: true })).toBeNull()
  })
})
