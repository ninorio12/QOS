import { config } from '../config'

interface TwilioResponse {
  sid:    string
  status: string
}

/** Sends an SMS via Twilio REST API (no SDK — native fetch) */
export async function sendSMS(to: string, body: string): Promise<TwilioResponse> {
  const { accountSid, authToken, fromNumber } = config.twilio

  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64')

  const params = new URLSearchParams({ To: to, From: fromNumber, Body: body })

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method:  'POST',
      headers: {
        Authorization:  `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    }
  )

  if (!res.ok) {
    throw new Error(`Twilio SMS error: ${res.status}`)
  }

  return res.json() as Promise<TwilioResponse>
}

// ─── Tool definition for agent registration ───────────────────

export const twilioSmsTool = {
  name: 'twilio_send_sms' as const,
  definition: {
    description: 'Send an SMS to a prospect via Twilio. Use for first contact and follow-ups.',
    input_schema: {
      type: 'object' as const,
      properties: {
        to:      { type: 'string', description: 'Phone number in E.164 format (e.g. +33612345678)' },
        message: { type: 'string', description: 'SMS content — max 160 chars, no markdown' },
      },
      required: ['to', 'message'],
    },
  },
  executor: async (input: Record<string, unknown>) => {
    const result = await sendSMS(String(input.to), String(input.message))
    return { ok: true, sid: result.sid, status: result.status }
  },
}
