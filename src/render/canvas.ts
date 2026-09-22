import { GRID_COLUMNS, GRID_ROWS } from '../game/constants'
import type { GameConfig, GameState, LaneDefinition } from '../game/state'
import { getVehicleCells } from '../game/traffic'

export const CELL_SIZE = 64
export const HUD_HEIGHT = 72
export const CANVAS_WIDTH = GRID_COLUMNS * CELL_SIZE
export const CANVAS_HEIGHT = GRID_ROWS * CELL_SIZE + HUD_HEIGHT

const COLORS = {
  ink: '#17212b',
  surface: '#f7fbfa',
  goal: '#6fcf97',
  start: '#9dc7c8',
  roadA: '#44515d',
  roadB: '#394650',
  laneMark: '#dce8e5',
  player: '#ffe66d',
  playerDetail: '#17212b',
  vehicles: ['#f45b4f', '#65b8d0', '#f29e4c', '#9b7ede', '#e76f9a'],
} as const

export function configureCanvas(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  canvas.width = CANVAS_WIDTH
  canvas.height = CANVAS_HEIGHT
  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('Canvas 2D context is not available.')
  }

  return context
}

export function renderGame(
  context: CanvasRenderingContext2D,
  state: GameState,
  config: GameConfig,
  lanes: readonly LaneDefinition[],
): void {
  drawHud(context, state, config)
  drawBoard(context, state, lanes)
  drawEndState(context, state)
}

function drawHud(context: CanvasRenderingContext2D, state: GameState, config: GameConfig): void {
  context.fillStyle = COLORS.surface
  context.fillRect(0, 0, CANVAS_WIDTH, HUD_HEIGHT)
  context.fillStyle = COLORS.ink
  context.font = '700 18px Consolas, monospace'
  context.textBaseline = 'middle'
  context.fillText(`LIVES ${state.lives}`, 20, 26)
  context.fillText(`CROSSINGS ${state.crossings}/${config.crossingsToWin}`, 172, 26)
  context.fillText(`SCORE ${state.score}`, 410, 26)
  context.font = '700 12px Consolas, monospace'
  context.fillStyle = '#315f68'
  context.fillText(`TICK ${state.tick}  ·  ${config.difficulty.toUpperCase()} TRAFFIC`, 20, 54)
}

function drawBoard(
  context: CanvasRenderingContext2D,
  state: GameState,
  lanes: readonly LaneDefinition[],
): void {
  for (let row = 0; row < GRID_ROWS; row += 1) {
    const y = HUD_HEIGHT + row * CELL_SIZE
    context.fillStyle = row === 0 ? COLORS.goal : row === 6 ? COLORS.start : row % 2 ? COLORS.roadA : COLORS.roadB
    context.fillRect(0, y, CANVAS_WIDTH, CELL_SIZE)

    if (row > 0 && row < 6) {
      context.strokeStyle = COLORS.laneMark
      context.globalAlpha = 0.24
      context.setLineDash([16, 14])
      context.beginPath()
      context.moveTo(0, y + CELL_SIZE - 1)
      context.lineTo(CANVAS_WIDTH, y + CELL_SIZE - 1)
      context.stroke()
      context.setLineDash([])
      context.globalAlpha = 1
    }
  }

  drawLaneDirections(context, lanes)
  drawVehicles(context, state.tick, lanes)
  drawPlayer(context, state)
}

function drawLaneDirections(context: CanvasRenderingContext2D, lanes: readonly LaneDefinition[]): void {
  context.font = '700 15px Consolas, monospace'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillStyle = COLORS.laneMark
  context.globalAlpha = 0.42

  for (const lane of lanes) {
    const symbol = lane.direction === 'right' ? '›' : '‹'
    const y = HUD_HEIGHT + lane.row * CELL_SIZE + CELL_SIZE / 2
    for (let column = 0; column < GRID_COLUMNS; column += 1) {
      context.fillText(symbol, column * CELL_SIZE + CELL_SIZE / 2, y)
    }
  }

  context.globalAlpha = 1
  context.textAlign = 'start'
}

function drawVehicles(
  context: CanvasRenderingContext2D,
  tick: number,
  lanes: readonly LaneDefinition[],
): void {
  lanes.forEach((lane, laneIndex) => {
    for (const initialColumn of lane.vehicleStarts) {
      const cells = getVehicleCells(lane, tick, initialColumn)
      const groups = groupContiguousCells(cells)
      const frontColumn = lane.direction === 'right' ? cells.at(-1) : cells[0]

      for (const group of groups) {
        const x = group[0] * CELL_SIZE + 5
        const y = HUD_HEIGHT + lane.row * CELL_SIZE + 12
        const width = group.length * CELL_SIZE - 10
        context.fillStyle = COLORS.vehicles[laneIndex % COLORS.vehicles.length]
        roundedRect(context, x, y, width, CELL_SIZE - 24, 8)
        context.fill()

        if (frontColumn !== undefined && group.includes(frontColumn)) {
          context.fillStyle = COLORS.surface
          const windowX = lane.direction === 'right' ? x + width - 19 : x + 8
          context.fillRect(windowX, y + 8, 11, 9)
        }
      }
    }
  })
}

function groupContiguousCells(cells: readonly number[]): number[][] {
  const groups: number[][] = []

  for (const column of cells) {
    const current = groups.at(-1)
    if (!current || column !== current[current.length - 1]! + 1) {
      groups.push([column])
    } else {
      current.push(column)
    }
  }

  return groups
}

function drawPlayer(context: CanvasRenderingContext2D, state: GameState): void {
  const x = state.player.x * CELL_SIZE + 14
  const y = HUD_HEIGHT + state.player.y * CELL_SIZE + 10
  context.fillStyle = COLORS.player
  roundedRect(context, x, y, CELL_SIZE - 28, CELL_SIZE - 20, 10)
  context.fill()
  context.fillStyle = COLORS.playerDetail
  context.fillRect(x + 7, y + 10, 6, 6)
  context.fillRect(x + 23, y + 10, 6, 6)
}

function drawEndState(context: CanvasRenderingContext2D, state: GameState): void {
  if (state.status === 'active') {
    return
  }

  context.fillStyle = 'rgba(23, 33, 43, 0.84)'
  context.fillRect(0, HUD_HEIGHT, CANVAS_WIDTH, GRID_ROWS * CELL_SIZE)
  context.fillStyle = state.status === 'won' ? COLORS.goal : '#ff8a80'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.font = '800 42px Trebuchet MS, sans-serif'
  context.fillText(state.status === 'won' ? 'CROSSING COMPLETE' : 'RUSH HOUR WINS', CANVAS_WIDTH / 2, 290)
  context.fillStyle = COLORS.surface
  context.font = '700 18px Consolas, monospace'
  context.fillText('PRESS R TO RESTART', CANVAS_WIDTH / 2, 338)
  context.textAlign = 'start'
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  context.beginPath()
  context.roundRect(x, y, width, height, radius)
}
