import { Resend } from 'resend'

function getResend() {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error('RESEND_API_KEY manquante')
  return new Resend(key)
}

export interface SendDevisEmailParams {
  to:            string
  contactName:   string | null
  devisNumero:   string | null
  devisTitre:    string
  montantHT:     number
  montantTTC:    number
  signatureUrl:  string
  pdfBuffer:     Buffer | null
  companyName:   string
  companyEmail:  string
  brandColor:    string
}

function fmtEUR(n: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'CHF' }).format(n)
}

function buildEmailHtml(p: SendDevisEmailParams): string {
  const prenom = p.contactName ? p.contactName.trim().split(/\s+/)[0] : null
  const greeting = prenom ? `👋 Bonjour ${prenom},` : '👋 Bonjour,'
  const ref = p.devisNumero ? `Devis n°${p.devisNumero}` : 'Votre devis'

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${ref} — ${p.devisTitre}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f0;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f0;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.07);">

          <!-- Header -->
          <tr>
            <td style="background:${p.brandColor};padding:28px 36px;">
              <p style="margin:0;font-size:13px;font-weight:700;color:#111111;text-transform:uppercase;letter-spacing:1px;">${p.companyName}</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 36px 28px;">
              <p style="margin:0 0 16px;font-size:15px;color:#374151;">${greeting}</p>
              <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
                Veuillez trouver ci-joint votre devis pour votre prochain projet, prêt à être signé électroniquement.
              </p>

              <!-- Montants -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f7;border-radius:12px;margin-bottom:28px;">
                <tr>
                  <td style="padding:16px 20px;border-right:1px solid #e5e7eb;" align="center">
                    <p style="margin:0 0 4px;font-size:10px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:.6px;">Total HT</p>
                    <p style="margin:0;font-size:18px;font-weight:700;color:#111111;">${fmtEUR(p.montantHT)}</p>
                  </td>
                  <td style="padding:16px 20px;" align="center">
                    <p style="margin:0 0 4px;font-size:10px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:.6px;">Total TTC</p>
                    <p style="margin:0;font-size:18px;font-weight:700;color:#111111;">${fmtEUR(p.montantTTC)}</p>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td align="center">
                    <a href="${p.signatureUrl}"
                       style="display:inline-block;background:#111111;color:#ffffff;text-decoration:none;font-size:13px;font-weight:700;padding:14px 32px;border-radius:12px;letter-spacing:.3px;">
                      ✍️ Signer mon devis
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;font-size:12px;color:#9ca3af;">
                Ou copiez ce lien dans votre navigateur :<br/>
                <a href="${p.signatureUrl}" style="color:#3462EE;font-size:11px;word-break:break-all;">${p.signatureUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9f9f7;padding:20px 36px;border-top:1px solid #f0f0ee;">
              <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.6;">
                ${p.companyName}${p.companyEmail ? ` · <a href="mailto:${p.companyEmail}" style="color:#9ca3af;">${p.companyEmail}</a>` : ''}
                <br/>Ce devis est valable 30 jours à compter de sa date d'émission.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// ─── Email d'invitation (compte Data OS) ───────────────────────────────────────

export interface SendInviteEmailParams {
  to:         string
  firstName:  string | null
  message:    string | null   // message personnalisé libre saisi par l'admin
  inviteUrl:  string
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function buildInviteHtml(p: SendInviteEmailParams): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://data-os.vividflow.co'
  const logoUrl = `${appUrl}/vividflow-logo.png`
  const greeting = p.firstName ? `👋 Bonjour ${escapeHtml(p.firstName)},` : '👋 Bonjour,'
  const msgBlock = p.message
    ? `<table width="100%" cellpadding="0" cellspacing="0" style="background:#fff5f0;border-left:3px solid #FF4D00;border-radius:8px;margin:0 0 24px;">
         <tr><td style="padding:16px 20px;font-size:14px;color:#374151;line-height:1.6;font-style:italic;">${escapeHtml(p.message).replace(/\n/g, '<br/>')}</td></tr>
       </table>`
    : ''

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>Invitation VividFlow</title></head>
<body style="margin:0;padding:0;background:#f5f5f0;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f0;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.07);">
        <tr><td style="background:#FF4D00;height:4px;line-height:4px;font-size:0;">&nbsp;</td></tr>
        <tr><td style="background:#ffffff;padding:24px 36px;border-bottom:1px solid #f0f0ee;">
          <table cellpadding="0" cellspacing="0"><tr>
            <td style="padding-right:12px;vertical-align:middle;"><img src="${logoUrl}" width="40" height="40" alt="VividFlow" style="display:block;border-radius:10px;" /></td>
            <td style="vertical-align:middle;font-size:18px;font-weight:800;color:#111111;letter-spacing:-.3px;">VividFlow</td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:36px 36px 28px;">
          <p style="margin:0 0 16px;font-size:15px;color:#374151;">${greeting}</p>
          <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
            Vous êtes invité·e à rejoindre l'espace <strong>VividFlow</strong>. Cliquez ci-dessous pour créer votre compte et accéder à votre tableau de bord.
          </p>
          ${msgBlock}
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;"><tr><td align="center">
            <a href="${p.inviteUrl}" style="display:inline-block;background:#111111;color:#ffffff;text-decoration:none;font-size:13px;font-weight:700;padding:14px 32px;border-radius:12px;letter-spacing:.3px;">
              Rejoindre VividFlow
            </a>
          </td></tr></table>
          <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">
            Le bouton ne fonctionne pas ?
            <a href="${p.inviteUrl}" style="color:#3462EE;text-decoration:underline;">Ouvrez votre lien d'invitation ici</a>.
          </p>
        </td></tr>
        <tr><td style="background:#f9f9f7;padding:20px 36px;border-top:1px solid #f0f0ee;">
          <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.6;">VividFlow · Cette invitation vous a été envoyée par un administrateur de l'espace.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function sendInviteEmail(p: SendInviteEmailParams): Promise<void> {
  const from = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'
  await getResend().emails.send({
    from,
    to: p.to,
    subject: 'Vous êtes invité·e sur VividFlow',
    html: buildInviteHtml(p),
  })
}

// ── Email d'onboarding : invite le client à remplir son formulaire (lien public). ──
function buildOnboardingFormHtml(p: { firstName?: string | null; formUrl: string }): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://data-os.vividflow.co'
  const logoUrl = `${appUrl}/vividflow-logo.png`
  const greeting = p.firstName ? `👋 Bonjour ${escapeHtml(p.firstName)},` : '👋 Bonjour,'
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>Formulaire d'onboarding VividFlow</title></head>
<body style="margin:0;padding:0;background:#f5f5f0;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f0;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.07);">
        <tr><td style="background:#FF4D00;height:4px;line-height:4px;font-size:0;">&nbsp;</td></tr>
        <tr><td style="background:#ffffff;padding:24px 36px;border-bottom:1px solid #f0f0ee;">
          <table cellpadding="0" cellspacing="0"><tr>
            <td style="padding-right:12px;vertical-align:middle;"><img src="${logoUrl}" width="40" height="40" alt="VividFlow" style="display:block;border-radius:10px;" /></td>
            <td style="vertical-align:middle;font-size:18px;font-weight:800;color:#111111;letter-spacing:-.3px;">VividFlow</td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:36px 36px 28px;">
          <p style="margin:0 0 16px;font-size:15px;color:#374151;">${greeting}</p>
          <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
            Bienvenue chez <strong>VividFlow</strong> ! Pour démarrer votre accompagnement, merci de remplir votre <strong>formulaire d'onboarding</strong> (quelques minutes). Vos réponses nous permettent de tout préparer pour votre kickoff.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;"><tr><td align="center">
            <a href="${p.formUrl}" style="display:inline-block;background:#FF4D00;color:#ffffff;text-decoration:none;font-size:13px;font-weight:700;padding:14px 32px;border-radius:12px;letter-spacing:.3px;">
              Remplir mon formulaire
            </a>
          </td></tr></table>
          <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">
            Le bouton ne fonctionne pas ?
            <a href="${p.formUrl}" style="color:#3462EE;text-decoration:underline;">Ouvrez votre formulaire ici</a>.
          </p>
        </td></tr>
        <tr><td style="background:#f9f9f7;padding:20px 36px;border-top:1px solid #f0f0ee;">
          <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.6;">VividFlow · Votre équipe vous accompagne à chaque étape.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function sendOnboardingFormEmail(p: { to: string; firstName?: string | null; formUrl: string }): Promise<void> {
  const from = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'
  await getResend().emails.send({
    from,
    to: p.to,
    subject: "Votre formulaire d'onboarding VividFlow",
    html: buildOnboardingFormHtml(p),
  })
}

