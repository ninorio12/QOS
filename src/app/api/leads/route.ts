import { getPipelines } from '@/lib/ghl'

const GHL_API_KEY     = process.env.GHL_API_KEY!
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID!
const GHL_BASE_URL    = process.env.GHL_BASE_URL ?? 'https://services.leadconnectorhq.com'

const HEADERS = {
  Authorization:  `Bearer ${GHL_API_KEY}`,
  Version:        '2021-07-28',
  'Content-Type': 'application/json',
}

export async function POST(req: Request) {
  try {
    const { name, phone, pipeline: pipelineName, value } = (await req.json()) as {
      name: string
      phone?: string
      pipeline: string
      value?: string
    }

    if (!name?.trim()) {
      return Response.json({ error: 'name required' }, { status: 400 })
    }

    const pipelines = await getPipelines()
    const pipeline  = pipelines.find(p =>
      p.name.toUpperCase().includes(pipelineName?.toUpperCase() ?? 'ACQUISITION')
    ) ?? pipelines[0]

    if (!pipeline) return Response.json({ error: 'no pipeline found' }, { status: 400 })

    const firstStage = [...pipeline.stages].sort((a, b) => a.position - b.position)[0]
    if (!firstStage) return Response.json({ error: 'no stage found' }, { status: 400 })

    // Create contact
    let contactId: string | undefined
    const cRes = await fetch(`${GHL_BASE_URL}/contacts/`, {
      method:  'POST',
      headers: HEADERS,
      body: JSON.stringify({ locationId: GHL_LOCATION_ID, name: name.trim(), phone: phone || undefined }),
    })
    if (cRes.ok) {
      const cData = (await cRes.json()) as { contact?: { id: string } }
      contactId = cData.contact?.id
    }

    // Create opportunity
    const oRes = await fetch(`${GHL_BASE_URL}/opportunities/`, {
      method:  'POST',
      headers: HEADERS,
      body: JSON.stringify({
        locationId:      GHL_LOCATION_ID,
        pipelineId:      pipeline.id,
        pipelineStageId: firstStage.id,
        name:            name.trim(),
        monetaryValue:   Number(value) || 0,
        status:          'open',
        contactId,
      }),
    })

    if (!oRes.ok) {
      const err = await oRes.text()
      return Response.json({ error: err }, { status: 400 })
    }

    return Response.json({ success: true })
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
