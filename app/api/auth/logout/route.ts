import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { projectSlug } = await req.json()
  const response = NextResponse.json({ ok: true })
  response.cookies.set('agentcms_session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  })
  return response
}
