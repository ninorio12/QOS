import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL

interface AgentHealth {
  online:      boolean
  activeTools: string[]
}

function offlineStatus() {
  const offline: AgentHealth = { online: false, activeTools: [] }
  return {
    ok:     false,
    uptime: 0,
    agents: { vividflow: offline, kai: offline, mia: offline },
  }
}

export async function GET() {
  if (!GATEWAY_URL) return NextResponse.json(offlineStatus())

  try {
    const res = await fetch(`${GATEWAY_URL}/health`, {
      next:   { revalidate: 0 },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return NextResponse.json(offlineStatus())
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json(offlineStatus())
  }
}
