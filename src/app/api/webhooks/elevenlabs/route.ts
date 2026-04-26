import { NextRequest, NextResponse } from 'next/server'
import { log } from '@/lib/logger'
import { voiceProvider, elevenlabs } from '@/lib/elevenlabs'
import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'

// ── Signature verification ────────────────────────────────────────────────────

function verifySignature(rawBody: string, header: string | null): boolean {
  const secret = process.env.ELEVENLABS_WEBHOOK_SECRET
  if (!secret) return true // pas configuré → dev mode, on accepte
  if (!header) return false

  const sig     = header.replace(/^sha256=/, '')
  const hmac    = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  return crypto.timingSafeEqual(Buffer.from(hmac, 'hex'), Buffer.from(sig, 'hex'))
}

// ── Event types ElevenLabs ConvAI ────────────────────────────────────────────

type ElevenLabsEvent = {
  type:       string
  call_id:    string
  agent_id?:  string
  status?:    string
  transcript?: string
  duration_seconds?: number
  metadata?:  Record<string, string>
  timestamp?: string
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const trace_id = crypto.randomBytes(6).toString('hex')

  // Guard: noop si VOICE_PROVIDER != elevenlabs
  if (voiceProvider() !== 'elevenlabs') {
    log.ok('elevenlabs_webhook_noop', {
      trace_id,
      detail: `VOICE_PROVIDER=${process.env.VOICE_PROVIDER ?? 'legacy'} — ignored`,
    })
    return NextResponse.json({ ok: true, noop: true })
  }

  // Lire body brut pour vérification HMAC
  const rawBody = await req.text()

  if (!verifySignature(rawBody, req.headers.get('elevenlabs-signature'))) {
    log.warn('elevenlabs_webhook_invalid_sig', 'Signature HMAC invalide', { trace_id })
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let event: ElevenLabsEvent
  try {
    event = JSON.parse(rawBody) as ElevenLabsEvent
  } catch {
    log.warn('elevenlabs_webhook_bad_json', 'Corps non-JSON', { trace_id })
    return NextResponse.json({ error: 'Bad Request' }, { status: 400 })
  }

  const { type, call_id, agent_id, metadata } = event
  const contact_id = metadata?.contact_id
  const conv_id    = metadata?.conversation_id

  log.ok('elevenlabs_event_received', {
    trace_id,
    contact_id,
    stage:  'voice',
    detail: `type=${type} call_id=${call_id} agent=${agent_id ?? '?'}`,
  })

  try {
    switch (type) {

      // ── Appel démarré ─────────────────────────────────────────────────────
      case 'call.started': {
        log.ok('elevenlabs_call_started', {
          trace_id,
          contact_id,
          stage:  'voice',
          detail: `call_id=${call_id}`,
        })

        // Persister l'event dans Supabase si conv connue
        if (conv_id) {
          const supabase = await createClient()
          await supabase.from('messages').insert({
            conversation_id: conv_id,
            role:            'assistant',
            content:         '[Appel vocal démarré]',
            metadata:        { provider: 'elevenlabs', call_id, event: 'call.started', trace_id },
          })
        }
        break
      }

      // ── Appel terminé ─────────────────────────────────────────────────────
      case 'call.ended': {
        const duration = event.duration_seconds ?? 0
        log.ok('elevenlabs_call_ended', {
          trace_id,
          contact_id,
          stage:  'voice',
          detail: `call_id=${call_id} duration=${duration}s status=${event.status ?? 'unknown'}`,
        })

        if (conv_id) {
          const supabase = await createClient()
          await supabase.from('messages').insert({
            conversation_id: conv_id,
            role:            'assistant',
            content:         `[Appel vocal terminé — ${duration}s]`,
            metadata:        { provider: 'elevenlabs', call_id, event: 'call.ended', duration, trace_id },
          })
        }
        break
      }

      // ── Transcription disponible ──────────────────────────────────────────
      case 'transcript.available':
      case 'transcription.completed': {
        const transcript = event.transcript ?? ''
        log.ok('elevenlabs_transcript', {
          trace_id,
          contact_id,
          stage:  'voice',
          detail: `call_id=${call_id} chars=${transcript.length}`,
        })

        if (conv_id && transcript) {
          const supabase = await createClient()
          await supabase.from('messages').insert({
            conversation_id: conv_id,
            role:            'user',
            content:         transcript,
            metadata:        { provider: 'elevenlabs', call_id, event: 'transcript', trace_id },
          })
        }
        break
      }

      // ── Events non gérés → log warn uniquement ────────────────────────────
      default: {
        log.warn('elevenlabs_event_unhandled', `type=${type} non géré`, {
          trace_id,
          contact_id,
          stage: 'voice',
        })
      }
    }
  } catch (err) {
    log.error('elevenlabs_webhook_handler_error', String(err), { trace_id, contact_id })
    // On retourne 200 quand même — ElevenLabs ne doit pas retry à l'infini
  }

  return NextResponse.json({ ok: true, trace_id, type })
}