// ── Email Profit Map : envoie la synthèse d'audit (PDF en pièce jointe). ──
function buildAuditSynthesisHtml(p: { firstName?: string | null; company?: string | null }): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://data-os.vividflow.co'
  const logoUrl = `${appUrl}/vividflow-logo.png`
  const greeting = p.firstName ? `Bonjour ${escapeHtml(p.firstName)},` : 'Bonjour,'
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>Profit Map VividFlow</title></head>
<body style="margin:0;padding:0;background:#f5f5f0;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f0;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.07);">
        <tr><td style="background:#FF4D00;height:4px;line-height:4px;font-size:0;">&nbsp;</td></tr>
        <tr><td style="background:#ffffff;padding:24px 36px;border-bottom:1px solid #f0f0ee;">
          <table cellpadding="0" cellspacing="0"><tr>
            <td style="padding-right:12px;vertical-align:middle;"><img src="${logoUrl}" width="40" height="40" alt="VividFlow" style="display:block;border-radius:10px;" /></td>
            <td style="vertical-align:middle;font-size:18px;font-weight:800;color:#111111;letter-spacing:-.3px;">VividFlow</td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:36px 36px 28px;">
          <p style="margin:0 0 16px;font-size:15px;color:#374151;">${greeting}</p>
          <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
            Vous trouverez ci-joint votre <strong>Profit Map</strong> : la synthèse de l'audit opérationnel réalisé avec vous (cartographie du temps, gains de productivité et plan de délégation au système opérationnel).
          </p>
          <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">
            Le document PDF est en pièce jointe de cet email.
          </p>
        </td></tr>
        <tr><td style="background:#f9f9f7;padding:20px 36px;border-top:1px solid #f0f0ee;">
          <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.6;">VividFlow · Synthèse d'audit préparée par Jonathan Zekhe.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function sendAuditSynthesisEmail(p: {
  to: string
  firstName?: string | null
  company?: string | null
  pdfBuffer: Buffer
  fileName?: string
}): Promise<void> {
  const from = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'
  await getResend().emails.send({
    from,
    to: p.to,
    subject: "Votre Profit Map : synthèse de l'audit VividFlow",
    html: buildAuditSynthesisHtml(p),
    attachments: [{ filename: p.fileName ?? 'Profit Map.pdf', content: p.pdfBuffer }],
  })
}

