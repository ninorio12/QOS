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
  supabaseUrl:  () => requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
  supabaseAnon: () => requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  supabaseServiceRole: () => requireEnv('SUPABASE_SERVICE_ROLE_KEY'),

  // APITemplate
  apiTemplateKey: () => requireEnv('APITEMPLATE_API_KEY'),

  // Google
  googleClientId:     () => requireEnv('GOOGLE_CLIENT_ID'),
  googleClientSecret: () => requireEnv('GOOGLE_CLIENT_SECRET'),

  // Vapi
  vapiKey: () => optionalEnv('VAPI_API_KEY', ''),

  // App
  appUrl: () => optionalEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000'),
}
