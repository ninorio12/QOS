import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const PUBLIC_PATHS = ['/formulaire', '/signer', '/login']
  if (PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))) return NextResponse.next()
  if (pathname.startsWith('/api/')) return NextResponse.next()
  return NextResponse.next() // Dev mode: bypass auth
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
