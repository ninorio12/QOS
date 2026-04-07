import { Router } from 'express'
import * as fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'
import { config, type AgentName } from '../config'
import type { SessionManager } from '../sessions/SessionManager'

const supabase = createClient(config.supabase.url, config.supabase.serviceKey)

// From compiled gateway/dist/routes/soul.js, go up 3 levels to reach qos/.agents
const SOUL_DIR = path.join(__dirname, '../../../.agents')

export function makeSoulRouter(
  sessions: Record<AgentName, SessionManager>
): Router {
  const router = Router()

  // GET /agents/:agent/soul — return current soul content
  router.get('/:agent/soul', (req, res) => {
    const agent = req.params.agent as AgentName
    if (!sessions[agent]) { res.status(404).json({ error: 'Unknown agent' }); return }
    const soulPath = path.join(SOUL_DIR, agent, 'SOUL.md')
    const content = fs.readFileSync(soulPath, 'utf-8')
    res.json({ agent, content })
  })

  // POST /agents/:agent/soul — update soul (from SaaS or self-improvement)
  router.post('/:agent/soul', async (req, res) => {
    const agent = req.params.agent as AgentName
    if (!sessions[agent]) { res.status(404).json({ error: 'Unknown agent' }); return }

    const { content, author = 'thomas' } = req.body as { content?: string; author?: string }
    if (!content) { res.status(400).json({ error: 'Missing content' }); return }

    // Write to disk
    const soulPath = path.join(SOUL_DIR, agent, 'SOUL.md')
    fs.writeFileSync(soulPath, content, 'utf-8')

    // Update live session
    sessions[agent].updateSoul(content)

    // Save version to Supabase
    await supabase.from('soul_versions').insert({ agent, content, author })

    res.json({ ok: true, agent, author })
  })

  return router
}
