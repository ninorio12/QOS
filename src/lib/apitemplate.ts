const APITEMPLATE_URL = 'https://rest.apitemplate.io/v2'

function apiKey() {
  const key = process.env.APITEMPLATE_API_KEY
  if (!key) throw new Error('APITEMPLATE_API_KEY manquante')
  return key
}

export async function generatePdfFromHtml(html: string): Promise<string> {
  const res = await fetch(`${APITEMPLATE_URL}/create-pdf-from-html`, {
    method:  'POST',
    headers: { 'X-API-KEY': apiKey(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      body: html,
      settings: {
        paper_size:    'A4',
        orientation:   '1',
        margin_top:    '0',
        margin_bottom: '0',
        margin_left:   '0',
        margin_right:  '0',
        // Autoriser le chargement des ressources externes (Google Fonts, etc.)
        print_background: '1',
        wait_for:      'networkidle0',
      },
    }),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`APITemplate erreur ${res.status}: ${await res.text()}`)
  const data = await res.json() as { status: string; download_url: string; message?: string }
  if (data.status !== 'success') throw new Error(data.message ?? 'Génération PDF échouée')
  return data.download_url
}
