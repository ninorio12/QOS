const APITEMPLATE_URL = 'https://rest.apitemplate.io/v2'

function apiKey() {
  const key = process.env.APITEMPLATE_API_KEY
  if (!key) throw new Error('APITEMPLATE_API_KEY manquante')
  return key
}

/**
 * Génère un PDF depuis du HTML et retourne l'URL de téléchargement.
 */
export async function generatePdfFromHtml(html: string): Promise<string> {
  const res = await fetch(`${APITEMPLATE_URL}/create-pdf-from-html`, {
    method:  'POST',
    headers: {
      'X-API-KEY':    apiKey(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      body:     html,
      settings: { paper_size: 'A4', orientation: '1', margin_top: '20', margin_bottom: '20', margin_left: '20', margin_right: '20' },
    }),
    cache: 'no-store',
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`APITemplate erreur ${res.status}: ${err}`)
  }

  const data = await res.json() as { status: string; download_url: string; message?: string }
  if (data.status !== 'success') throw new Error(data.message ?? 'Génération PDF échouée')

  return data.download_url
}

/**
 * Génère le HTML d'un devis BTP.
 */
export function buildDevisHtml(params: {
  titre:         string
  contactName:   string
  contactEmail?: string | null
  contactPhone?: string | null
  contenu:       string
  montantHt?:    number | null
  date:          string
}): string {
  const montantFormatted = params.montantHt
    ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(params.montantHt)
    : null
  const montantTtc = params.montantHt
    ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(params.montantHt * 1.2)
    : null

  // Convertir le contenu texte en HTML (sauts de ligne → <br>)
  const contenuHtml = params.contenu
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #111; font-size: 13px; line-height: 1.6; }
  .header { background: #111111; color: white; padding: 32px 40px; display: flex; justify-content: space-between; align-items: flex-start; }
  .header h1 { font-size: 22px; font-weight: 700; letter-spacing: -0.5px; }
  .header .meta { text-align: right; font-size: 12px; opacity: 0.8; }
  .header .meta strong { font-size: 18px; display: block; margin-bottom: 4px; opacity: 1; }
  .body { padding: 40px; }
  .section { margin-bottom: 28px; }
  .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #6B7280; border-bottom: 1px solid #E5E7EB; padding-bottom: 6px; margin-bottom: 12px; }
  .contact-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .contact-item { font-size: 13px; }
  .contact-item span { color: #6B7280; font-size: 11px; display: block; }
  .contenu { background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 20px; font-size: 13px; line-height: 1.8; white-space: pre-wrap; }
  .totaux { background: #111111; color: white; border-radius: 8px; padding: 20px; }
  .total-row { display: flex; justify-content: space-between; padding: 4px 0; }
  .total-row.main { font-size: 16px; font-weight: 700; border-top: 1px solid rgba(255,255,255,0.2); margin-top: 8px; padding-top: 12px; }
  .footer { border-top: 1px solid #E5E7EB; padding: 20px 40px; font-size: 11px; color: #9CA3AF; display: flex; justify-content: space-between; }
  .badge { display: inline-block; background: #EEF0EB; color: #111; font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 20px; margin-bottom: 4px; }
</style>
</head>
<body>
<div class="header">
  <div>
    <div class="badge">DEVIS</div>
    <h1>${params.titre}</h1>
    <div style="margin-top:8px;font-size:13px;opacity:0.8;">Valable 30 jours · TVA 20% en sus</div>
  </div>
  <div class="meta">
    <strong>${params.date}</strong>
    Qorpo IA
  </div>
</div>

<div class="body">
  <div class="section">
    <div class="section-title">Client</div>
    <div class="contact-grid">
      <div class="contact-item">
        <span>Nom</span>
        ${params.contactName}
      </div>
      ${params.contactEmail ? `<div class="contact-item"><span>Email</span>${params.contactEmail}</div>` : ''}
      ${params.contactPhone ? `<div class="contact-item"><span>Téléphone</span>${params.contactPhone}</div>` : ''}
    </div>
  </div>

  <div class="section">
    <div class="section-title">Détail des travaux</div>
    <div class="contenu">${contenuHtml}</div>
  </div>

  ${montantFormatted ? `
  <div class="section">
    <div class="section-title">Montants</div>
    <div class="totaux">
      <div class="total-row"><span>Total HT</span><span>${montantFormatted}</span></div>
      <div class="total-row"><span>TVA (20%)</span><span>${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format((params.montantHt ?? 0) * 0.2)}</span></div>
      <div class="total-row main"><span>Total TTC</span><span>${montantTtc}</span></div>
    </div>
  </div>
  ` : ''}
</div>

<div class="footer">
  <span>Généré par Qorpo IA · ${params.date}</span>
  <span>Ce devis est valable 30 jours à compter de sa date d'émission</span>
</div>
</body>
</html>`
}
