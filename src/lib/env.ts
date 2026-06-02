/**
 * Env vars centralisées avec messages d'erreur clairs.
 * Utiliser ces helpers plutôt que process.env.VAR! directement.
 */

function requireEnv(key: string): string {
  const val = process.env[key]
  if (!val) throw new Error(`Variable d'environnement manquante : ${key}. Vérifie ton fichier .env.local`)
  return val
}

function optionalEnv(key: string, fallback: string): string {
  return process.env[key] ?? fallback
}

export const env = {
  // GHL
  ghlApiKey:    () => requireEnv('GHL_API_KEY'),
  ghlBaseUrl:   () => optionalEnv('GHL_BASE_URL', 'https://services.leadconnectorhq.com'),
  ghlLocationId: () => requireEnv('GHL_LOCATION_ID'),

  // Anthropic
  anthropicKey: () => requireEnv('ANTHROPIC_API_KEY'),

  // Twilio
  twilioSid:    () => requireEnv('TWILIO_ACCOUNT_SID'),
  twilioToken:  () => requireEnv('TWILIO_AUTH_TOKEN'),
  twilioFrom:   () => requireEnv('TWILIO_WHATSAPP_FROM'),

  // Supabase
  supabaseUrl:  () => optionalEnv('NEXT_PUBLIC_SUPABASE_URL', ''),
  supabaseAnon: () => optionalEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', ''),
  supabaseServiceRole: () => optionalEnv('SUPABASE_SERVICE_ROLE_KEY', ''),

  // APITemplate
  apiTemplateKey: () => requireEnv('APITEMPLATE_API_KEY'),

  // Google
  googleClientId:     () => requireEnv('GOOGLE_CLIENT_ID'),
  googleClientSecret: () => requireEnv('GOOGLE_CLIENT_SECRET'),

  // Vapi (legacy)
  vapiKey: () => optionalEnv('VAPI_API_KEY', ''),

  // ElevenLabs
  elevenLabsKey:       () => optionalEnv('ELEVENLABS_API_KEY', ''),
  elevenLabsAgentId:   () => optionalEnv('ELEVENLABS_AGENT_ID', ''),
  elevenLabsWebhookSecret: () => optionalEnv('ELEVENLABS_WEBHOOK_SECRET', ''),
  voiceProvider:       () => optionalEnv('VOICE_PROVIDER', 'legacy') as 'elevenlabs' | 'legacy',

  // Email sender
  emailFromName:    () => optionalEnv('EMAIL_FROM_NAME', 'Thomas Alves Do Rio'),
  emailFromAddress: () => optionalEnv('EMAIL_FROM_ADDRESS', 'thomas@qorpoia.com'),

  // App
  appUrl: () => optionalEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000'),
}
