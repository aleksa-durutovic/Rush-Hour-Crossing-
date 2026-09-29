import { existsSync } from 'node:fs'
import { createServer } from 'node:http'
import { join, resolve } from 'node:path'
import { createRequestHandler } from './app'
import { createGeminiProvider } from './advice/gemini-provider'
import { createAdviceService } from './advice/service'
import { loadServerEnvironment } from './environment'
import { allowedHostsFor, readServerConfig } from './config'

function main(): void {
  loadServerEnvironment()
  const config = readServerConfig(process.env)
  const adviceService = createAdviceService(createGeminiProvider())
  const staticDir = process.argv.includes('--serve-dist') ? resolve('dist') : undefined

  if (staticDir && !existsSync(join(staticDir, 'index.html'))) {
    throw new Error('dist/index.html was not found. Run "npm run build" first.')
  }

  const server = createServer(createRequestHandler({ allowedHosts: allowedHostsFor(config.port), staticDir, adviceService }))

  server.on('error', (error) => {
    console.error(`Server error: ${error.message}`)
    process.exitCode = 1
  })

  server.listen(config.port, config.host, () => {
    const mode = staticDir ? 'game and API' : 'API only'
    console.log(`Rush Hour Crossing server (${mode}) on http://${config.host}:${config.port}`)
  })
}

try {
  main()
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Server failed to start.')
  process.exitCode = 1
}
