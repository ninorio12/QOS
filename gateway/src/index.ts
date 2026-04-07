import 'dotenv/config'
import express from 'express'
import * as fs from 'fs'
import path from 'path'
import { config, type AgentName } from './config'
import { eventBus }               from './EventBus'
import { SessionManager }          from './sessions/SessionManager'
import {
  makeTelegramSendTool,
  makeSessionsSendTool,
  makeLogTool,
  type SessionsSendFn,
} from './sessions/tools'
import { bots }                   from './telegram/bots'
import { makeWebhooksRouter }     from './routes/webhooks'
import { makeSessionsRouter }     from './routes/sessions'
import { makeEventsRouter }       from './routes/events'
import { makeSoulRouter }         from './routes/soul'
import { ghlPipelineTool, ghlStaleLeadsTool, ghlUpdateStageTool } from './skills/ghl'
import { twilioSmsTool } from './skills/twilio'
import { initScheduler } from './cron/scheduler'

async function main() {
  // ── Init 3 agent sessions ────────────────────────────────────
  const sessions: Record<AgentName, SessionManager> = {
    soren: new SessionManager('soren'),
    kai:   new SessionManager('kai'),
    mia:   new SessionManager('mia'),
  }

  // sessions_send bridges agents — defined after sessions created to avoid circular dep
  const sessionsSend: SessionsSendFn = (agent, message) => sessions[agent].send(message)

  // Register the 3 core tools on each agent
  for (const [name, session] of Object.entries(sessions) as [AgentName, SessionManager][]) {
    const bot          = bots[name]
    const telegramTool = makeTelegramSendTool(name, bot)
    const sessionsTool = makeSessionsSendTool(sessionsSend)
    const logTool      = makeLogTool(name)
    session.registerTool('telegram_send',   telegramTool.definition,  telegramTool.executor)
    session.registerTool('sessions_send',   sessionsTool.definition,  sessionsTool.executor)
    session.registerTool('log_interaction', logTool.definition,       logTool.executor)
  }

  // ── Soren-only: update_soul tool (used in weekly self-improvement) ──
  const soulDir = path.join(__dirname, '../../.agents')
  sessions.soren.registerTool(
    'update_soul',
    {
      description: 'Apply an approved SOUL.md update to Kai or Mia — saves to disk and activates immediately',
      input_schema: {
        type: 'object' as const,
        properties: {
          agent:   { type: 'string', enum: ['kai', 'mia'], description: 'Which agent to update' },
          content: { type: 'string', description: 'Complete new SOUL.md content' },
        },
        required: ['agent', 'content'],
      },
    },
    async (input) => {
      const agent   = input.agent as 'kai' | 'mia'
      const content = String(input.content)
      fs.writeFileSync(path.join(soulDir, agent, 'SOUL.md'), content, 'utf-8')
      sessions[agent].updateSoul(content)
      const { createClient } = await import('@supabase/supabase-js')
      const sb = createClient(config.supabase.url, config.supabase.serviceKey)
      await sb.from('soul_versions').insert({ agent, content, author: 'soren' })
      return { ok: true, agent, message: `${agent} SOUL.md updated and active` }
    }
  )

  // ── Register agent-specific skills ───────────────────────────
  // Soren: GHL pipeline visibility
  sessions.soren.registerTool(ghlPipelineTool.name, ghlPipelineTool.definition, ghlPipelineTool.executor)
  sessions.soren.registerTool(ghlStaleLeadsTool.name, ghlStaleLeadsTool.definition, ghlStaleLeadsTool.executor)

  // Kai: GHL lead management + Twilio SMS
  sessions.kai.registerTool(ghlPipelineTool.name, ghlPipelineTool.definition, ghlPipelineTool.executor)
  sessions.kai.registerTool(ghlUpdateStageTool.name, ghlUpdateStageTool.definition, ghlUpdateStageTool.executor)
  sessions.kai.registerTool(twilioSmsTool.name, twilioSmsTool.definition, twilioSmsTool.executor)

  // ── Register Telegram webhooks (production only) ─────────────
  if (config.vpsDomain && process.env.NODE_ENV === 'production') {
    await Promise.all([
      bots.soren.setWebHook(`https://${config.vpsDomain}/webhooks/telegram/soren`),
      bots.kai.setWebHook(`https://${config.vpsDomain}/webhooks/telegram/kai`),
      bots.mia.setWebHook(`https://${config.vpsDomain}/webhooks/telegram/mia`),
    ])
    console.log('[gateway] Telegram webhooks registered')
  }

  // ── Initialize cron scheduler ────────────────────────────────
  initScheduler(sessions)

  // ── Express app ──────────────────────────────────────────────
  const app = express()
  app.use(express.json())

  app.use('/webhooks', makeWebhooksRouter(sessions))
  app.use('/sessions', makeSessionsRouter(sessions))
  app.use('/events',   makeEventsRouter())
  app.use('/agents',   makeSoulRouter(sessions))

  app.get('/health', (_req, res) => {
    res.json({ ok: true, agents: Object.keys(sessions), uptime: process.uptime() })
  })

  app.listen(config.port, () => {
    console.log(`[gateway] OpenClaw Gateway running on port ${config.port}`)
    eventBus.emit({
      type:      'connected',
      from:      'gateway',
      to:        'all',
      msg:       'Gateway started',
      timestamp: new Date().toISOString(),
    })
  })
}

main().catch(console.error)
