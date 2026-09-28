export interface ServerConfig {
  host: '127.0.0.1'
  port: number
}

export const DEFAULT_PORT = 8787

const MIN_PORT = 1024
const MAX_PORT = 65535

/**
 * Reads the server settings from environment variables and validates them at runtime.
 * The host is fixed to the loopback address, so the server is never reachable from
 * another machine. The error message never repeats the rejected value.
 */
export function readServerConfig(env: Readonly<Record<string, string | undefined>>): ServerConfig {
  const raw = env.PORT
  if (raw === undefined || raw === '') {
    return { host: '127.0.0.1', port: DEFAULT_PORT }
  }

  const port = Number(raw)
  if (!/^\d+$/.test(raw) || !Number.isInteger(port) || port < MIN_PORT || port > MAX_PORT) {
    throw new Error(`Invalid PORT: expected an integer from ${MIN_PORT} to ${MAX_PORT}.`)
  }

  return { host: '127.0.0.1', port }
}

/** `Host` header values the server accepts; everything else is rejected (DNS-rebinding guard). */
export function allowedHostsFor(port: number): readonly string[] {
  return [`127.0.0.1:${port}`, `localhost:${port}`]
}
