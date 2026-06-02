import { NextRequest } from 'next/server'
import { generatePdfBuffer } from '@/lib/pdf'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function buildContractHtml(d: {
  clientName: string; company: string; address: string; phone: string; email: string;
  amount: number; installments: number; amounts: number[]; date: string
}) {
  const fmt = (n: number) => `${n.toLocaleString('fr-FR')} €`
  const paymentRows = d.installments > 1
    ? d.amounts.map((a, i) => `<tr><td>Échéance ${i + 1}</td><td style="text-align:right">${fmt(a)}</td></tr>`).join('')
    : `<tr><td>Paiement unique</td><td style="text-align:right">${fmt(d.amount)}</td></tr>`

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1a1a1a; padding: 48px 56px; font-size: 13px; line-height: 1.6; }
    h1 { font-size: 26px; font-weight: 800; margin-bottom: 4px; }
    .sub { color: #888; font-size: 12px; margin-bottom: 32px; }
    .section { margin-bottom: 28px; }
    .section h2 { font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #FF4D00; margin-bottom: 10px; }
    .grid { display: grid; grid-template-columns: 140px 1fr; row-gap: 6px; }
    .grid .k { color: #888; }
    .grid .val { font-weight: 600; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    td { padding: 8px 0; border-bottom: 1px solid #eee; }
    .total { font-weight: 800; font-size: 16px; }
    .total td { border-top: 2px solid #111; border-bottom: none; padding-top: 12px; }
    .terms { font-size: 11px; color: #555; line-height: 1.7; }
    .sign { margin-top: 48px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
    .sign .box { border-top: 1px solid #111; padding-top: 8px; font-size: 11px; color: #888; }
    .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 36px; }
    .brand { font-weight: 800; font-size: 18px; }
  </style></head><body>
    <div class="header">
      <div><div class="brand">VividFlow</div><div class="sub">Data OS — Service Execution</div></div>
      <div style="text-align:right; font-size:11px; color:#888;">Contrat de prestation<br/>${d.date}</div>
    </div>
    <h1>Contrat de prestation de services</h1>
    <div class="sub">Entre VividFlow et ${d.company || d.clientName}</div>

    <div class="section">
      <h2>Client</h2>
      <div class="grid">
        <div class="k">Nom / Société</div><div class="val">${d.company || d.clientName}</div>
        <div class="k">Représentant</div><div class="val">${d.clientName}</div>
        <div class="k">Adresse</div><div class="val">${d.address || '—'}</div>
        <div class="k">Téléphone</div><div class="val">${d.phone || '—'}</div>
        <div class="k">Email</div><div class="val">${d.email || '—'}</div>
      </div>
    </div>

    <div class="section">
      <h2>Montant & Modalités de paiement</h2>
      <table>
        ${paymentRows}
        <tr class="total"><td>Total</td><td style="text-align:right">${fmt(d.amount)}</td></tr>
      </table>
      <p style="margin-top:8px; font-size:11px; color:#888;">${d.installments > 1 ? `Paiement échelonné en ${d.installments} fois.` : 'Paiement en une fois.'}</p>
    </div>

    <div class="section">
      <h2>Conditions</h2>
      <p class="terms">
        Le présent contrat formalise l'accord de prestation entre VividFlow et le client mentionné ci-dessus.
        VividFlow s'engage à fournir les services convenus dans le cadre de l'accompagnement. Le client s'engage
        à régler les montants selon les modalités définies. Toute modification fera l'objet d'un avenant écrit.
        Les présentes conditions sont régies par le droit applicable.
      </p>
    </div>

    <div class="sign">
      <div class="box">Signature VividFlow</div>
      <div class="box">Signature Client (précédée de « Lu et approuvé »)</div>
    </div>
  </body></html>`
}

export async function POST(req: NextRequest) {
  try {
    const d = await req.json() as {
      clientName: string; company?: string; address?: string; phone?: string; email?: string;
      amount: number; installments: number; amounts: number[]; preview?: boolean
    }
    const html = buildContractHtml({
      clientName: d.clientName, company: d.company ?? '', address: d.address ?? '',
      phone: d.phone ?? '', email: d.email ?? '', amount: d.amount,
      installments: d.installments || 1, amounts: d.amounts ?? [],
      date: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
    })
    const pdf = await generatePdfBuffer(html)
    return new Response(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${d.preview ? 'inline' : 'attachment'}; filename="contrat-${(d.company || d.clientName).replace(/[^a-z0-9]/gi, '-')}.pdf"`,
      },
    })
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
