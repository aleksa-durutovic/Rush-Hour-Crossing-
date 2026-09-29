import { existsSync } from 'node:fs'

export function loadServerEnvironment(envPath = '.env'): void {
  if (existsSync(envPath)) {
    process.loadEnvFile(envPath)
  }
}
