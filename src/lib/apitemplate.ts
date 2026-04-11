const APITEMPLATE_URL = 'https://rest.apitemplate.io/v2'

function apiKey() {
  const key = process.env.APITEMPLATE_API_KEY
  if (!key) throw new Error('APITEMPLATE_API_KEY manquante')
  return key
}

export type LigneDevis = {
  description:  string
  quantite:     number
  unite:        string   // 'U', 'm²', 'ml', 'm³', 'h', 'j', 'forfait'
  prixUnitaire: number   // HT
  tvaRate:      number   // %, default 20
}

export type CompanyInfo = {
  name:        string
  tagline?:    string
  address?:    string
  phone?:      string
  email?:      string
  siret?:      string
  capital?:    string
  tvaIntra?:   string
  brandColor:  string
  accentColor: string
  assurance?:  string
  logoSvg?:    string | null   // SVG brut ou null → fallback logo CSS
}

export function getCompanyFromEnv(): CompanyInfo {
  return {
    name:        process.env.COMPANY_NAME        ?? 'Soren',
    tagline:     process.env.COMPANY_TAGLINE     ?? 'Construction · Rénovation · Aménagement',
    address:     process.env.COMPANY_ADDRESS     ?? '',
    phone:       process.env.COMPANY_PHONE       ?? '',
    email:       process.env.COMPANY_EMAIL       ?? '',
    siret:       process.env.COMPANY_SIRET       ?? '',
    capital:     process.env.COMPANY_CAPITAL     ?? '',
    tvaIntra:    process.env.COMPANY_TVA_INTRA   ?? '',
    brandColor:  process.env.COMPANY_BRAND_COLOR  ?? '#111111',
    accentColor: process.env.COMPANY_ACCENT_COLOR ?? '#E2FF8D',
    assurance:   process.env.COMPANY_ASSURANCE   ?? '',
  }
}

export async function generatePdfFromHtml(html: string): Promise<string> {
  const res = await fetch(`${APITEMPLATE_URL}/create-pdf-from-html`, {
    method:  'POST',
    headers: { 'X-API-KEY': apiKey(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      body:     html,
      settings: { paper_size: 'A4', orientation: '1', margin_top: '0', margin_bottom: '0', margin_left: '0', margin_right: '0' },
    }),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`APITemplate erreur ${res.status}: ${await res.text()}`)
  const data = await res.json() as { status: string; download_url: string; message?: string }
  if (data.status !== 'success') throw new Error(data.message ?? 'Génération PDF échouée')
  return data.download_url
}

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(n)
}
function fmtQty(n: number) {
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(n)
}
function esc(s: string | null | undefined) {
  if (!s) return ''
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')
}

// ─────────────────────────────────────────────────────────────────────────────

