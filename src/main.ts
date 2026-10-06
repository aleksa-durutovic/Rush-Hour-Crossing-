import './style.css'
import { createAdviceController } from './advice/controller'
import { buildCompletedRunSummary } from './advice/summary'
import type { AdviceNotice } from './advice/lifecycle'
import { createHintController } from './hints/controller'
import { describeHintRouteStep, getHintMessage, HINT_LOADING_MESSAGE } from './hints/messages'
import { createHintSnapshot } from './hints/snapshot'
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
      <section id="hint-panel" class="hint-panel" aria-label="Safe-path hint">
        <button id="hint-toggle" class="hint-toggle" type="button">Hint</button>
        <div class="hint-content">
          <span class="hint-spinner" aria-hidden="true" hidden></span>
          <p id="hint-status" class="hint-status" role="status" aria-live="polite" aria-label="Hint status"></p>
          <ol id="hint-route" class="hint-route" aria-label="Verified route steps" hidden></ol>
        </div>
      </section>
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
const hintButton = requireElement<HTMLButtonElement>('#hint-toggle')
const hintPanel = requireElement<HTMLElement>('#hint-panel')
const hintStatus = requireElement<HTMLParagraphElement>('#hint-status')
const hintSpinner = requireElement<HTMLSpanElement>('.hint-spinner')
const hintRouteList = requireElement<HTMLOListElement>('#hint-route')
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
const hint = createHintController(() => render(false), () => createHintSnapshot(state, config))

if (usedFallback) {
  configAlert.hidden = false
  configAlert.textContent = `Invalid configuration: ${configResolution.invalidFields.join(', ')}. All defaults are active.`
}

for (const button of difficultyButtons) {
  button.addEventListener('click', () => selectDifficulty(button.dataset.difficulty))
}

hintButton.addEventListener('click', () => {
  const previousMode = hint.getState().mode
  hint.activate(createHintSnapshot(state, config))
  if (previousMode === 'visible' && hint.getState().mode === 'hidden') canvas.focus()
})

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
  const hintMode = hint.getState().mode
  if (hintMode === 'loading' || hintMode === 'visible') return

  if (command === 'restart') {
    hint.reset('restart')
    advice.reset('restart')
    state = restartGame(config)
  } else {
    const wasActive = state.status === 'active'
    const previousLives = state.lives
    state = applyAction(state, command, lanes)
    if (state.lives !== previousLives) hint.lifeChanged(state.lives)
    if (wasActive && state.status !== 'active') {
      const summary = buildCompletedRunSummary(state)
      if (summary) advice.complete(summary)
    }
  }
  render()
})

function selectDifficulty(value: string | undefined): void {
  const hintMode = hint.getState().mode
  if (hintMode === 'loading' || hintMode === 'visible') return
  const difficulty = DIFFICULTIES.find((candidate) => candidate === value)

  if (difficulty && difficulty !== config.difficulty) {
    hint.reset('difficulty')
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

function render(animateTurn = true): void {
  const hintState = hint.getState()
  const routeSteps =
    hintState.mode === 'visible' && hintState.notice?.kind === 'ready' && hintState.notice.response.outcome === 'verified'
      ? hintState.notice.response.steps
      : []
  renderGame(context, state, config, lanes, routeSteps)
  for (const button of difficultyButtons) {
    button.setAttribute('aria-pressed', String(button.dataset.difficulty === config.difficulty))
    button.disabled = hintState.mode === 'loading' || hintState.mode === 'visible'
  }
  const frame = canvas.closest<HTMLElement>('.board-frame')
  frame?.classList.remove('turn-flash')
  if (animateTurn && window.matchMedia('(prefers-reduced-motion: no-preference)').matches) {
    requestAnimationFrame(() => frame?.classList.add('turn-flash'))
  }
  canvas.setAttribute(
    'aria-label',
    `Rush Hour Crossing. ${state.lives} lives, ${state.crossings} of ${config.crossingsToWin} crossings, score ${state.score}, tick ${state.tick}, status ${state.status}.${routeSteps.length > 0 ? ` Verified route overlay from tick ${hintState.notice?.kind === 'ready' ? hintState.notice.response.origin.tick : state.tick}.` : ''}`,
  )
  renderHintState(hintState)
}

function renderHintState(hintState: ReturnType<typeof hint.getState>): void {
  const paused = hintState.mode === 'loading' || hintState.mode === 'visible'
  hintPanel.hidden = state.status !== 'active' && hintState.mode !== 'visible'
  hintButton.hidden = state.status !== 'active' && hintState.mode !== 'visible'
  hintButton.disabled = hintState.mode === 'loading' || (state.status !== 'active' && hintState.mode !== 'visible')
  hintButton.textContent = hintState.mode === 'visible' ? 'Hide hint' : 'Hint'
  hintButton.setAttribute('aria-pressed', String(hintState.mode === 'visible'))
  hintButton.dataset.paused = String(paused)
  hintSpinner.hidden = hintState.mode !== 'loading'
  hintRouteList.replaceChildren()

  if (hintState.mode === 'loading') {
    hintStatus.textContent = HINT_LOADING_MESSAGE
    hintRouteList.hidden = true
    return
  }
  if (hintState.mode !== 'visible' || !hintState.notice) {
    hintStatus.textContent = ''
    hintRouteList.hidden = true
    return
  }

  hintStatus.textContent = getHintMessage(hintState.notice, state.tick)
  if (hintState.notice.kind === 'ready' && hintState.notice.response.outcome === 'verified') {
    for (const [index, step] of hintState.notice.response.steps.entries()) {
      const item = document.createElement('li')
      item.textContent = describeHintRouteStep(step, index)
      hintRouteList.append(item)
    }
    hintRouteList.hidden = false
  } else {
    hintRouteList.hidden = true
  }
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
