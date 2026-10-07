import './style.css'
import { createAdviceController } from './advice/controller'
import { buildCompletedRunSummary } from './advice/summary'
import type { AdviceNotice } from './advice/lifecycle'
import { buildDifficultySearch } from './config/difficulty-query'
import { DIFFICULTIES, resolveGameConfig } from './config/game-config'
import { DIFFICULTY_PRESETS } from './config/presets'
import { createInitialState, restartGame, type LaneDefinition } from './game/state'
import { applyAction } from './game/turn'
import { mapKeyboardEvent } from './input/keyboard'
import { configureCanvas, renderGame } from './render/canvas'
import { createLevelGeneratorController } from './level-generator/controller'
import type { LevelGeneratorLifecycle, VerifiedLevelPreview } from './level-generator/lifecycle'

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
        <p id="generated-active" class="generated-active" hidden>Generated level active</p>
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

    <section id="level-generator" class="level-generator" aria-labelledby="generator-title">
      <h2 id="generator-title">Build a verified challenge</h2>
      <p class="level-generator__intro">Choose a challenge rating from 1 to 5. The level is checked before you decide to play.</p>
      <div class="level-generator__controls">
        <label for="target-rating">Target challenge rating</label>
        <select id="target-rating">
          <option value="1">1 — Light</option><option value="2">2</option><option value="3" selected>3 — Balanced</option><option value="4">4</option><option value="5">5 — Tough</option>
        </select>
        <button id="generate-level" type="button">Generate level</button>
        <button id="cancel-generation" type="button" hidden>Cancel</button>
      </div>
      <p id="generation-status" class="level-generator__status" role="status" aria-live="polite" aria-label="Level generation status"></p>
      <div id="generated-preview" class="level-generator__preview" hidden>
        <div>
          <p class="level-generator__source">Five traffic lanes</p>
          <canvas id="preview-canvas" aria-hidden="true"></canvas>
        </div>
        <div id="preview-metrics" class="level-generator__metrics"></div>
        <button id="play-generated-level" type="button">Play this level</button>
      </div>
    </section>
  </main>
