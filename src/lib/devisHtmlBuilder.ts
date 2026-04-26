// Générateur HTML pour le PDF — miroir exact de DevisTemplateStatic.tsx
// Si tu modifies les styles ou la logique dans DevisTemplateStatic, mets à jour ici aussi.

import type { CompanyForTemplate } from '@/components/devis/DevisTemplateStatic'

export type DevisData = {
  numero:          string | null
  titre:           string
  lignes:          { description: string; quantite: number; unite: string; prixUnitaire: number; tvaRate: number }[]
  notes:           string
  ville:           string
  dateValidite:    string
  adresseChantier: string
  contactName:     string | null
  adresseClient:   string
  createdAt:       string
}

function fmtEUR(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)
}
function fmtDate(iso: string) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
function esc(s: string | null | undefined) {
  if (!s) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export function buildDevisHtml(data: DevisData, company: CompanyForTemplate): string {
  const brand = company.brandColor || '#111111'

  const validLignes = data.lignes.filter(l => l.description.trim())
  const ht = validLignes.reduce((s, l) => s + l.quantite * l.prixUnitaire, 0)

  const tvaMap: Record<number, number> = {}
  for (const l of validLignes) {
    const lHt = l.quantite * l.prixUnitaire
    tvaMap[l.tvaRate] = (tvaMap[l.tvaRate] ?? 0) + lHt * (l.tvaRate / 100)
  }
  const totalTVA = Object.values(tvaMap).reduce((s, v) => s + v, 0)
  const ttc = ht + totalTVA

  const adresseLines  = company.address   ? company.address.split('\n')   : []
  const clientLines   = data.adresseClient ? data.adresseClient.split('\n') : []
  const taglineParts  = company.tagline   ? company.tagline.split('·').map(p => p.trim()).filter(Boolean) : []

  const footerParts = [
    company.capital  ? `Sarl au capital de ${esc(company.capital)}` : '',
    company.siret    ? `Siret : ${esc(company.siret)}` : '',
    company.tvaIntra ? `TVA intracommunautaire : ${esc(company.tvaIntra)}` : '',
  ].filter(Boolean)

  // ── Logo ──────────────────────────────────────────────────────────────────
  const logoBlock = company.logoBase64
    ? `<img src="data:image/svg+xml;base64,${company.logoBase64}" alt="logo" style="width:60px;height:60px;object-fit:contain;border-radius:8px;flex-shrink:0;display:block;">`
    : `<div style="width:60px;height:60px;border:5px solid ${brand};border-radius:8px;position:relative;flex-shrink:0;">
        <div style="position:absolute;top:-18px;left:50%;transform:translateX(-50%);border-left:25px solid transparent;border-right:25px solid transparent;border-bottom:18px solid ${brand};"></div>
       </div>`

  // ── Tagline ───────────────────────────────────────────────────────────────
  const taglineHtml = taglineParts.length > 0
    ? `<div style="font-size:14px;line-height:1.2;font-weight:700;">
        <span style="color:${brand};">${esc(taglineParts[0])}</span>
        ${taglineParts.slice(1).map(p => `<br>${esc(p)}`).join('')}
       </div>`
    : ''

  // ── Lignes tableau ────────────────────────────────────────────────────────
  const th = (txt: string, extra = '') =>
    `<th style="background:${brand};color:white;padding:8px;text-transform:uppercase;font-weight:400;border:1px solid rgba(0,0,0,0.1);${extra}">${txt}</th>`

  const lignesRows = validLignes.map(l => `
    <tr>
      <td style="padding:12px 8px;border-right:1px solid #ccc;line-height:1.4;">${esc(l.description)}</td>
      <td style="padding:12px 8px;border-right:1px solid #ccc;text-align:center;">${l.quantite.toLocaleString('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</td>
      <td style="padding:12px 8px;border-right:1px solid #ccc;text-align:center;">${esc(l.unite) || 'U'}</td>
      <td style="padding:12px 8px;border-right:1px solid #ccc;text-align:right;">${fmtEUR(l.prixUnitaire)}</td>
      <td style="padding:12px 8px;border-right:1px solid #ccc;text-align:center;">${l.tvaRate.toFixed(2)}</td>
      <td style="padding:12px 8px;text-align:right;font-weight:700;font-size:13px;">${fmtEUR(l.quantite * l.prixUnitaire)}</td>
    </tr>`).join('')

  // ── TVA breakdown ─────────────────────────────────────────────────────────
  const tvaRows = Object.entries(tvaMap)
    .sort(([a], [b]) => Number(b) - Number(a))
    .map(([rate, amount]) => `
      <tr>
        <td style="padding:4px 8px;border-bottom:1px solid #eee;">TVA ${Number(rate).toFixed(2)}%</td>
        <td style="padding:4px 8px;border-bottom:1px solid #eee;text-align:right;">${fmtEUR(amount)}</td>
      </tr>`).join('')

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;700;900&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', sans-serif; background-color: #555; color: #333; }
</style>
</head>
<body>
<div style="width:210mm;min-height:297mm;background:#fff;padding:15mm;position:relative;overflow:hidden;font-family:'Inter',sans-serif;color:#333;box-sizing:border-box;">

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

  <!-- HEADER -->
  <header style="display:flex;justify-content:space-between;position:relative;z-index:2;">
    <div>
      <div style="display:flex;align-items:center;gap:15px;">
        ${logoBlock}
        <div>
          <div style="margin:0;font-size:22px;font-weight:900;letter-spacing:1px;">${esc(company.name) || 'Mon Entreprise'}</div>
          ${taglineHtml}
        </div>
      </div>
      <div style="margin-top:15px;font-size:12px;line-height:1.8;">
        ${adresseLines.map(l => `<div>${esc(l)}</div>`).join('')}
        ${company.phone ? `<div><strong>Tél. ${esc(company.phone)}</strong></div>` : ''}
        ${company.email ? `<div>${esc(company.email)}</div>` : ''}
      </div>
    </div>
    <div style="text-align:right;">
      <div style="color:${brand};font-size:28px;font-weight:700;">DEVIS${data.numero ? ` N°${esc(data.numero)}` : ''}</div>
      <div style="margin-top:40px;font-size:16px;line-height:1.6;padding-right:40px;">
        <div><strong>${esc(data.contactName || '___')}</strong></div>
        ${clientLines.map(l => `<div style="font-size:12px;color:#666;">${esc(l)}</div>`).join('')}
      </div>
      <div style="text-align:right;margin-top:8px;font-size:13px;padding-right:40px;">
        ${esc(data.ville || '___')}, le ${data.createdAt ? fmtDate(data.createdAt) : '___'}
      </div>
    </div>
  </header>

  <!-- OBJET -->
  <div style="margin:50px 0 20px;font-size:14px;font-weight:700;position:relative;z-index:2;">
    Objet : ${esc(data.titre || '___')}
  </div>

  <!-- TABLEAU -->
  <table style="width:100%;border-collapse:collapse;font-size:11.5px;position:relative;z-index:2;border:1px solid #ccc;">
    <thead>
      <tr>
        ${th('Libellé', 'text-align:left;width:55%;')}
        ${th('Qte', 'text-align:center;')}
        ${th('U', 'text-align:center;')}
        ${th('P.U.', 'text-align:center;')}
        ${th('TVA', 'text-align:center;')}
        ${th('Total €', 'text-align:center;')}
      </tr>
    </thead>
    <tbody>
      ${lignesRows}
    </tbody>
  </table>

  <!-- FOOTER GRID -->
  <div style="display:grid;grid-template-columns:1.2fr 1fr 1fr;gap:20px;margin-top:40px;position:relative;z-index:2;">

    <div style="border:1px solid #ccc;background:white;padding:8px;font-size:10px;">
      <strong>Bon pour accord,</strong><br>
      <span style="font-size:8.5px;">"Devis reçu avant acceptation des travaux"</span>
    </div>

    <div style="font-size:9.5px;line-height:1.5;">
      <div>
        <strong>Date de validité :</strong><br>
        ${data.dateValidite ? fmtDate(data.dateValidite) : '___'}
      </div>
      <div style="margin-top:6px;">
        <strong>Adresse de chantier :</strong><br>
        ${esc(data.adresseChantier || '___')}
      </div>
    </div>

    <div style="border:1px solid #ccc;font-size:10.5px;">
      <table style="width:100%;border-collapse:collapse;border:none;">
        <tbody>
          <tr>
            <td style="padding:4px 8px;border-bottom:1px solid #eee;">TOTAL HT</td>
            <td style="padding:4px 8px;border-bottom:1px solid #eee;text-align:right;">${fmtEUR(ht)}</td>
          </tr>
          ${tvaRows}
          <tr style="background:#f2f2f2;font-weight:900;font-size:10.5px;">
            <td style="padding:4px 8px;">TOTAL TTC</td>
            <td style="padding:4px 8px;text-align:right;white-space:nowrap;">${fmtEUR(ttc)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- MENTIONS LÉGALES -->
  <div style="margin-top:18px;margin-bottom:18px;font-size:8.5px;line-height:1.55;color:#555;position:relative;z-index:2;">
    Délai d'exécution : ${esc(data.notes || '___')}<br>
    Les TVA et autres charges sont susceptibles de subir d'éventuelles variations découlant des dispositions législatives ou réglementaires en vigueur à la date des règlements.<br>
    Le client reconnaît avoir pris connaissance des conditions générales applicables au marché, jointes à ce document.<br>
    Souhaitez-vous conserver les pièces, éléments ou appareils remplacés ? [ ] Oui &nbsp;&nbsp; [ ] Non
  </div>

  <!-- BARRE BAS -->
  <div style="position:absolute;bottom:0;left:0;width:100%;background:${brand};color:white;padding:12px;text-align:center;font-size:9px;line-height:1.6;box-sizing:border-box;">
    ${footerParts.join(' &nbsp;·&nbsp; ')}
    ${company.assurance ? `<br>Assurance décennale : ${esc(company.assurance)}` : ''}
  </div>

</div>
</body>
</html>`
}

