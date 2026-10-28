export const AI_FAILOVER_ENABLE_ENV = 'AI_FAILOVER_ENABLED'
export const GEMINI_BACKUP_MODEL = 'gemini-2.5-flash'

export const GEMINI_BACKUP_PROFILE: ApprovedBackupProfile = Object.freeze({
  provider: 'gemini',
  model: GEMINI_BACKUP_MODEL,
  operations: Object.freeze(['generation', 'advice'] as const),
})

export const PRIMARY_PROVIDER_PROFILE = {
  provider: 'gemini',
  model: 'gemini-3.1-flash-lite',
} as const

export interface ApprovedBackupProfile {
  provider: 'gemini'
  model: typeof GEMINI_BACKUP_MODEL
  operations: readonly ('generation' | 'advice')[]
}

export interface ProviderConfig {
  enabled: boolean
  backupProfile?: ApprovedBackupProfile
}

export class ProviderConfigurationError extends Error {
  constructor() {
    super('AI failover configuration is invalid.')
    this.name = 'ProviderConfigurationError'
  }
}

export function readProviderConfig(
  env: Readonly<Record<string, string | undefined>>,
  approvedBackupProfile?: ApprovedBackupProfile,
): ProviderConfig {
  const enabledSetting = env[AI_FAILOVER_ENABLE_ENV]
  if (enabledSetting === undefined) return { enabled: false }
  if (enabledSetting === 'false') return { enabled: false }
  if (enabledSetting !== 'true' || !isApprovedBackupProfile(approvedBackupProfile) || !Boolean(env.GEMINI_API_KEY)) {
    throw new ProviderConfigurationError()
  }

  return { enabled: true, backupProfile: Object.freeze({
    provider: approvedBackupProfile.provider,
    model: approvedBackupProfile.model,
    operations: Object.freeze([...approvedBackupProfile.operations]),
  }) }
}

export function createProviderSet<T>(
  config: ProviderConfig,
  createBackup: (profile: ApprovedBackupProfile) => T,
): {
  enabled: boolean
  primaryProfile: typeof PRIMARY_PROVIDER_PROFILE
  backup?: T
} {
  if (!config.enabled) return { enabled: false, primaryProfile: PRIMARY_PROVIDER_PROFILE }
  if (!config.backupProfile) throw new ProviderConfigurationError()
  return {
    enabled: true,
    primaryProfile: PRIMARY_PROVIDER_PROFILE,
    backup: createBackup(config.backupProfile),
  }
}

function isApprovedBackupProfile(value: ApprovedBackupProfile | undefined): value is ApprovedBackupProfile {
  return value !== undefined &&
    value.provider === 'gemini' &&
    value.model === GEMINI_BACKUP_MODEL &&
    Array.isArray(value.operations) &&
    value.operations.length === 2 &&
    value.operations.includes('generation') &&
    value.operations.includes('advice')
}