`

const canvas = requireElement<HTMLCanvasElement>('#game-canvas')
const configAlert = requireElement<HTMLParagraphElement>('#config-alert')
const adviceRegion = requireElement<HTMLParagraphElement>('#ai-advice')
const ratingSelect = requireElement<HTMLSelectElement>('#target-rating')
const generateButton = requireElement<HTMLButtonElement>('#generate-level')
const cancelButton = requireElement<HTMLButtonElement>('#cancel-generation')
const generationStatus = requireElement<HTMLParagraphElement>('#generation-status')
const generatedPreview = requireElement<HTMLDivElement>('#generated-preview')
const previewCanvas = requireElement<HTMLCanvasElement>('#preview-canvas')
const previewMetrics = requireElement<HTMLDivElement>('#preview-metrics')
const playGeneratedButton = requireElement<HTMLButtonElement>('#play-generated-level')
const generatedActive = requireElement<HTMLParagraphElement>('#generated-active')
const difficultyButtons = Array.from(
  document.querySelectorAll<HTMLButtonElement>('#difficulty-switch button[data-difficulty]'),
)
const context = configureCanvas(canvas)
const configResolution = resolveGameConfig(new URLSearchParams(window.location.search))
let config = configResolution.config
let lanes = DIFFICULTY_PRESETS[config.difficulty]
let activeOrigin: 'preset' | 'generated' = 'preset'
let usedFallback = configResolution.usedFallback
let state = restartGame(config)
const advice = createAdviceController(renderAdviceNotice)
const generator = createLevelGeneratorController(renderGenerator)
const previewContext = configureCanvas(previewCanvas)

if (usedFallback) {
  configAlert.hidden = false
  configAlert.textContent = `Invalid configuration: ${configResolution.invalidFields.join(', ')}. All defaults are active.`
}

for (const button of difficultyButtons) {
  button.addEventListener('click', () => selectDifficulty(button.dataset.difficulty))
}

generateButton.addEventListener('click', () => {
  const targetDifficulty = Number(ratingSelect.value)
  generator.generate({ targetDifficulty, lives: config.lives, crossingsToWin: config.crossingsToWin })
})
cancelButton.addEventListener('click', () => generator.cancel())
playGeneratedButton.addEventListener('click', () => {
  const selection = generator.play({ lives: config.lives, crossingsToWin: config.crossingsToWin })
  if (!selection) return
  advice.reset('generated')
  activeOrigin = 'generated'
  lanes = selection.lanes as LaneDefinition[]
  config = { ...config, lives: selection.settings.lives, crossingsToWin: selection.settings.crossingsToWin }
  state = restartGame(config)
  render()
  canvas.focus()
})

render()
canvas.focus()

window.addEventListener('keydown', (event) => {
  if (
    event.target instanceof Element &&
    (event.target.closest('#difficulty-switch, #level-generator') ||
      event.target.closest('input, select, textarea, button, [contenteditable="true"]'))
  ) {
    return
  }

  const command = mapKeyboardEvent(event)
  if (!command) {
    return
  }

  event.preventDefault()
    if (command === 'restart') {
      advice.reset('restart')
      generator.invalidate()
      state = restartGame(config)
  } else {
    const wasActive = state.status === 'active'
    state = applyAction(state, command, lanes)
    if (wasActive && state.status !== 'active') {
      const summary = buildCompletedRunSummary(state, activeOrigin)
      if (summary) advice.complete(summary)
    }
  }
  render()
})

function selectDifficulty(value: string | undefined): void {
  const difficulty = DIFFICULTIES.find((candidate) => candidate === value)

  if (difficulty && (activeOrigin === 'generated' || difficulty !== config.difficulty)) {
    advice.reset('difficulty')
    generator.invalidate()
    activeOrigin = 'preset'
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
  generatedActive.hidden = activeOrigin !== 'generated'
  for (const button of difficultyButtons) {
    button.setAttribute('aria-pressed', String(activeOrigin === 'preset' && button.dataset.difficulty === config.difficulty))
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

function renderGenerator(generatorState: LevelGeneratorLifecycle): void {
  generationStatus.textContent = generatorState.status === 'running'
    ? 'Generating and verifying your level…'
    : generatorState.status === 'ready'
      ? 'Verified level ready to preview. Choose Play this level when you are ready.'
      : generatorState.message ?? ''
  generateButton.disabled = generatorState.status === 'running'
  cancelButton.hidden = generatorState.status !== 'running'
  generatedPreview.hidden = generatorState.status !== 'ready' || !generatorState.preview

  const preview = generatorState.preview
  if (!preview || generatorState.status !== 'ready') return
  renderGame(previewContext, createInitialState({
    lives: preview.settings.lives,
    crossingsToWin: preview.settings.crossingsToWin,
    difficulty: config.difficulty,
  }), { lives: preview.settings.lives, crossingsToWin: preview.settings.crossingsToWin, difficulty: config.difficulty }, preview.lanes)
  renderPreviewMetrics(preview)
}

function renderPreviewMetrics(preview: VerifiedLevelPreview): void {
  const values = [
    `Requested rating ${preview.requestedDifficulty}`,
    `Measured rating ${preview.computedDifficulty}`,
    `Minimum safe first crossing: ${preview.measurements.firstCrossingMinMoves} moves`,
    `Minimum full win: ${preview.measurements.minMoves} moves`,
    `Source: ${preview.source === 'generated' ? 'Generated and verified' : preview.source === 'last_verified' ? 'Previously verified level' : 'Verified template'}`,
  ]
  previewMetrics.replaceChildren(...values.map((value) => {
    const item = document.createElement('p')
    item.textContent = value
    return item
  }))
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
