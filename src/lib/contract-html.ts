import { VIVIDFLOW_LOGO_DATA_URI } from '@/lib/contract-logo'
import { JONATHAN_SIGNATURE_DATA_URI } from '@/lib/contract-signature'

export type ContractData = {
  clientName: string; company: string; address: string; phone: string; email: string
  representant: string; amount: number; installments: number; amounts: number[]
  ref: string; date: string; location: string; currency: string
  clientSignature?: string  // data URI PNG de la signature du client (contrat signé électroniquement)
  signedDate?: string       // date de signature électronique (affichée sous la signature client)
}

export type ContractInput = {
  clientName: string; company?: string; address?: string; phone?: string; email?: string
  representant?: string; amount: number; installments: number; amounts: number[]
  ref?: string; currency?: string; clientSignature?: string; signedDate?: string
}

// Normalise le corps de requête en ContractData complet (réf + date générées si absentes).
export function prepareContractData(b: ContractInput): ContractData {
  const now = new Date()
  return {
    clientName: b.clientName,
    company: b.company ?? '',
    address: b.address ?? '',
    phone: b.phone ?? '',
    email: b.email ?? '',
    representant: b.representant ?? b.clientName,
    amount: b.amount,
    installments: b.installments || 1,
    amounts: b.amounts ?? [b.amount],
    ref: b.ref ?? `VF-${now.getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}`,
    date: now.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
    location: 'Genève, CH',
    currency: b.currency ?? 'CHF',
    clientSignature: b.clientSignature,
    signedDate: b.signedDate,
  }
}

function chf(n: number, cur: string) {
  return `${cur} ${n.toLocaleString('fr-CH').replace(/ /g, ' ')}.-`
}

// Payment rows: Démarrage + échéances à +30 / +60 / +90 jours
function paymentRows(d: ContractData) {
  const labels = ['DÉMARRAGE', '+30 JOURS', '+60 JOURS', '+90 JOURS', '+120 JOURS', '+150 JOURS']
  if (d.installments <= 1) {
    return `<div class="pay-row"><span class="pay-k">PAIEMENT UNIQUE</span><span class="pay-v">${chf(d.amount, d.currency)}</span></div>`
  }
  return d.amounts.map((a, i) => `<div class="pay-row"><span class="pay-k">${labels[i] ?? `ÉCHÉANCE ${i + 1}`}</span><span class="pay-v">${chf(a, d.currency)}</span></div>`).join('')
}

