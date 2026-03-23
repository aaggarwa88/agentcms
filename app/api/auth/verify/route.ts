import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase-admin'
import { SignJWT } from 'jose'
import crypto from 'crypto'

function getJwtSecret() {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET env var is not set')
  return new TextEncoder().encode(process.env.JWT_SECRET)
}

function safeRedirect(redirect: string | null): string {
  // Only allow relative paths — block open redirect to external URLs
  if (!redirect || !redirect.startsWith('/') || redirect.startsWith('//')) {
    return '/'
  }
  return redirect
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const rawToken = searchParams.get('token')
  const redirectTo = safeRedirect(searchParams.get('redirect'))

  if (!rawToken) {
    return NextResponse.redirect(new URL('/auth-error?reason=missing-token', req.url))
  }

  // Hash the incoming token to compare against stored hash
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')

  // Find token in Firestore by hash
  const tokenSnap = await db
    .collection('auth_tokens')
    .where('tokenHash', '==', tokenHash)
    .where('used', '==', false)
    .limit(1)
    .get()

  if (tokenSnap.empty) {
    return NextResponse.redirect(new URL('/auth-error?reason=invalid-token', req.url))
  }

  const tokenDoc = tokenSnap.docs[0]
  const tokenData = tokenDoc.data()

  // Check expiry
  const expiresAt = tokenData.expiresAt?.toDate?.() as Date
  if (expiresAt && expiresAt < new Date()) {
    return NextResponse.redirect(new URL('/auth-error?reason=expired', req.url))
  }

  // Mark token as used
  await tokenDoc.ref.update({ used: true, usedAt: new Date() })

  // Create JWT session (7 days)
  const jwt = await new SignJWT({
    email: tokenData.email,
    projectSlug: tokenData.projectSlug,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getJwtSecret())

  const response = NextResponse.redirect(new URL(redirectTo, req.url))
  response.cookies.set('agentcms_session', jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  })

  return response
}
