import { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

function getJwtSecret() {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET env var is not set')
  return new TextEncoder().encode(process.env.JWT_SECRET)
}

export async function getSessionProjectSlug(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get('agentcms_session')?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, getJwtSecret())
    return (payload.projectSlug as string) ?? null
  } catch {
    return null
  }
}

export async function requireProjectSession(
  req: NextRequest,
  projectSlug: string
): Promise<boolean> {
  const sessionSlug = await getSessionProjectSlug(req)
  return sessionSlug === projectSlug
}
