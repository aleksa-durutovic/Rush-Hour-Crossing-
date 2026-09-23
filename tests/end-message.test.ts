import { describe, expect, it } from 'vitest'
import { getEndStateMessage } from '../src/render/end-message'

describe('end-state message', () => {
  it('announces a win for the won status', () => {
    expect(getEndStateMessage('won')).toEqual({
      title: 'CITY CROSSED!',
      hint: 'PRESS R TO RESTART',
    })
  })

  it('announces game over for the lost status', () => {
    expect(getEndStateMessage('lost')).toEqual({
      title: 'GAME OVER',
      hint: 'PRESS R TO RESTART',
    })
  })

  it('shows no message while the game is active', () => {
    expect(getEndStateMessage('active')).toBeNull()
  })
})