export function buildDevisHtml(params: {
  titre:            string
  numero?:          string | null
  company:          CompanyInfo
  contactName:      string
  contactAddress?:  string | null
  contactEmail?:    string | null
  contactPhone?:    string | null
  lignes:           LigneDevis[]
  notes?:           string | null
  date:             string
  ville?:           string | null
  dateValidite?:    string | null
  adresseChantier?: string | null
}): string {
  const { company } = params
  const brand = company.brandColor

  // ── Calculs ────────────────────────────────────────────────────────────────
  const totalHT = params.lignes.reduce((s, l) => s + l.quantite * l.prixUnitaire, 0)

  const tvaMap: Record<number, number> = {}
  for (const l of params.lignes) {
    const ht = l.quantite * l.prixUnitaire
    tvaMap[l.tvaRate] = (tvaMap[l.tvaRate] ?? 0) + ht * (l.tvaRate / 100)
  }
  const totalTVA = Object.values(tvaMap).reduce((s, v) => s + v, 0)
  const totalTTC = totalHT + totalTVA

  // ── Lignes tableau ─────────────────────────────────────────────────────────
  const lignesRows = params.lignes.map(l => {
    const ht = l.quantite * l.prixUnitaire
    return `<tr>
      <td style="padding:12px 8px;border-right:1px solid #ccc;line-height:1.4;">${esc(l.description)}</td>
      <td style="padding:12px 8px;border-right:1px solid #ccc;text-align:center;">${fmtQty(l.quantite)}</td>
      <td style="padding:12px 8px;border-right:1px solid #ccc;text-align:center;">${esc(l.unite) || 'U'}</td>
      <td style="padding:12px 8px;border-right:1px solid #ccc;text-align:right;">${fmt(l.prixUnitaire)}</td>
      <td style="padding:12px 8px;border-right:1px solid #ccc;text-align:center;">${l.tvaRate.toFixed(2)}</td>
      <td style="padding:12px 8px;text-align:right;font-weight:bold;font-size:13px;">${fmt(ht)}</td>
    </tr>`
  }).join('')

  // TVA breakdown — ordre décroissant (20% avant 10%)
  const tvaRows = Object.entries(tvaMap)
    .sort(([a], [b]) => Number(b) - Number(a))
    .map(([rate, amount]) => `<tr>
      <td style="padding:7px 10px;border:none;border-bottom:1px solid #eee;">TVA ${Number(rate).toFixed(2)}%</td>
      <td style="padding:7px 10px;border:none;border-bottom:1px solid #eee;text-align:right;">${fmt(amount)}</td>
    </tr>`).join('')

  const dateLine = params.ville
    ? `${esc(params.ville)}, le ${esc(params.date)}`
    : esc(params.date)

  const clientAddrLines = params.contactAddress
    ? params.contactAddress.split('\n').map(l => `${esc(l)}<br>`).join('')
    : ''

  const chantierLines = params.adresseChantier
    ? params.adresseChantier.split('\n').map(l => `${esc(l)}<br>`).join('')
    : ''

  const companyAddrLines = company.address
    ? company.address.split('\n').map(l => `${esc(l)}<br>`).join('')
    : ''

  const taglineParts = company.tagline ? company.tagline.split('·').map(p => p.trim()) : []
  const taglineHtml = taglineParts.length > 0
    ? `<div style="font-size:14px;line-height:1.2;font-weight:700;"><span style="color:${brand};">${esc(taglineParts[0])}</span>${taglineParts.slice(1).map(p => `<br>${esc(p)}`).join('')}</div>`
    : ''

  const logoBlock = company.logoSvg
    ? `<div style="width:60px;height:60px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${company.logoSvg}</div>`
    : `<div style="width:60px;height:60px;border:5px solid ${brand};border-radius:8px;position:relative;flex-shrink:0;">
        <div style="position:absolute;top:-18px;left:50%;transform:translateX(-50%);border-left:25px solid transparent;border-right:25px solid transparent;border-bottom:18px solid ${brand};"></div>
       </div>`

  const delaiLine = params.notes
    ? `Délai d'exécution : ${esc(params.notes)}`
    : `Délai d'exécution : à définir à compter de la signature du devis`

  const footerLine1 = [
    company.capital  ? `Sarl au capital de ${esc(company.capital)}` : '',
    company.siret    ? `Siret : ${esc(company.siret)}` : '',
    company.tvaIntra ? `TVA intracommunautaire : ${esc(company.tvaIntra)}` : '',
  ].filter(Boolean).join(' &nbsp;·&nbsp; ')

  const footerLine2 = company.assurance ? `Assurance décennale : ${esc(company.assurance)}` : ''

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;700;900&display=swap');
  :root { --brand: ${brand}; --light-gray: #f2f2f2; --border-color: #cccccc; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', sans-serif; background-color: #555; color: #333; }
  .container {
    width: 210mm; min-height: 297mm; margin: 0 auto; background: #fff;
    padding: 15mm; position: relative; overflow: hidden;
    box-shadow: 0 0 20px rgba(0,0,0,0.5);
  }
  header { display: flex; justify-content: space-between; position: relative; z-index: 2; }
  .info-sender { margin-top: 15px; font-size: 12px; line-height: 1.4; }
  .devis-title { color: ${brand}; font-size: 28px; font-weight: 700; text-align: right; }
  .info-recipient { margin-top: 40px; font-size: 16px; line-height: 1.4; text-align: right; padding-right: 40px; }
  .date-location { text-align: right; margin-top: 8px; font-size: 13px; padding-right: 40px; }
  .objet { margin: 50px 0 20px 0; font-size: 14px; font-weight: bold; position: relative; z-index: 2; }
  table { width: 100%; border-collapse: collapse; font-size: 11.5px; position: relative; z-index: 2; border: 1px solid var(--border-color); }
  thead th { background-color: ${brand}; color: white; padding: 8px; text-transform: uppercase; font-weight: 400; border: 1px solid rgba(0,0,0,0.1); }
  tbody td { padding: 12px 8px; border-right: 1px solid var(--border-color); line-height: 1.4; }
  .footer-grid { display: grid; grid-template-columns: 1.2fr 1fr 1fr; gap: 20px; margin-top: 40px; position: relative; z-index: 2; }
  .box-signature { border: 1px solid var(--border-color); background: white; padding: 8px; font-size: 10px; }
  .info-chantier { font-size: 9.5px; line-height: 1.5; }
  .totals-box { border: 1px solid var(--border-color); font-size: 10.5px; }
  .totals-table { width: 100%; border: none; border-collapse: collapse; }
  .totals-table td { padding: 4px 8px; border: none; border-bottom: 1px solid #eee; }
  .row-total-ttc { background-color: var(--light-gray); font-weight: 900; font-size: 10.5px; white-space: nowrap; }
  .legal-notice { margin-top: 18px; margin-bottom: 18px; font-size: 8.5px; line-height: 1.55; color: #555; position: relative; z-index: 2; }
  .orange-bar { position: absolute; bottom: 0; left: 0; width: 100%; background: ${brand}; color: white; padding: 12px; text-align: center; font-size: 9px; line-height: 1.4; }
</style>
</head>
<body>
<div class="container">

  <svg viewBox="0 0 210 297" preserveAspectRatio="none"
    style="position:absolute;top:0;left:0;width:100%;height:100%;z-index:1;pointer-events:none;">
    <g transform="translate(38, 145)" fill="none" stroke="${brand}" stroke-width="16"
       stroke-linecap="round" stroke-linejoin="round" opacity="0.09">
      <path d="M -55 0 L 0 -58 L 55 0 L 55 78 L -55 78 Z"/>
    </g>
    <g transform="translate(173, 246)" fill="none" stroke="${brand}" stroke-width="16"
       stroke-linecap="round" stroke-linejoin="round" opacity="0.09">
      <path d="M -80 0 L 0 -85 L 80 0 L 80 115 L -80 115 Z"/>
    </g>
  </svg>

  <header>
    <div>
      <div style="display:flex;align-items:center;gap:15px;">
        ${logoBlock}
        <div>
          <div style="margin:0;font-size:32px;font-weight:900;letter-spacing:1px;">${esc(company.name)}</div>
          ${taglineHtml}
        </div>
      </div>
      <div class="info-sender">
        ${companyAddrLines}
        ${company.phone ? `<strong>Tél. ${esc(company.phone)}</strong><br>` : ''}
        ${company.email ? esc(company.email) : ''}
      </div>
    </div>
    <div>
      <div class="devis-title">DEVIS${params.numero ? ` N°${esc(params.numero)}` : ''}</div>
      <div class="info-recipient">
        <strong>${esc(params.contactName)}</strong><br>
        ${clientAddrLines}
      </div>
      <div class="date-location">${esc(dateLine)}</div>
    </div>
  </header>

  <div class="objet">Objet : ${esc(params.titre)}</div>

  <table>
    <thead>
      <tr>
        <th style="width:55%;text-align:left;">Libellé</th>
        <th>Qte</th>
        <th>U</th>
        <th>P.U.</th>
        <th>TVA</th>
        <th>Total €</th>
      </tr>
    </thead>
    <tbody>
      ${lignesRows}
    </tbody>
  </table>

  <div class="footer-grid">
    <div class="box-signature">
      <strong>Bon pour accord,</strong><br>
      <span style="font-size:10px;">"Devis reçu avant acceptation des travaux"</span>
    </div>
    <div class="info-chantier">
      ${params.dateValidite ? `Date de validité : ${esc(params.dateValidite)}<br><br>` : ''}
      <strong>Adresse de chantier :</strong><br>
      ${chantierLines}
    </div>
    <div class="totals-box">
      <table class="totals-table">
        <tr><td>TOTAL HT</td><td style="text-align:right;">${fmt(totalHT)}</td></tr>
        ${tvaRows}
        <tr class="row-total-ttc">
          <td>TOTAL TTC</td>
          <td style="text-align:right;">${fmt(totalTTC)}</td>
        </tr>
      </table>
    </div>
  </div>

  <div class="legal-notice">
    ${delaiLine}<br>
    Les TVA et autres charges sont susceptibles de subir d'éventuelles variations découlant des dispositions législatives ou réglementaires en vigueur à la date des règlements.<br>
    Le client reconnaît avoir pris connaissance des conditions générales applicables au marché, jointes à ce document.<br>
    Souhaitez-vous conserver les pièces, éléments ou appareils remplacés ? [ ] Oui &nbsp;&nbsp; [ ] Non
  </div>

  <div class="orange-bar">
    ${footerLine1}${footerLine1 && footerLine2 ? '<br>' : ''}${footerLine2}
  </div>

</div>
</body>
</html>`
}
