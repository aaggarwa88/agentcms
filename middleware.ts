import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

function getJwtSecret() {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET env var is not set')
  return new TextEncoder().encode(process.env.JWT_SECRET)
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Extract project slug from /p/[slug] or /p/[slug]/[dataset]
  const match = pathname.match(/^\/p\/([^/]+)/)
  if (!match) return NextResponse.next()

  const projectSlug = match[1]

  // Don't protect the login page or public preview routes
  if (pathname === `/p/${projectSlug}/login`) return NextResponse.next()
  if (pathname.startsWith(`/p/${projectSlug}/preview`)) return NextResponse.next()

  const token = req.cookies.get('agentcms_session')?.value

  if (token) {
    try {
      const { payload } = await jwtVerify(token, getJwtSecret())
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
