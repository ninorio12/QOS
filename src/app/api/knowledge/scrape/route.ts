import { createClient } from '@/lib/supabase/server'

function extractText(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 6000)
}

export async function POST() {
  const supabase = await createClient()

  const { data: settings } = await supabase
    .from('company_settings')
    .select('website_url, company_doc')
    .single()

  if (!settings?.website_url) {
    return Response.json({ error: 'no_url' }, { status: 400 })
  }

  let scraped: string
  try {
    const res = await fetch(settings.website_url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VividFlowBot/1.0)' },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    scraped = extractText(await res.text())
  } catch (err) {
    return Response.json({ error: `Impossible de joindre le site : ${String(err)}` }, { status: 502 })
  }

  const date = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const section = `\n\n---\n## Contenu scrapé le ${date} — ${settings.website_url}\n\n${scraped}`

  const current = settings.company_doc ?? ''
  // Remplace l'ancienne section scrapée si elle existe, sinon ajoute à la fin
  const marker = '\n\n---\n## Contenu scrapé'
  const base = current.includes(marker) ? current.slice(0, current.indexOf(marker)) : current
  const newDoc = base + section

  await supabase
    .from('company_settings')
    .update({ company_doc: newDoc, updated_at: new Date().toISOString() })
    .eq('id', '00000000-0000-0000-0000-000000000001')

  return Response.json({ company_doc: newDoc })
}
