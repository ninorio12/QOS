import twilio from 'twilio'

const accountSid  = process.env.TWILIO_ACCOUNT_SID  ?? ''
const authToken   = process.env.TWILIO_AUTH_TOKEN   ?? ''
const fromNumber  = process.env.TWILIO_WHATSAPP_FROM ?? 'whatsapp:+14155238886'

/**
 * Envoie un message WhatsApp via Twilio.
 * `to` peut être un numéro brut (+33...) ou déjà préfixé whatsapp:+33...
 */
export async function sendWhatsApp(to: string, message: string): Promise<void> {
  if (!accountSid || !authToken) {
    console.warn('[Twilio] TWILIO_ACCOUNT_SID ou TWILIO_AUTH_TOKEN manquant — message non envoyé')
    return
  }

  const normalizedTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`

  const client = twilio(accountSid, authToken)
  await client.messages.create({
    from: fromNumber,
    to: normalizedTo,
    body: message,
  })
}
