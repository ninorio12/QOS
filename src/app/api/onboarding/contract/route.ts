import { NextRequest } from 'next/server'
import { generatePdfBuffer } from '@/lib/pdf'
import { buildContractHtml, prepareContractData, type ContractInput } from '@/lib/contract-html'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const b = await req.json() as ContractInput & { preview?: boolean }
    const data = prepareContractData(b)
    const pdf = await generatePdfBuffer(buildContractHtml(data))
    return new Response(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${b.preview ? 'inline' : 'attachment'}; filename="contrat-${(data.company || data.clientName).replace(/[^a-z0-9]/gi, '-')}.pdf"`,
      },
    })
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
