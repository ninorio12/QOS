import { describe, it, expect, vi } from 'vitest'

vi.mock('fs', () => ({
  readFileSync: (path: string) => {
    if (path.endsWith('openclaw.config.json')) {
      return JSON.stringify({
        gateway: { port: 18789, host: 'localhost' },
        agent: { model: 'anthropic/claude-opus-4-6', soul: '.agents/soren/SOUL.md' },
        sessions: {
          kai: { model: 'claude-sonnet-4-6', soul: '.agents/kai/SOUL.md' },
          mia: { model: 'claude-haiku-4-5-20251001', soul: '.agents/mia/SOUL.md' },
        },
        skills: {
          soren: ['ghl-pipeline', 'telegram-digest', 'sessions-delegate'],
          kai: ['twilio-sms', 'ghl-contacts'],
          mia: ['devis-generator', 'kb-sync'],
        },
      })
    }
    if (path.includes('SOUL.md')) return '# Agent soul'
    return ''
  },
}))

vi.stubEnv('ANTHROPIC_API_KEY', 'test-key')
vi.stubEnv('TELEGRAM_SOREN_TOKEN', 'tok-soren')
vi.stubEnv('TELEGRAM_KAI_TOKEN', 'tok-kai')
vi.stubEnv('TELEGRAM_MIA_TOKEN', 'tok-mia')
vi.stubEnv('TELEGRAM_GROUP_CHAT_ID', '-100123')
vi.stubEnv('OPENAI_API_KEY', 'oai-key')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_KEY', 'svc-key')
vi.stubEnv('VPS_DOMAIN', 'test.example.com')
vi.stubEnv('PORT', '18789')

describe('config', () => {
  it('loads gateway port from json', async () => {
    const { config } = await import('./config')
    expect(config.port).toBe(18789)
  })
  it('exposes agent tokens', async () => {
    const { config } = await import('./config')
    expect(config.telegram.sorenToken).toBe('tok-soren')
  })
  it('loads soul content for soren', async () => {
    const { config } = await import('./config')
    expect(config.agents.soren.soul).toContain('Agent soul')
  })
})
