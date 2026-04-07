import { readFileSync } from 'fs'
import path from 'path'

function require_env(key: string): string {
  const val = process.env[key]
  if (!val) throw new Error(`Missing required env var: ${key}`)
  return val
}

const rawConfig = JSON.parse(
  readFileSync(path.join(__dirname, '../../openclaw.config.json'), 'utf-8')
)

function loadSoul(soulPath: string): string {
  return readFileSync(path.join(__dirname, '../..', soulPath), 'utf-8')
}

export const config = {
  port: parseInt(process.env.PORT ?? String(rawConfig.gateway.port), 10),
  anthropicKey: require_env('ANTHROPIC_API_KEY'),
  openaiKey: require_env('OPENAI_API_KEY'),
  telegram: {
    sorenToken: require_env('TELEGRAM_SOREN_TOKEN'),
    kaiToken:   require_env('TELEGRAM_KAI_TOKEN'),
    miaToken:   require_env('TELEGRAM_MIA_TOKEN'),
    groupChatId: require_env('TELEGRAM_GROUP_CHAT_ID'),
  },
  supabase: {
    url:        require_env('SUPABASE_URL'),
    serviceKey: require_env('SUPABASE_SERVICE_KEY'),
  },
  vpsDomain: process.env.VPS_DOMAIN ?? '',
  agents: {
    soren: {
      model: rawConfig.agent.model.replace('anthropic/', ''),
      soul:  loadSoul(rawConfig.agent.soul),
      skills: rawConfig.skills.soren as string[],
    },
    kai: {
      model: rawConfig.sessions.kai.model,
      soul:  loadSoul(rawConfig.sessions.kai.soul),
      skills: rawConfig.skills.kai as string[],
    },
    mia: {
      model: rawConfig.sessions.mia.model,
      soul:  loadSoul(rawConfig.sessions.mia.soul),
      skills: rawConfig.skills.mia as string[],
    },
  },
} as const

export type AgentName = 'soren' | 'kai' | 'mia'
