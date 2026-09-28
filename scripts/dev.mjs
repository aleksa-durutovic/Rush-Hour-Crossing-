// Starts the Vite dev server and the API server together. Ctrl+C stops both.
import { spawn } from 'node:child_process'

const commands = [
  ['node_modules/vite/bin/vite.js'],
  ['node_modules/tsx/dist/cli.mjs', 'watch', '--clear-screen=false', 'server/index.ts'],
]

const children = commands.map((args) => spawn(process.execPath, args, { stdio: 'inherit' }))
let stopping = false

function stopAll(exitCode) {
  if (stopping) {
    return
  }
  stopping = true
  process.exitCode = exitCode
  for (const child of children) {
    if (child.exitCode === null) {
      child.kill()
    }
  }
}

for (const child of children) {
  child.on('exit', (code) => stopAll(code ?? 0))
}

process.on('SIGINT', () => stopAll(0))
process.on('SIGTERM', () => stopAll(0))
