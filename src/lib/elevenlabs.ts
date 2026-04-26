/**
 * ElevenLabs Voice AI — adaptateur minimal
 * Remplace progressivement Vapi sous feature flag VOICE_PROVIDER
 */

// ── Config ────────────────────────────────────────────────────────────────────

export function isElevenLabsEnabled(): boolean {
  return process.env.VOICE_PROVIDER === 'elevenlabs'
}

function getApiKey(): string {
  const key = process.env.ELEVENLABS_API_KEY
  if (!key) throw new Error('ELEVENLABS_API_KEY manquante — configurer dans .env.local')
  return key
}

const BASE_URL = 'https://api.elevenlabs.io/v1'

function authHeaders(): Record<string, string> {
  return {
    'xi-api-key':   getApiKey(),
    'Content-Type': 'application/json',
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type ElevenLabsCallRequest = {
  agent_id:     string
  phone_number: string
  metadata?:    Record<string, string>
}

export type ElevenLabsCallResponse = {
  call_id:    string
  status:     string
  agent_id:   string
}

export type ElevenLabsWebhookEvent = {
  type:       string   // 'call.started' | 'call.ended' | 'transcript' | etc.
  call_id:    string
  agent_id?:  string
  transcript?: string
  metadata?:  Record<string, string>
  timestamp:  string
}

// ── Client ────────────────────────────────────────────────────────────────────

export const elevenlabs = {
  /**
   * Initier un appel sortant via un agent ElevenLabs
   */
  async call(req: ElevenLabsCallRequest): Promise<ElevenLabsCallResponse> {
    const res = await fetch(`${BASE_URL}/convai/calls`, {
      method:  'POST',
      headers: authHeaders(),
      body:    JSON.stringify(req),
    })
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`ElevenLabs call failed ${res.status}: ${err}`)
    }
    return res.json() as Promise<ElevenLabsCallResponse>
  },

  /**
   * Récupérer les détails d'un appel
   */
  async getCall(callId: string): Promise<ElevenLabsCallResponse & { transcript?: string }> {
    const res = await fetch(`${BASE_URL}/convai/calls/${callId}`, {
      headers: authHeaders(),
    })
    if (!res.ok) throw new Error(`ElevenLabs getCall ${res.status}`)
    return res.json()
  },

  /**
   * Vérifier la signature webhook ElevenLabs
   * Format: HMAC-SHA256 hex sur le body brut
   */
  verifyWebhook(body: string, signature: string | null): boolean {
    if (!signature) return false
    const secret = process.env.ELEVENLABS_WEBHOOK_SECRET
    if (!secret) return false

    // ElevenLabs envoie le header "ElevenLabs-Signature: sha256=<hex>"
    const expected = signature.replace(/^sha256=/, '')
    const crypto   = require('crypto') as typeof import('crypto')
    const hmac     = crypto.createHmac('sha256', secret).update(body).digest('hex')
    return hmac === expected
  },
}

// ── Feature flag helper ───────────────────────────────────────────────────────

/**
 * Résoudre le provider vocal actif.
 * Usage: const provider = voiceProvider()
 *        if (provider === 'elevenlabs') { ... } else { // legacy }
 */
export function voiceProvider(): 'elevenlabs' | 'legacy' {
  return isElevenLabsEnabled() ? 'elevenlabs' : 'legacy'
}
