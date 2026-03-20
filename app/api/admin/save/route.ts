import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase-admin'

export async function POST(req: NextRequest) {
  let body: { projectSlug: string; datasetSlug: string; value: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { projectSlug, datasetSlug, value } = body

  if (!projectSlug || !datasetSlug) {
    return NextResponse.json(
      { error: 'projectSlug and datasetSlug are required' },
      { status: 400 }
    )
  }

  const projectSnap = await db
    .collection('projects')
    .where('slug', '==', projectSlug)
    .limit(1)
    .get()

  if (projectSnap.empty) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  const projectId = projectSnap.docs[0].id

  const datasetSnap = await db
    .collection(`projects/${projectId}/datasets`)
    .where('slug', '==', datasetSlug)
    .limit(1)
    .get()

  if (datasetSnap.empty) {
    return NextResponse.json({ error: 'Dataset not found' }, { status: 404 })
  }

  const datasetId = datasetSnap.docs[0].id

  await db
    .collection(`projects/${projectId}/datasets/${datasetId}/contents`)
    .add({ value, updatedAt: new Date() })

  return NextResponse.json({ success: true })
}
