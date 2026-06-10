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
