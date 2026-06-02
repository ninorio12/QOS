import { NextRequest } from 'next/server'
import { getAuthContext } from '@/lib/auth-context'
import { runAgent, type AgentMessage } from '@/lib/agents/runner'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const VALID_AGENTS = ['vividflow', 'kai', 'mia'] as const
type ValidAgent = typeof VALID_AGENTS[number]

export async function POST(
  req: NextRequest,
  { params }: { params: { agent: string } },
) {
  const ctx = await getAuthContext()
  if (!ctx) return Response.json({ error: 'Non autorisé' }, { status: 401 })

  const agentId = params.agent as ValidAgent
  if (!VALID_AGENTS.includes(agentId)) {
    return Response.json({ error: `Agent inconnu: ${agentId}` }, { status: 400 })
  }

  const { message, history } = await req.json() as {
    message: string
    history?: AgentMessage[]
  }

  if (!message?.trim()) {
    return Response.json({ error: 'Message requis' }, { status: 400 })
  }

  const creds = { apiKey: ctx.ghlApiKey, locationId: ctx.ghlLocationId }

  const result = await runAgent(agentId, message, creds, ctx.orgId, history ?? [])

  return Response.json({
    agent:      agentId,
    response:   result.response,
    toolsUsed:  result.toolsUsed,
    tokensUsed: result.tokensUsed,
  })
}
