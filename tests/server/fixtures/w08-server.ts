import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import type { GenerateContentParameters, GoogleGenAI as GeminiClient } from '@google/genai'
import { createGeminiBackupAdapters, createGeminiGeneratorModel, createGeminiProvider } from '../../../server/advice/gemini-provider'
import type { ProviderInput } from '../../../server/advice/service'
import { createAdviceService } from '../../../server/advice/service'
import type { FailoverEvidenceEvent } from '../../../server/ai/failover-policy'
import { createProviderSet, GEMINI_BACKUP_PROFILE, readProviderConfig } from '../../../server/ai/provider-config'
import { createRequestHandler } from '../../../server/app'
import { createAdmissionController } from '../../../server/security/admission'
import { createProviderAttemptBudget } from '../../../server/security/provider-attempt-budget'
import { createSecurityEventStore, type SecurityEvent } from '../../../server/security/events'
import { allowedHostsFor } from '../../../server/config'
import type { GeneratorDecisionContext } from '../../../server/level-generator/model'
import { createLevelGeneratorService } from '../../../server/level-generator/service'
import { createSolveLevelTool, type SolveLevelToolInput, type SolveLevelToolOutput } from '../../../server/level-generator/solve-tool'
import { W08_SYNTHETIC_SECRET, normalGeneratorDecision } from '../../security/fixtures'
import type { ModelDecision } from '../../../shared/level-generator-contract'

export interface W08SdkCall {
  index: number
  model: string
  request: GenerateContentParameters
  operation: 'generation' | 'advice'
  context: unknown
}

export interface W08ServerOptions {
  port?: number
  providerAttemptLimit?: number
  staticDir?: string
  failoverEnabled?: boolean
  apiKey?: string
  now?: () => number
  decide?: (context: GeneratorDecisionContext, index: number) => ModelDecision | unknown | Promise<ModelDecision | unknown>
  nextTip?: string | ((input: ProviderInput, index: number) => string)
  generateContent?: (call: W08SdkCall) => unknown | Promise<unknown>
  transformSolverOutput?: (output: SolveLevelToolOutput) => unknown
  onSecurityEvent?: (event: SecurityEvent) => void
}

export interface W08ServerFixture {
  server: Server
  origin: string
  port: number
  sdkCalls: W08SdkCall[]
  receivedApiKeys: string[]
  modelContexts: unknown[]
  solverStarts: SolveLevelToolInput[]
  failoverEvents: FailoverEvidenceEvent[]
  securityEvents: SecurityEvent[]
  close(): Promise<void>
}

/**
 * Test-only composition of the production handler, provider adapters, services, strict
 * validation, and actual solver. It never invokes loadServerEnvironment or a real SDK client.
 */
export async function startW08Server(options: W08ServerOptions = {}): Promise<W08ServerFixture> {
  const apiKey = options.apiKey ?? W08_SYNTHETIC_SECRET
  const sdkCalls: W08SdkCall[] = []
  const receivedApiKeys: string[] = []
  const modelContexts: unknown[] = []
  const solverStarts: SolveLevelToolInput[] = []
  const failoverEvents: FailoverEvidenceEvent[] = []
  const securityEvents: SecurityEvent[] = []
  const securityEventStore = createSecurityEventStore({ onEvent: (event) => { securityEvents.push(event); options.onSecurityEvent?.(event) } })
  let generatorDecisionIndex = 0
  let adviceCallIndex = 0

  const createClient = (receivedKey: string): Pick<GeminiClient, 'models'> => {
    receivedApiKeys.push(receivedKey)
    return {
      models: {
        generateContent: async (request: GenerateContentParameters) => {
          const context = parseContents(request.contents)
          const operation = isGeneratorContext(context) ? 'generation' : 'advice'
          const call: W08SdkCall = {
            index: sdkCalls.length + 1,
            model: request.model,
            request,
            operation,
            context,
          }
          sdkCalls.push(call)
          modelContexts.push(context)

          if (options.generateContent) return await options.generateContent(call) as never
          if (operation === 'generation') {
            const decision = await (options.decide ?? normalGeneratorDecision)(
              context as GeneratorDecisionContext,
              generatorDecisionIndex++,
            )
            return { text: JSON.stringify({ decision }) } as never
          }

          const input = context as ProviderInput
          const tip = typeof options.nextTip === 'function'
            ? options.nextTip(input, adviceCallIndex)
            : options.nextTip
          adviceCallIndex += 1
          return { text: JSON.stringify({ nextTip: tip ?? 'Wait for a clear gap.' }) } as never
        },
      } as unknown as Pick<GeminiClient, 'models'>['models'],
    }
  }

  const syntheticEnvironment = {
    AI_FAILOVER_ENABLED: options.failoverEnabled ? 'true' : 'false',
    GEMINI_API_KEY: apiKey,
  }
  const providerConfig = readProviderConfig(syntheticEnvironment, GEMINI_BACKUP_PROFILE)
  const providerSet = createProviderSet(providerConfig, () => createGeminiBackupAdapters({ apiKey, createClient }))
  const backup = providerSet.backup
  const now = options.now ?? (() => performance.now())
  const adviceService = createAdviceService(createGeminiProvider({ apiKey, createClient }), {
    enabled: providerSet.enabled,
    backupProvider: backup?.advice,
    now,
    wait: async () => {},
    onEvidence: (event) => failoverEvents.push(event),
  })
  const realSolver = createSolveLevelTool({ now })
  const solver = {
    searchFactory: realSolver.searchFactory,
    async execute(input: SolveLevelToolInput) {
      solverStarts.push(input)
      const output = await realSolver.execute(input)
      return (options.transformSolverOutput?.(output) ?? output) as SolveLevelToolOutput
    },
  }
  const generationService = createLevelGeneratorService({
    model: createGeminiGeneratorModel({ apiKey, createClient }),
    backupModel: backup?.generator,
    failoverEnabled: providerSet.enabled,
    solver,
    now,
    waitBeforeRetry: async () => {},
    onEvidence: (event) => failoverEvents.push(event),
  })

  const server = createServer()
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(options.port ?? 0, '127.0.0.1', () => {
      server.off('error', reject)
      resolve()
    })
  })

  const port = (server.address() as AddressInfo).port
  server.on('request', createRequestHandler({
    allowedHosts: allowedHostsFor(port),
    admissionController: createAdmissionController({
      now,
      ...(options.providerAttemptLimit === undefined
        ? {}
        : { providerAttemptBudget: createProviderAttemptBudget(options.providerAttemptLimit) }),
    }),
    securityEvents: securityEventStore,
    staticDir: options.staticDir,
    adviceService,
    generationService,
  }))

  return {
    server,
    origin: `http://127.0.0.1:${port}`,
    port,
    sdkCalls,
    receivedApiKeys,
    modelContexts,
    solverStarts,
    failoverEvents,
    securityEvents,
    async close() {
      server.closeAllConnections()
      await new Promise<void>((resolve, reject) => {
        server.close((error) => error ? reject(error) : resolve())
      })
    },
  }
}

function parseContents(contents: GenerateContentParameters['contents']): unknown {
  if (typeof contents !== 'string') return null
  try {
    return JSON.parse(contents) as unknown
  } catch {
    return null
  }
}

function isGeneratorContext(value: unknown): value is GeneratorDecisionContext {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const context = value as Record<string, unknown>
  return typeof context.runId === 'string' && typeof context.request === 'object'
}
