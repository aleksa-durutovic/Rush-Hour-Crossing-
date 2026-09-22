import './style.css'
import { resolveGameConfig } from './config/game-config'
import { DIFFICULTY_PRESETS } from './config/presets'
import { restartGame } from './game/state'
import { applyAction } from './game/turn'
import { mapKeyboardEvent } from './input/keyboard'
import { configureCanvas, renderGame } from './render/canvas'

const app = document.querySelector<HTMLElement>('#app')

if (!app) {
  throw new Error('Application root #app was not found.')
}

app.innerHTML = `
  <main class="game-shell">
    <header class="game-header">
      <div>
        <p class="game-header__eyebrow">Traffic control · turn based</p>
        <h1>Rush Hour<br />Crossing</h1>
      </div>
      <p class="game-header__brief">Read the lane. Choose one square. Every move advances the rush.</p>
    </header>

    <p id="config-alert" class="config-alert" role="status" hidden></p>

    <div class="board-frame">
      <canvas
        id="game-canvas"
        tabindex="0"
        aria-label="Rush Hour Crossing game board. Use arrow keys or W A S D to move, Space to wait, and R to restart."
      ></canvas>
    </div>

    <footer class="controls" aria-label="Keyboard controls">
      <span><kbd>↑ ↓ ← →</kbd> or <kbd>W A S D</kbd> move</span>
      <span><kbd>Space</kbd> wait</span>
      <span><kbd>R</kbd> restart</span>
    </footer>
  </main>
`

const canvas = requireElement<HTMLCanvasElement>('#game-canvas')
const configAlert = requireElement<HTMLParagraphElement>('#config-alert')
const context = configureCanvas(canvas)
const configResolution = resolveGameConfig(new URLSearchParams(window.location.search))
const config = configResolution.config
const lanes = DIFFICULTY_PRESETS[config.difficulty]
let state = restartGame(config)

if (configResolution.usedFallback) {
  configAlert.hidden = false
  configAlert.textContent = `Invalid configuration: ${configResolution.invalidFields.join(', ')}. All defaults are active.`
}

render()
canvas.focus()

window.addEventListener('keydown', (event) => {
  const command = mapKeyboardEvent(event)
  if (!command) {
    return
  }

  event.preventDefault()
  state = command === 'restart' ? restartGame(config) : applyAction(state, command, lanes)
  render()
})

function render(): void {
  renderGame(context, state, config, lanes)
  canvas.setAttribute(
    'aria-label',
    `Rush Hour Crossing. ${state.lives} lives, ${state.crossings} of ${config.crossingsToWin} crossings, score ${state.score}, tick ${state.tick}, status ${state.status}.`,
  )
}

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector)
  if (!element) {
    throw new Error(`Required element ${selector} was not found.`)
  }
  return element
}
