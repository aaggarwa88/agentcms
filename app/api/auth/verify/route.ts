import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase-admin'
import { SignJWT } from 'jose'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET ?? 'fallback-secret')

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const token = searchParams.get('token')
  const redirect = searchParams.get('redirect') ?? '/'

  if (!token) {
    return NextResponse.redirect(new URL('/auth-error?reason=missing-token', req.url))
  }

  // Find token in Firestore
  const tokenSnap = await db
    .collection('auth_tokens')
    .where('token', '==', token)
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
    .sign(JWT_SECRET)

  const response = NextResponse.redirect(new URL(redirect, req.url))
  response.cookies.set('agentcms_session', jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  })

  return response
}
