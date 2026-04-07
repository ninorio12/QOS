import { Router } from 'express'
import type { SessionManager } from '../sessions/SessionManager'
import { bots }         from '../telegram/bots'
import { routeMessage } from '../telegram/router'
import { config, type AgentName } from '../config'

const AGENT_TOKENS: Record<AgentName, string> = {
  soren: config.telegram.sorenToken,
  kai:   config.telegram.kaiToken,
  mia:   config.telegram.miaToken,
}

export function makeWebhooksRouter(
  sessions: Record<AgentName, SessionManager>
): Router {
  const router = Router()

  router.post('/telegram/:agent', async (req, res) => {
    const agent = req.params.agent as AgentName
    if (!sessions[agent]) { res.sendStatus(404); return }

    // Telegram expects 200 immediately, then process async
    res.sendStatus(200)

    const update = req.body
    if (!update.message) return

    const token = AGENT_TOKENS[agent]
    const text  = await routeMessage(update.message, token)
    if (!text) return

    // Soren is the primary receiver — all group messages go to Soren
    // Soren routes to Kai/Mia via sessions_send tool when needed
    if (agent === 'soren') {
      await sessions.soren.send(text).catch(err =>
        console.error('[webhook] Soren send error:', err)
      )
    }
  })

  return router
}
