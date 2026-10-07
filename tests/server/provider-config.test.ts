import { describe, expect, it, vi } from 'vitest'
import {
  ProviderConfigurationError,
  GEMINI_BACKUP_PROFILE,
  createProviderSet,
  readProviderConfig,
  type ApprovedBackupProfile,
} from '../../server/ai/provider-config'

const approvedProfile: ApprovedBackupProfile = GEMINI_BACKUP_PROFILE

describe('server-only backup profile configuration', () => {
  it('defaults to disabled and does not construct a backup adapter', () => {
    const config = readProviderConfig({})
    const createBackup = vi.fn(() => ({ name: 'backup' }))
    const providers = createProviderSet(config, createBackup)

    expect(config.enabled).toBe(false)
    expect(providers.backup).toBeUndefined()
    expect(createBackup).not.toHaveBeenCalled()
  })

  it('keeps explicit false disabled even when a backup profile is present', () => {
    const config = readProviderConfig({ AI_FAILOVER_ENABLED: 'false' }, approvedProfile)
    const createBackup = vi.fn(() => ({ name: 'backup' }))
    expect(createProviderSet(config, createBackup).backup).toBeUndefined()
    expect(createBackup).not.toHaveBeenCalled()
  })

  it.each(['yes', 'TRUE', '1', 'secret-setting'])('rejects unsupported enablement value %j without echoing it', value => {
    expect(() => readProviderConfig({ AI_FAILOVER_ENABLED: value }, approvedProfile))
      .toThrow(ProviderConfigurationError)
    try {
      readProviderConfig({ AI_FAILOVER_ENABLED: value }, approvedProfile)
    } catch (error) {
      expect((error as Error).message).not.toContain(value)
    }
  })

  it('rejects an empty explicit enablement value', () => {
    expect(() => readProviderConfig({ AI_FAILOVER_ENABLED: '' }, approvedProfile))
      .toThrow(ProviderConfigurationError)
  })

  it('fails closed before provider construction when enabled without an approved profile', () => {
    const createBackup = vi.fn(() => ({ name: 'backup' }))
    expect(() => readProviderConfig({ AI_FAILOVER_ENABLED: 'true' })).toThrow(ProviderConfigurationError)
    expect(createBackup).not.toHaveBeenCalled()
  })

  it('fails closed before provider work when enabled without configured Gemini access', () => {
    expect(() => readProviderConfig({ AI_FAILOVER_ENABLED: 'true' }, approvedProfile))
      .toThrow(ProviderConfigurationError)
    expect(readProviderConfig({ AI_FAILOVER_ENABLED: 'false' }, undefined)).toMatchObject({ enabled: false })
  })

  it('requires one Gemini profile with both approved operation capabilities', () => {
    expect(() => readProviderConfig({ AI_FAILOVER_ENABLED: 'true' }, {
      ...approvedProfile,
      operations: ['generation'],
    })).toThrow(ProviderConfigurationError)
  })

  it('constructs a single backup only after enabled configuration is fully validated', () => {
    const config = readProviderConfig({ AI_FAILOVER_ENABLED: 'true', GEMINI_API_KEY: 'fake-only' }, approvedProfile)
    const createBackup = vi.fn(() => ({ name: 'backup' }))

    expect(createProviderSet(config, createBackup)).toEqual({
      enabled: true,
      primaryProfile: { provider: 'gemini', model: 'gemini-3.1-flash-lite' },
      backup: { name: 'backup' },
    })
    expect(createBackup).toHaveBeenCalledOnce()
  })
})
