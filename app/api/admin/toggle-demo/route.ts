import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase-admin'
import { jwtVerify } from 'jose'

function getJwtSecret() {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET env var is not set')
  return new TextEncoder().encode(process.env.JWT_SECRET)
}

export async function POST(req: NextRequest) {
  // Verify session
  const token = req.cookies.get('agentcms_session')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let sessionSlug: string
  try {
    const { payload } = await jwtVerify(token, getJwtSecret())
    sessionSlug = payload.projectSlug as string
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { projectSlug } = await req.json()
  if (sessionSlug !== projectSlug) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const snap = await db
    .collection('projects')
    .where('slug', '==', projectSlug)
    .limit(1)
    .get()

  if (snap.empty) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const doc = snap.docs[0]
  const current = doc.data().publicDemo ?? false
  await doc.ref.update({ publicDemo: !current })

  return NextResponse.json({ publicDemo: !current })
}
