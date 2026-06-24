import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/knowledge/docs → list all
// GET /api/knowledge/docs?slug=xxx → get one
export async function GET(req: NextRequest) {
  const supabase = createAdminClient()
  const slug = req.nextUrl.searchParams.get('slug')

  if (slug) {
    const { data, error } = await supabase
      .from('knowledge_docs')
      .select('*')
      .eq('slug', slug)
      .single()
    if (error) {
      return NextResponse.json({ doc: null })
    }
    return NextResponse.json({ doc: data })
  }

  const { data, error } = await supabase
    .from('knowledge_docs')
    .select('id, slug, title, updated_at, updated_by')
    .order('updated_at', { ascending: false })

  if (error) {
    return NextResponse.json({ docs: [] })
  }
  return NextResponse.json({ docs: data ?? [] })
}

// POST /api/knowledge/docs → upsert { slug, title, content }
export async function POST(req: NextRequest) {
  const supabase = createAdminClient()
  const body = await req.json() as { slug: string; title: string; content: string; updated_by?: string }

  const { data, error } = await supabase
    .from('knowledge_docs')
    .upsert({
      slug:       body.slug,
      title:      body.title,
      content:    body.content,
      updated_by: body.updated_by ?? 'thomas',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'slug' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ doc: data })
}

// DELETE /api/knowledge/docs → delete by slug in body
export async function DELETE(req: NextRequest) {
  const supabase = createAdminClient()
  const { slug } = await req.json() as { slug: string }
  if (!slug) return NextResponse.json({ error: 'slug requis' }, { status: 400 })

  const { error } = await supabase.from('knowledge_docs').delete().eq('slug', slug)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ deleted: slug })
}
