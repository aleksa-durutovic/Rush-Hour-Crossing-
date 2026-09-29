import './style.css'
import { createAdviceController } from './advice/controller'
import { buildCompletedRunSummary } from './advice/summary'
import type { AdviceNotice } from './advice/lifecycle'
import { buildDifficultySearch } from './config/difficulty-query'
import { DIFFICULTIES, resolveGameConfig } from './config/game-config'
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
        <p class="game-header__eyebrow">Turn-based night crossing</p>
        <h1>Rush Hour <span>Crossing</span></h1>
      </div>
      <p class="game-header__brief">Read the lane. Make one move. Every choice advances the rush.</p>
    </header>

    <p id="config-alert" class="config-alert" role="status" hidden></p>
    <p id="ai-advice" class="ai-advice" role="status" aria-live="polite"></p>

    <div class="board-frame">
      <div class="board-stage">
        <canvas
          id="game-canvas"
          tabindex="0"
          aria-label="Rush Hour Crossing game board. Use arrow keys or W A S D to move, Space to wait, and R to restart."
        ></canvas>
        <div id="difficulty-switch" class="difficulty-switch" role="group" aria-label="Traffic difficulty">
          ${DIFFICULTIES.map(
            (difficulty) =>
              `<button type="button" class="difficulty-switch__button" data-difficulty="${difficulty}" aria-pressed="false">${difficulty.toUpperCase()}</button>`,
          ).join('')}
        </div>
      </div>
    </div>

    <footer class="controls" aria-label="Controls">
      <span><kbd>↑ ↓ ← →</kbd> or <kbd>W A S D</kbd> move</span>
      <span><kbd>Space</kbd> wait</span>
      <span><kbd>R</kbd> restart</span>
      <span><kbd>Click</kbd> EASY / NORMAL / HARD traffic</span>
    </footer>
  </main>
`

const canvas = requireElement<HTMLCanvasElement>('#game-canvas')
const configAlert = requireElement<HTMLParagraphElement>('#config-alert')
const adviceRegion = requireElement<HTMLParagraphElement>('#ai-advice')
const difficultyButtons = Array.from(
  document.querySelectorAll<HTMLButtonElement>('#difficulty-switch button[data-difficulty]'),
)
const context = configureCanvas(canvas)
const configResolution = resolveGameConfig(new URLSearchParams(window.location.search))
let config = configResolution.config
let lanes = DIFFICULTY_PRESETS[config.difficulty]
let usedFallback = configResolution.usedFallback
let state = restartGame(config)
const advice = createAdviceController(renderAdviceNotice)

if (usedFallback) {
  configAlert.hidden = false
  configAlert.textContent = `Invalid configuration: ${configResolution.invalidFields.join(', ')}. All defaults are active.`
}

for (const button of difficultyButtons) {
  button.addEventListener('click', () => selectDifficulty(button.dataset.difficulty))
}

render()
canvas.focus()

window.addEventListener('keydown', (event) => {
  if (event.target instanceof Element && event.target.closest('#difficulty-switch')) {
    return
  }

  const command = mapKeyboardEvent(event)
  if (!command) {
    return
  }

  event.preventDefault()
  if (command === 'restart') {
    advice.reset('restart')
    state = restartGame(config)
  } else {
    const wasActive = state.status === 'active'
    state = applyAction(state, command, lanes)
    if (wasActive && state.status !== 'active') {
      const summary = buildCompletedRunSummary(state)
      if (summary) advice.complete(summary)
    }
  }
  render()
})

function selectDifficulty(value: string | undefined): void {
  const difficulty = DIFFICULTIES.find((candidate) => candidate === value)

  if (difficulty && difficulty !== config.difficulty) {
    advice.reset('difficulty')
    config = { ...config, difficulty }
    lanes = DIFFICULTY_PRESETS[difficulty]
    state = restartGame(config)
    window.history.replaceState(null, '', buildDifficultySearch(window.location.search, difficulty, usedFallback))
    usedFallback = false
    configAlert.hidden = true
    configAlert.textContent = ''
    render()
  }

  canvas.focus()
}

function render(): void {
  renderGame(context, state, config, lanes)
  for (const button of difficultyButtons) {
    button.setAttribute('aria-pressed', String(button.dataset.difficulty === config.difficulty))
  }
  const frame = canvas.closest<HTMLElement>('.board-frame')
  frame?.classList.remove('turn-flash')
  if (window.matchMedia('(prefers-reduced-motion: no-preference)').matches) {
    requestAnimationFrame(() => frame?.classList.add('turn-flash'))
  }
  canvas.setAttribute(
    'aria-label',
    `Rush Hour Crossing. ${state.lives} lives, ${state.crossings} of ${config.crossingsToWin} crossings, score ${state.score}, tick ${state.tick}, status ${state.status}.`,
  )
}

function renderAdviceNotice(notice: AdviceNotice | null): void {
  if (!notice) {
    adviceRegion.textContent = ''
    return
  }
  if (notice.kind === 'unavailable') {
    adviceRegion.textContent = 'AI advice is currently unavailable.'
    return
  }
  adviceRegion.textContent =
    'Previous run (' + notice.response.focus + '): ' +
    notice.response.evidence +
    ' Tip: ' +
    notice.response.nextTip
}

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector)
  if (!element) {
    throw new Error(`Required element ${selector} was not found.`)
  }
  return element
}
