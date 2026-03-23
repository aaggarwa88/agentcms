import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET ?? 'fallback-secret')

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Extract project slug from /p/[slug] or /p/[slug]/[dataset]
  const match = pathname.match(/^\/p\/([^/]+)/)
  if (!match) return NextResponse.next()

  const projectSlug = match[1]

  // Don't protect the login page itself
  if (pathname === `/p/${projectSlug}/login`) return NextResponse.next()

  const token = req.cookies.get('agentcms_session')?.value

  if (token) {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET)
      // Session must be scoped to this project
      if (payload.projectSlug === projectSlug) {
        return NextResponse.next()
      }
    } catch {
      // Invalid or expired token — fall through to redirect
    }
  }

  const loginUrl = new URL(`/p/${projectSlug}/login`, req.url)
  loginUrl.searchParams.set('redirect', pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ['/p/:slug*'],
}
