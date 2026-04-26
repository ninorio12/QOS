import { writeFileSync } from 'fs'

const lignes = [
  { description: "Porte fenêtre croisée standard ouvrante à la française 3 vantaux, ht 125 x 180 cm, PVC blanc ép.60 mm, vitrage isolant 4-16-4 faible émissivité. Ferrage paumelles, crémone à galets 3 points, poignées époxy. Fixations et pose sur fond de joint et joint d'étanchéité.", quantite: 2.000, unite: 'U', prixUnitaire: 524.52, tvaRate: 10 },
  { description: "Tableau d'abonné monophasé 1 rangée 9 circuits avec disjoncteur magnétothermique pour F3 ou F4. Equipement : Coffret de base à 1 rangée de 13 modules : 2 x 10 A, 2 x 16 A, 2 x 20 A et en complément 1 x 10 A, 1 x 16 A, 1 x 32 A.", quantite: 1.000, unite: 'U', prixUnitaire: 511.73, tvaRate: 20 },
  { description: "Mitigeur thermostatique sur gorge à disques céramique, chromé à inverseur bain-douche, compris montage et façon des joints.", quantite: 1.000, unite: 'U', prixUnitaire: 573.94, tvaRate: 20 },
  { description: "ESCALIER A LA FRANÇAISE CHENE FABRICATION ARTISANALE 2 QUARTS TOURNANT Fabrication et pose d'escalier à la française à 2 quarts tournant en chêne, emmarchement 80 cm, composé de 15 marches ép. 36 mm, contremarche ép. 24 mm, crémaillère ép. 36 mm et limon ép. 48 mm d'épaisseur, garde corps en rampant avec main courante, poteaux et balustres compris toutes sujétions d'accessoires de pose, ponçage et vernissage 2 couches en finition.", quantite: 1.000, unite: 'U', prixUnitaire: 6279.65, tvaRate: 20 },
]

const brand = '#d28e46'

function fmt(n) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(n)
}
function fmtQty(n) {
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(n)
}
function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

const totalHT = lignes.reduce((s, l) => s + l.quantite * l.prixUnitaire, 0)
const tvaMap = {}
for (const l of lignes) {
  const ht = l.quantite * l.prixUnitaire
  tvaMap[l.tvaRate] = (tvaMap[l.tvaRate] ?? 0) + ht * (l.tvaRate / 100)
}
const totalTVA = Object.values(tvaMap).reduce((s, v) => s + v, 0)
const totalTTC = totalHT + totalTVA

const lignesRows = lignes.map((l, i) => {
  const ht = l.quantite * l.prixUnitaire
  return `<tr>
    <td style="padding:12px 8px;border-right:1px solid #ccc;line-height:1.4;">${esc(l.description)}</td>
    <td class="col-center" style="padding:12px 8px;border-right:1px solid #ccc;">${fmtQty(l.quantite)}</td>
    <td class="col-center" style="padding:12px 8px;border-right:1px solid #ccc;">${esc(l.unite)}</td>
    <td class="col-right" style="padding:12px 8px;border-right:1px solid #ccc;">${fmt(l.prixUnitaire)}</td>
    <td class="col-center" style="padding:12px 8px;border-right:1px solid #ccc;">${l.tvaRate.toFixed(2)}</td>
    <td class="col-right bold" style="padding:12px 8px;">${fmt(ht)}</td>
  </tr>`
}).join('')

const tvaRows = Object.entries(tvaMap)
  .sort(([a], [b]) => Number(b) - Number(a))
  .map(([rate, amount]) => `
  <tr>
    <td>TVA ${Number(rate).toFixed(2)}%</td>
    <td class="col-right">${fmt(amount)}</td>
  </tr>`).join('')

