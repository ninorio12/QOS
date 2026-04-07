import 'dotenv/config'
import express from 'express'
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

  // ── Register Telegram webhooks (production only) ─────────────
  if (config.vpsDomain && process.env.NODE_ENV === 'production') {
    await Promise.all([
      bots.soren.setWebHook(`https://${config.vpsDomain}/webhooks/telegram/soren`),
      bots.kai.setWebHook(`https://${config.vpsDomain}/webhooks/telegram/kai`),
      bots.mia.setWebHook(`https://${config.vpsDomain}/webhooks/telegram/mia`),
    ])
    console.log('[gateway] Telegram webhooks registered')
  }

  // ── Express app ──────────────────────────────────────────────
  const app = express()
  app.use(express.json())

  app.use('/webhooks', makeWebhooksRouter(sessions))
  app.use('/sessions', makeSessionsRouter(sessions))
  app.use('/events',   makeEventsRouter())

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