// ── Email contrat : envoie le contrat d'accompagnement (PDF en pièce jointe). ──
// signed=true → copie de validation après signature électronique (wording différent).
function buildContractHtml(p: { firstName?: string | null; company?: string | null; signed?: boolean }): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://data-os.vividflow.co'
  const logoUrl = `${appUrl}/vividflow-logo.png`
  const greeting = p.firstName ? `👋 Bonjour ${escapeHtml(p.firstName)},` : '👋 Bonjour,'
  const intro = p.signed
    ? `Veuillez trouver ci-joint votre <strong>contrat d'accompagnement VividFlow signé</strong>.`
    : `Veuillez trouver ci-joint votre <strong>contrat d'accompagnement VividFlow</strong>${p.company ? ` pour <strong>${escapeHtml(p.company)}</strong>` : ''}.`
  const returnBox = p.signed ? '' : `
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff5f0;border-left:3px solid #FF4D00;border-radius:8px;margin:0 0 24px;"><tr>
            <td style="padding:16px 20px;font-size:14px;color:#374151;line-height:1.6;">
              <strong>👉 Merci de nous renvoyer le contrat signé</strong> en réponse à cet email pour démarrer la mission.<br/>
              Relisez-le, signez-le (manuscrit ou électronique), puis répondez à cet email en joignant le PDF signé.
            </td>
          </tr></table>`
  const footer = p.signed
    ? 'VividFlow · Signature électronique sécurisée. Vous recevrez une copie du contrat signé.'
    : 'VividFlow · Votre équipe vous accompagne à chaque étape.'
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>Votre contrat VividFlow</title></head>
<body style="margin:0;padding:0;background:#f5f5f0;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f0;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.07);">
        <tr><td style="background:#FF4D00;height:4px;line-height:4px;font-size:0;">&nbsp;</td></tr>
        <tr><td style="background:#ffffff;padding:24px 36px;border-bottom:1px solid #f0f0ee;">
          <table cellpadding="0" cellspacing="0"><tr>
            <td style="padding-right:12px;vertical-align:middle;"><img src="${logoUrl}" width="40" height="40" alt="VividFlow" style="display:block;border-radius:10px;" /></td>
            <td style="vertical-align:middle;font-size:18px;font-weight:800;color:#111111;letter-spacing:-.3px;">VividFlow</td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:36px 36px 28px;">
          <p style="margin:0 0 16px;font-size:15px;color:#374151;">${greeting}</p>
          <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6;">
            ${intro}
          </p>${returnBox}
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f7;border-radius:12px;margin-bottom:28px;"><tr>
            <td style="padding:16px 20px;font-size:13px;color:#374151;line-height:1.6;">
              📎 <strong>Contrat (PDF)</strong> en pièce jointe de cet email.
            </td>
          </tr></table>
          <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">
            Une question sur le contrat ? Répondez simplement à cet email.
          </p>
        </td></tr>
        <tr><td style="background:#f9f9f7;padding:20px 36px;border-top:1px solid #f0f0ee;">
          <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.6;">${footer}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// ── Email signature électronique : invite le client à signer en ligne (lien /signer/<id>). ──