const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Devis Soren</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;700;900&display=swap');
  :root { --orange-brand: ${brand}; --text-gray: #333333; --light-gray: #f2f2f2; --border-color: #cccccc; }
  * { box-sizing: border-box; }
  body { font-family: 'Inter', sans-serif; background-color: #555; margin: 0; padding: 20px; color: var(--text-gray); }
  .container { width: 210mm; min-height: 297mm; margin: 0 auto; background: #fff; padding: 15mm; position: relative; overflow: hidden; box-shadow: 0 0 20px rgba(0,0,0,0.5); }
  .bg-shapes { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 1; pointer-events: none; }
  header { display: flex; justify-content: space-between; position: relative; z-index: 2; }
  .logo-block { display: flex; align-items: center; gap: 15px; }
  .logo-house { width: 60px; height: 60px; border: 5px solid var(--orange-brand); border-radius: 8px; position: relative; }
  .logo-house::before { content: ''; position: absolute; top: -18px; left: 50%; transform: translateX(-50%); border-left: 25px solid transparent; border-right: 25px solid transparent; border-bottom: 18px solid var(--orange-brand); }
  .logo-text h1 { margin: 0; font-size: 32px; font-weight: 900; letter-spacing: 1px; }
  .logo-subtitle { font-size: 14px; line-height: 1.2; font-weight: 700; }
  .text-orange { color: var(--orange-brand); }
  .devis-title { color: var(--orange-brand); font-size: 28px; font-weight: 700; text-align: right; }
  .info-sender { margin-top: 15px; font-size: 12px; line-height: 1.4; }
  .info-recipient { margin-top: 40px; font-size: 16px; line-height: 1.4; text-align: right; padding-right: 40px; }
  .date-location { text-align: right; margin-top: 8px; font-size: 13px; padding-right: 40px; }
  .objet { margin: 50px 0 20px 0; font-size: 14px; font-weight: bold; position: relative; z-index: 2; }
  table { width: 100%; border-collapse: collapse; font-size: 11.5px; position: relative; z-index: 2; border: 1px solid var(--border-color); }
  thead th { background-color: var(--orange-brand); color: white; padding: 8px; text-transform: uppercase; font-weight: 400; border: 1px solid rgba(0,0,0,0.1); }
  tbody td { padding: 12px 8px; border-right: 1px solid var(--border-color); line-height: 1.4; }
  tbody tr { background-color: transparent; }
  .col-right { text-align: right; }
  .col-center { text-align: center; }
  .bold { font-weight: bold; font-size: 13px; }
  .footer-grid { display: grid; grid-template-columns: 1.2fr 1fr 1fr; gap: 20px; margin-top: 40px; position: relative; z-index: 2; }
  .box-signature { border: 1px solid var(--border-color); background: white; padding: 10px; font-size: 12px; }
  .totals-box { border: 1px solid var(--border-color); }
  .info-chantier { font-size: 11px; line-height: 1.4; }
  .totals-box { font-size: 13px; }
  .totals-table { width: 100%; border: none; border-collapse: collapse; }
  .totals-table td { padding: 7px 10px; border: none; border-bottom: 1px solid #eee; }
  .row-total-ttc { background-color: var(--light-gray); font-weight: 900; font-size: 11.5px; white-space: nowrap; }
  .legal-notice { margin-top: 30px; font-size: 10px; line-height: 1.3; color: #555; position: relative; z-index: 2; }
  .orange-bar { position: absolute; bottom: 0; left: 0; width: 100%; background: var(--orange-brand); color: white; padding: 12px; text-align: center; font-size: 9px; line-height: 1.4; }
</style>
</head>
<body>
<div class="container">

  <svg class="bg-shapes" viewBox="0 0 210 297" preserveAspectRatio="none" style="position:absolute;top:0;left:0;width:100%;height:100%;z-index:1;pointer-events:none;">
    <!-- Maison haut-gauche -->
    <g transform="translate(38, 145)" fill="none" stroke="${brand}" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" opacity="0.09">
      <path d="M -55 0 L 0 -58 L 55 0 L 55 78 L -55 78 Z"/>
    </g>
    <!-- Maison bas-droite -->
    <g transform="translate(173, 246)" fill="none" stroke="${brand}" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" opacity="0.09">
      <path d="M -80 0 L 0 -85 L 80 0 L 80 115 L -80 115 Z"/>
    </g>
  </svg>

  <header>
    <div class="header-left">
      <div class="logo-block">
        <div class="logo-house"></div>
        <div class="logo-text">
          <h1>SOREN</h1>
          <div class="logo-subtitle">
            <span class="text-orange">Construction</span><br>
            Rénovation<br>
            Aménagement
          </div>
        </div>
      </div>
      <div class="info-sender">
        215, avenue Clément Ader<br>
        34173 Castelnau-Le-Lez<br>
        <strong>Tél. 04 99 13 32 00</strong><br>
        contact@soren.fr
      </div>
    </div>
    <div class="header-right">
      <div class="devis-title">DEVIS N°2026-023</div>
      <div class="info-recipient">
        <strong>Mme Cécile ENCIEUX</strong><br>
        21, chemin des Vignes<br>
        34130 MAUGUIO
      </div>
      <div class="date-location">Castelnau, le 18/07/2025</div>
    </div>
  </header>

  <div class="objet">Objet : Rénovation de maison</div>

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
      Date de validité : 18/08/2025<br><br>
      <strong>Adresse de chantier :</strong><br>
      M. Jean TALLUE<br>
      25, rue Jacques d'Aragon<br>
      34000 MONTPELLIER
    </div>
    <div class="totals-box">
      <table class="totals-table">
        <tr><td>TOTAL HT</td><td class="col-right">${fmt(totalHT)}</td></tr>
        ${tvaRows}
        <tr class="row-total-ttc">
          <td>TOTAL TTC</td>
          <td class="col-right">${fmt(totalTTC)}</td>
        </tr>
      </table>
    </div>
  </div>

  <div class="legal-notice">
    Délai d'exécution : 4 mois à compter de la signature du devis<br>
    Les TVA et autres charges sont susceptibles de subir d'éventuelles variations découlant des dispositions législatives ou réglementaires en vigueur à la date des règlements.<br>
    Le client reconnaît avoir pris connaissance des conditions générales applicables au marché, jointes à ce document.<br>
    Souhaitez-vous conserver les pièces, éléments ou appareils remplacés ? [ ] Oui &nbsp;&nbsp; [ ] Non
  </div>

  <div class="orange-bar">
    Sarl au capital de 50 000 euros &nbsp;·&nbsp; Siret : 500 123 321 00012 &nbsp;·&nbsp; Tva intracommunautaire : FR 25 500 123 321<br>
    Assurance décennale : AssureurPro — 15, rue des assurances 34000 Montpellier — N° 450123
  </div>

</div>

</body>
</html>`

writeFileSync('public/devis-demo.html', html)
console.log('OK — public/devis-demo.html')
