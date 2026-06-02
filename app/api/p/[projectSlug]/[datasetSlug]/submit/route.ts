import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase-admin'
import { checkSubmitRateLimit, getClientIp } from '@/lib/rate-limit'
import { validateSubmission } from '@/lib/validate-submission'
import type { Schema } from '@/lib/dataset-types'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS })
}

export async function POST(
  req: NextRequest,
  { params }: { params: { projectSlug: string; datasetSlug: string } }
) {
  const { projectSlug, datasetSlug } = params

  const projectSnap = await db
    .collection('projects')
    .where('slug', '==', projectSlug)
    .limit(1)
    .get()

  if (projectSnap.empty) {
    return NextResponse.json(
      { error: 'Project not found' },
      { status: 404, headers: CORS_HEADERS }
    )
  }

  const projectId = projectSnap.docs[0].id

  const datasetSnap = await db
    .collection(`projects/${projectId}/datasets`)
    .where('slug', '==', datasetSlug)
    .limit(1)
    .get()

  if (datasetSnap.empty) {
    return NextResponse.json(
      { error: 'Dataset not found' },
      { status: 404, headers: CORS_HEADERS }
    )
  }

  const datasetDoc = datasetSnap.docs[0]
  const datasetId = datasetDoc.id
  const kind = datasetDoc.data().kind as string

  if (kind !== 'form') {
    return NextResponse.json(
      { error: 'Dataset is not a form' },
      { status: 404, headers: CORS_HEADERS }
    )
  }

  const ip = getClientIp(req.headers)
  const allowed = await checkSubmitRateLimit(projectSlug, datasetSlug, ip)
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many submissions' },
      { status: 429, headers: CORS_HEADERS }
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON' },
      { status: 400, headers: CORS_HEADERS }
    )
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json(
      { error: 'Body must be a JSON object' },
      { status: 400, headers: CORS_HEADERS }
    )
  }

  const schema = datasetDoc.data().schema as Schema
  const result = validateSubmission(schema.fields, body as Record<string, unknown>)

  if (!result.ok) {
    return NextResponse.json(
      { error: 'Validation failed', fields: result.errors },
      { status: 400, headers: CORS_HEADERS }
    )
  }

  await db
    .collection(`projects/${projectId}/datasets/${datasetId}/submissions`)
    .add({
      data: result.data,
      createdAt: new Date(),
    })

  return NextResponse.json({ ok: true }, { headers: CORS_HEADERS })
}