function buildContractSignatureHtml(p: { firstName?: string | null; company?: string | null; signUrl: string }): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://data-os.vividflow.co'
  const logoUrl = `${appUrl}/vividflow-logo.png`
  const greeting = p.firstName ? `👋 Bonjour ${escapeHtml(p.firstName)},` : '👋 Bonjour,'
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>Signez votre contrat VividFlow</title></head>
<body style="margin:0;padding:0;background:#f5f5f0;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f0;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.07);">
        <tr><td style="background:#FF4D00;height:4px;line-height:4px;font-size:0;">&nbsp;</td></tr>
        <tr><td style="background:#ffffff;padding:24px 36px;border-bottom:1px solid #f0f0ee;">
          <table cellpadding="0" cellspacing="0"><tr>
            <td style="padding-right:12px;vertical-align:middle;"><img src="${logoUrl}" width="40" height="40" alt="VividFlow" style="display:block;border-radius:10px;" /></td>
            <td style="vertical-align:middle;font-size:18px;font-weight:800;color:#111111;letter-spacing:-.3px;">VividFlow</td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:36px 36px 28px;">
          <p style="margin:0 0 20px;font-size:15px;color:#374151;">${greeting}</p>
          <p style="margin:0 0 18px;font-size:15px;color:#374151;line-height:1.6;">
            Votre <strong>contrat d'accompagnement VividFlow</strong> est prêt.
          </p>
          <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
            Vous pouvez le relire et le signer en ligne en quelques secondes, directement depuis cette page sécurisée :
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;"><tr><td align="center">
            <a href="${p.signUrl}" style="display:inline-block;background:#111111;color:#ffffff;text-decoration:none;font-size:13px;font-weight:700;padding:14px 32px;border-radius:12px;letter-spacing:.3px;">
              Signature électronique
            </a>
          </td></tr></table>
          <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">
            Le bouton ne fonctionne pas ?
            <a href="${p.signUrl}" style="color:#3462EE;text-decoration:underline;">Ouvrez le lien ici</a>.
          </p>
        </td></tr>
        <tr><td style="background:#f9f9f7;padding:20px 36px;border-top:1px solid #f0f0ee;">
          <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.6;">VividFlow · Signature électronique sécurisée. Vous recevrez une copie du contrat signé.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function sendContractSignatureEmail(p: { to: string; firstName?: string | null; company?: string | null; signUrl: string }): Promise<void> {
  const from = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'
  await getResend().emails.send({
    from,
    to: p.to,
    subject: 'Votre contrat VividFlow est prêt à être signé',
    html: buildContractSignatureHtml(p),
  })
}

export async function sendContractEmail(p: { to: string; firstName?: string | null; company?: string | null; pdfBuffer: Buffer; fileName?: string; signed?: boolean }): Promise<void> {
  const from = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'
  await getResend().emails.send({
    from,
    to: p.to,
    subject: p.signed ? 'Votre contrat VividFlow signé' : "Votre contrat d'accompagnement VividFlow",
    html: buildContractHtml(p),
    attachments: [{ filename: p.fileName ?? 'contrat-vividflow.pdf', content: p.pdfBuffer }],
  })
}

export async function sendDevisEmail(params: SendDevisEmailParams): Promise<void> {
  const html = buildEmailHtml(params)

  const attachments: { filename: string; content: Buffer }[] = []
  if (params.pdfBuffer) {
    const label = params.devisNumero
      ? `Devis-${params.devisNumero}`
      : `Devis-${params.devisTitre.slice(0, 30).replace(/[^a-zA-Z0-9-_]/g, '_')}`
    attachments.push({ filename: `${label}.pdf`, content: params.pdfBuffer })
  }

  const from = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'
  const subject = params.devisNumero
    ? `Votre devis n°${params.devisNumero} — ${params.devisTitre}`
    : `Votre devis — ${params.devisTitre}`

  await getResend().emails.send({
    from,
    to: params.to,
    subject,
    html,
    ...(attachments.length > 0 ? { attachments } : {}),
  })
}
