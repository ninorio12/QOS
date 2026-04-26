import { NextRequest, NextResponse } from 'next/server'
import { voiceProvider, elevenlabs } from '@/lib/elevenlabs'
import { log } from '@/lib/logger'
import { getAuthContext } from '@/lib/auth-context'
import crypto from 'crypto'

// ── Standard output shape ─────────────────────────────────────────────────────
type VoiceCallResult = {
  provider:  'elevenlabs' | 'legacy'
  call_id:   string
  status:    'queued' | 'started' | 'error'
  trace_id:  string
  error?:    string
}

// ── Legacy stub — Vapi is browser-side, no server outbound ───────────────────
function legacyCall(traceId: string): VoiceCallResult {
  // Vapi calls are initiated from the browser SDK (VapiCall.tsx / TestTab.tsx).
  // Server-side legacy = ack only; the client handles the actual WebRTC call.
  return {
    provider: 'legacy',
    call_id:  `legacy-${traceId}`,
    status:   'queued',
    trace_id: traceId,
  }
}

// ── Handler ───────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const trace_id = crypto.randomBytes(6).toString('hex')

  const ctx = await getAuthContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as {
    phone_number?: string
    contact_id?:  string
    conversation_id?: string
    metadata?:    Record<string, string>
  }

  const provider = voiceProvider()

  log.ok('voice_call_trigger', {
    trace_id,
    contact_id: body.contact_id,
    stage:      'voice',
    detail:     `provider=${provider} phone=${body.phone_number ?? 'none'}`,
  })

  // ── Legacy path ───────────────────────────────────────────────────────────
  if (provider === 'legacy') {
    const result = legacyCall(trace_id)
    log.ok('voice_call_legacy_ack', { trace_id, contact_id: body.contact_id, stage: 'voice' })
    return NextResponse.json(result)
  }

  // ── ElevenLabs path ───────────────────────────────────────────────────────
  const agentId = process.env.ELEVENLABS_AGENT_ID
  if (!agentId) {
    log.error('voice_call_no_agent_id', 'ELEVENLABS_AGENT_ID manquant', { trace_id })
    const result: VoiceCallResult = {
      provider: 'elevenlabs',
      call_id:  '',
      status:   'error',
      trace_id,
      error:    'ELEVENLABS_AGENT_ID non configuré',
    }
    return NextResponse.json(result, { status: 500 })
  }

  if (!body.phone_number) {
    return NextResponse.json(
      { error: 'phone_number requis pour appel ElevenLabs', trace_id },
      { status: 400 }
    )
  }

  try {
    const callRes = await elevenlabs.call({
      agent_id:     agentId,
      phone_number: body.phone_number,
      metadata: {
        trace_id,
        ...(body.contact_id      ? { contact_id:      body.contact_id }      : {}),
        ...(body.conversation_id ? { conversation_id: body.conversation_id } : {}),
        ...body.metadata,
      },
    })

    log.ok('voice_call_elevenlabs_started', {
      trace_id,
      contact_id: body.contact_id,
      stage:      'voice',
      detail:     `call_id=${callRes.call_id} status=${callRes.status}`,
    })

    const result: VoiceCallResult = {
      provider: 'elevenlabs',
      call_id:  callRes.call_id,
      status:   'started',
      trace_id,
    }
    return NextResponse.json(result)

  } catch (err) {
    log.error('voice_call_elevenlabs_failed', String(err), { trace_id, contact_id: body.contact_id })
    const result: VoiceCallResult = {
      provider: 'elevenlabs',
      call_id:  '',
      status:   'error',
      trace_id,
      error:    String(err),
    }
    return NextResponse.json(result, { status: 502 })
  }
}
