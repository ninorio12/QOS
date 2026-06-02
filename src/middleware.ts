import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const PUBLIC_PATHS = ['/formulaire', '/signer', '/login']
const PUBLIC_API_PREFIXES = [
  '/api/leads/capture',
  '/api/chatbot',
  '/api/webhooks',
]

const SIGNED_API_PATHS = [
  '/api/admin',
  '/api/agent-executor',
  '/api/telegram/hermes',
  '/api/telegram/webhook',
]

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(`${p}/`))
}

function isPublicApi(pathname: string) {
  return PUBLIC_API_PREFIXES.some(p => pathname === p || pathname.startsWith(`${p}/`))
}

function isSignedApi(pathname: string) {
  return SIGNED_API_PATHS.some(p => pathname === p || pathname.startsWith(`${p}/`))
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (isPublicPath(pathname) || isPublicApi(pathname) || isSignedApi(pathname)) {
    return NextResponse.next()
  }

  // Auth bypassed temporarily
  return NextResponse.next()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    if (process.env.NODE_ENV === 'development') return NextResponse.next()
    return NextResponse.json({ error: 'Auth configuration missing' }, { status: 500 })
  }

  let response = NextResponse.next({ request })
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    // Auth bypassed temporarily
    return NextResponse.next()
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