export function buildContractHtml(d: ContractData) {
  const header = (page: number) => `
    <div class="topbar">
      <div class="brand"><img class="logo-img" src="${VIVIDFLOW_LOGO_DATA_URI}" alt="VividFlow" /><span>VividFlow</span></div>
      <div class="topmeta">INFRASTRUCTURE IA · AUDIT · WORKFLOWS</div>
      <div class="topmeta">CONTACT<br/><b>HEY@VIVIDFLOW.CO</b></div>
      <div class="topmeta">WEB<br/><b>VIVIDFLOW.CO</b></div>
    </div>`

  const foot = `<div class="footer">VIVIDFLOW.CO &nbsp;/&nbsp; CONTRAT ${d.ref}</div>`

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #16181d; font-size: 9.2px; line-height: 1.62; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .page { width: 210mm; min-height: 297mm; padding: 26px 40px 60px; position: relative; page-break-after: always; }
  .page:last-child { page-break-after: auto; }

  .topbar { display: flex; align-items: flex-start; gap: 34px; padding-bottom: 22px; border-bottom: 1px solid #ECECEC; margin-bottom: 30px; }
  .brand { font-weight: 800; font-size: 15px; letter-spacing: -.2px; flex: 0 0 auto; display: flex; align-items: center; gap: 8px; }
  .brand .logo-img { width: 22px; height: 22px; border-radius: 5px; display: block; }
  .topmeta { font-size: 6.6px; letter-spacing: .8px; color: #9AA0A6; line-height: 1.5; text-transform: uppercase; }
  .topmeta b { color: #16181d; font-weight: 700; }
  .topbar .topmeta:nth-child(2) { flex: 1; }

  .layout { display: grid; grid-template-columns: 150px 1fr; gap: 30px; }
  .side .blk { margin-bottom: 22px; }
  .side .lbl { font-size: 6.4px; letter-spacing: 1px; color: #B0B5BB; text-transform: uppercase; margin-bottom: 4px; }
  .side .val { font-size: 9px; color: #16181d; font-weight: 600; line-height: 1.5; }
  .side .val .muted { color: #8A9097; font-weight: 500; }

  h1 { font-size: 25px; font-weight: 800; letter-spacing: -.6px; line-height: 1.08; margin-bottom: 6px; }
  .lead { font-size: 10px; color: #6B7178; margin-bottom: 22px; }
  .intro { font-size: 9px; color: #4B5158; margin-bottom: 26px; max-width: 92%; }

  .sec { display: grid; grid-template-columns: 24px 1fr; gap: 14px; padding: 16px 0; border-top: 1px solid #F0F0F0; }
  .sec:first-of-type { border-top: none; }
  .sec .num { font-size: 9px; font-weight: 800; color: #C7CCD2; padding-top: 1px; }
  .sec h2 { font-size: 11px; font-weight: 800; margin-bottom: 7px; letter-spacing: -.2px; }
  .sec p { color: #43494F; max-width: 96%; }
  .sec ul { list-style: none; margin-top: 4px; }
  .sec li { padding-left: 14px; position: relative; color: #43494F; margin-bottom: 3px; }
  .sec li:before { content: "—"; position: absolute; left: 0; color: #C7CCD2; }

  .pay { margin-top: 8px; border: 1px solid #16181d; border-radius: 10px; overflow: hidden; max-width: 320px; }
  .pay .total { display: flex; justify-content: space-between; align-items: center; padding: 13px 16px; background: #16181d; color: #fff; }
  .pay .total .tk { font-size: 6.6px; letter-spacing: 1px; text-transform: uppercase; color: #B9BEC6; }
  .pay .total .tv { font-size: 21px; font-weight: 800; }
  .pay-row { display: flex; justify-content: space-between; padding: 8px 16px; border-top: 1px solid #F0F0F0; }
  .pay-row:first-child { border-top: none; }
  .pay-k { font-size: 6.8px; letter-spacing: .8px; color: #9AA0A6; text-transform: uppercase; }
  .pay-v { font-size: 9.4px; font-weight: 700; }

  .callout { margin-top: 16px; background: #16181d; color: #DDE1E6; border-radius: 10px; padding: 14px 16px; max-width: 300px; }
  .callout .ct { font-size: 6.4px; letter-spacing: 1px; color: #FF7A45; text-transform: uppercase; margin-bottom: 5px; }
  .callout p { color: #C4C9D0; font-size: 8.4px; }

  .signwrap { margin-top: 30px; padding-top: 22px; border-top: 1px solid #ECECEC; }
  .signdate { font-size: 9px; color: #6B7178; margin-bottom: 26px; }
  .signs { display: grid; grid-template-columns: 1fr 1fr; gap: 46px; }
  .sign .role { font-size: 6.4px; letter-spacing: 1px; color: #B0B5BB; text-transform: uppercase; margin-bottom: 6px; }
  .sign .who { font-size: 10px; font-weight: 700; }
  .sign .org { font-size: 8.4px; color: #8A9097; }
  .sign .line { border-top: 1px solid #16181d; margin: 8px 0 5px; }
  .sign .sigslot { height: 74px; display: flex; align-items: flex-end; margin: 0 0 -6px 4px; }
  .sign .sigimg { width: 165px; height: auto; max-height: 74px; object-fit: contain; object-position: left bottom; display: block; }
  .sign .sigspace { height: 74px; }
  .sign .esign { margin-top: 5px; font-size: 6.4px; letter-spacing: .6px; color: #1E9E6A; text-transform: uppercase; font-weight: 700; }

  .footer { position: absolute; bottom: 24px; left: 40px; right: 40px; font-size: 6.6px; letter-spacing: 1px; color: #B0B5BB; text-transform: uppercase; border-top: 1px solid #F0F0F0; padding-top: 8px; }
  </style></head><body>

  <!-- PAGE 1 -->
  <div class="page">
    ${header(1)}
    <div class="layout">
      <div class="side">
        <div class="blk"><div class="lbl">Prestataire</div><div class="val">VividFlow LTD<br/><span class="muted">71-75 Shelton Street, Covent Garden, London WC2H 9JQ — United Kingdom</span></div></div>
        <div class="blk"><div class="lbl">Représenté par</div><div class="val">Jonathan Zekhe</div></div>
        <div class="blk"><div class="lbl">Client</div><div class="val">${d.company || d.clientName}<br/><span class="muted">${d.address || '—'}</span></div></div>
        <div class="blk"><div class="lbl">Représenté par</div><div class="val">${d.representant || d.clientName}</div></div>
        <div class="blk"><div class="lbl">Émis le</div><div class="val">${d.date}<br/><span class="muted">${d.location}</span></div></div>
        <div class="blk"><div class="lbl">Réf. contrat</div><div class="val">${d.ref}</div></div>
      </div>
      <div class="main">
        <div style="margin-bottom:6px; font-size:6.4px; letter-spacing:1px; color:#B0B5BB; text-transform:uppercase;">— Contrat d'accompagnement</div>
        <h1>Infrastructure IA<br/>&amp; audit métier</h1>
        <div class="lead">Mise en place, cadrage et accompagnement opérationnel.</div>
        <div class="intro">Entre les soussignés — <b>VividFlow LTD</b> (le Prestataire) et <b>${d.company || d.clientName}</b> (le Client) — il a été convenu ce qui suit.</div>

        <div class="sec"><div class="num">01</div><div><h2>Objet du contrat</h2>
          <p>Le présent contrat a pour objet la mise en place d'une première infrastructure d'intelligence artificielle pour ${d.company || d.clientName}, ainsi qu'un accompagnement de conseil destiné à identifier, cadrer et servir les cas d'usage prioritaires. La prestation vise notamment à assister le client sur ses processus internes, l'analyse documentaire, la gestion des informations métier et les premiers workflows liés au back-office et aux relations.</p></div></div>

        <div class="sec"><div class="num">02</div><div><h2>Description de la mission</h2>
          <p>La mission comprend :</p>
          <ul>
            <li>audit initial des processus, outils, priorités et points de friction ;</li>
            <li>cadrage des cas d'usage IA prioritaires ;</li>
            <li>mise en place d'un environnement technique dédié (de type serveur / VPS) ;</li>
            <li>installation et configuration des briques IA nécessaires selon faisabilité ;</li>
            <li>structuration d'une base de connaissance métier initiale ;</li>
            <li>mise en place de principes de sécurité, confidentialité et contrôle des accès ;</li>
            <li>documentation simple de l'infrastructure et des usages ;</li>
            <li>trois appels de consulting pour cadrage, suivi et prise en main.</li>
          </ul></div></div>

        <div class="sec"><div class="num">03</div><div><h2>Sécurité, données &amp; confidentialité</h2>
          <p>Les méthodes, automatisations par le Client restent confidentielles. Le Prestataire applique un cadrage de minimisation des accès et ne demande que les informations nécessaires à l'exécution de la mission. Les accès automatisés touchant des clients, contrats, sinistres ou données sensibles doivent rester soumis à validation humaine, sauf accord écrit contraire. Le Client reste responsable de ses obligations professionnelles, réglementaires et contractuelles, notamment dans le secteur de l'assurance.</p></div></div>
      </div>
    </div>
    ${foot}
  </div>

  <!-- PAGE 2 -->
  <div class="page">
    ${header(2)}
    <div class="layout">
      <div class="side">
        <div class="blk"><div class="lbl">Section</div><div class="val">Périmètre, prix &amp; obligations</div></div>
        <div class="blk"><div class="lbl">Articles</div><div class="val"><span class="muted">04 · Limites de la prestation<br/>05 · Conditions financières<br/>06 · Obligations des parties<br/>07 · Absence de garantie</span></div></div>
      </div>
      <div class="main">
        <div class="sec" style="border-top:none;"><div class="num">04</div><div><h2>Limites de la prestation</h2>
          <p>Ne sont pas inclus, sauf accord complémentaire écrit :</p>
          <ul>
            <li>développement lourd ou sur-mesure hors périmètre ;</li>
            <li>maintenance illimitée ou support continu après la livraison initiale ;</li>
            <li>coûts d'hébergement, licences, API, outils tiers ou fournisseurs externes ;</li>
            <li>audit juridique, conformité réglementaire formelle ou certification.</li>
          </ul></div></div>

        <div class="sec"><div class="num">05</div><div><h2>Conditions financières</h2>
          <p>Le montant total de la prestation est fixé comme suit, hors frais externes &amp; outils tiers :</p>
          <div class="pay">
            <div class="total"><div class="tk">Montant total<br/>Prestation</div><div class="tv">${chf(d.amount, d.currency)}</div></div>
            ${paymentRows(d)}
          </div></div></div>

        <div class="sec"><div class="num">06</div><div><h2>Obligations des parties</h2>
          <p>Le Prestataire s'engage à mettre en œuvre les moyens techniques et opérationnels nécessaires à la mission décrite ci-dessus, avec sérieux et confidentialité. Le Client s'engage à fournir les accès, informations, documents et validations nécessaires à l'avancement de la mission.</p></div></div>

        <div class="sec"><div class="num">07</div><div><h2>Absence de garantie de résultat</h2>
          <p>Le Prestataire fournit une prestation de conseil, d'installation et d'accompagnement. Les résultats opérationnels dépendent notamment de la qualité des informations fournies, des accès disponibles et de l'adoption par les équipes du Client. Aucune garantie de résultat chiffré n'est donnée, le travail restant soumis aux réalités techniques et organisationnelles du Client.</p></div></div>
      </div>
    </div>
    ${foot}
  </div>

  <!-- PAGE 3 -->
  <div class="page">
    ${header(3)}
    <div class="layout">
      <div class="side">
        <div class="blk"><div class="lbl">Clôture, droit &amp; signatures</div><div class="val"><span class="muted"></span></div></div>
        <div class="blk"><div class="lbl">Articles</div><div class="val"><span class="muted">08 · Propriété intellectuelle<br/>09 · Résiliation<br/>10 · Droit applicable</span></div></div>
      </div>
      <div class="main">
        <div class="sec" style="border-top:none;"><div class="num">08</div><div><h2>Propriété intellectuelle</h2>
          <p>Les livrables, configurations et documentations produits dans le cadre de la mission sont remis au Client pour son usage interne. Les méthodes, savoir-faire et briques génériques du Prestataire restent sa propriété.</p></div></div>

        <div class="sec"><div class="num">09</div><div><h2>Résiliation</h2>
          <p>En cas de manquement grave, chaque partie pourra demander la correction du manquement par écrit. À défaut de correction dans un délai raisonnable, le contrat pourra être résilié. Les montants correspondant au travail déjà engagé restent dus.</p></div></div>

        <div class="sec"><div class="num">10</div><div><h2>Droit applicable &amp; juridiction</h2>
          <p>Le présent contrat est régi par le droit suisse. Tout litige sera soumis aux tribunaux compétents en Suisse, sous réserve des règles impératives applicables.</p>
          <div class="callout"><div class="ct">Juridiction</div><p>Droit suisse. Tribunaux compétents en Suisse — sous réserve des règles impératives applicables au Client et au Prestataire.</p></div></div></div>

        <div class="signwrap">
          <div style="font-size:6.4px; letter-spacing:1px; color:#B0B5BB; text-transform:uppercase; margin-bottom:10px;">— Signatures</div>
          <div class="signdate">Fait le ${d.date}, en deux exemplaires originaux. Chaque partie reconnaît avoir lu et accepté l'intégralité des dispositions du présent contrat.</div>
          <div class="signs">
            <div class="sign"><div class="role">Pour le Prestataire</div><div class="sigslot"><img class="sigimg" src="${JONATHAN_SIGNATURE_DATA_URI}" alt="Signature Jonathan Zekhe" /></div><div class="line"></div><div class="who">Jonathan Zekhe</div><div class="org">VividFlow LTD</div></div>
            <div class="sign"><div class="role">Pour le Client</div><div class="sigslot">${d.clientSignature ? `<img class="sigimg" src="${d.clientSignature}" alt="Signature client" />` : ''}</div><div class="line"></div><div class="who">${d.representant || d.clientName}</div><div class="org">${d.company || d.clientName}</div>${d.clientSignature ? `<div class="esign">Signé électroniquement${d.signedDate ? ` le ${d.signedDate}` : ''}</div>` : ''}</div>
          </div>
        </div>
      </div>
    </div>
    ${foot}
  </div>

  </body></html>`
}
