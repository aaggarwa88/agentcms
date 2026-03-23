import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase-admin'
import { Resend } from 'resend'
import crypto from 'crypto'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  const { email, projectSlug, redirect } = await req.json()

  if (!email || !projectSlug) {
    return NextResponse.json({ error: 'email and projectSlug are required' }, { status: 400 })
  }

  // Verify email matches the project's adminEmail
  const projectSnap = await db
    .collection('projects')
    .where('slug', '==', projectSlug)
    .limit(1)
    .get()

  if (projectSnap.empty) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  const adminEmail = projectSnap.docs[0].data().adminEmail as string

  if (email.toLowerCase() !== adminEmail.toLowerCase()) {
    // Return success anyway to avoid revealing which emails are valid
    return NextResponse.json({ ok: true })
  }

  // Rate limit: max 5 requests per email per 15 minutes
  const windowStart = new Date(Date.now() - 15 * 60 * 1000)
  const recentSnap = await db
    .collection('auth_tokens')
    .where('email', '==', email)
    .where('createdAt', '>=', windowStart)
    .get()
  if (recentSnap.size >= 5) {
    return NextResponse.json({ ok: true }) // silent — don't reveal rate limit
  }

  // Generate one-time token — store only SHA-256 hash, never plaintext
  const rawToken = crypto.randomBytes(32).toString('hex')
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 min

  await db.collection('auth_tokens').add({
    tokenHash,
    email,
    projectSlug,
    expiresAt,
    used: false,
    createdAt: new Date(),
  })

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://www.agentcms.app'
  const magicLink = `${baseUrl}/api/auth/verify?token=${rawToken}&redirect=${encodeURIComponent(redirect ?? `/p/${projectSlug}`)}`

  await resend.emails.send({
    from: 'AgentCMS <noreply@agentcms.app>',
    to: email,
    subject: `Sign in to ${projectSlug} · AgentCMS`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
        <div style="width:32px;height:32px;background:#7c3aed;border-radius:8px;display:flex;align-items:center;justify-content:center;margin-bottom:24px;">
          <span style="color:white;font-weight:700;font-size:14px;">A</span>
        </div>
        <h1 style="font-size:20px;font-weight:700;color:#111;margin:0 0 8px;">Sign in to AgentCMS</h1>
        <p style="color:#666;font-size:14px;margin:0 0 24px;">Click the button below to sign in to <strong>${projectSlug}</strong>. This link expires in 15 minutes and can only be used once.</p>
        <a href="${magicLink}" style="display:inline-block;background:#7c3aed;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">Sign in →</a>
        <p style="color:#999;font-size:12px;margin:24px 0 0;">If you didn't request this, you can safely ignore this email.</p>
        <p style="color:#ccc;font-size:11px;margin:8px 0 0;">${magicLink}</p>
      </div>
    `,
  })

  return NextResponse.json({ ok: true })
}
