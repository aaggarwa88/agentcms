import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase-admin'
import { requireProjectSession } from '@/lib/admin-auth'
import { validateSubmission } from '@/lib/validate-submission'
import type { Schema } from '@/lib/dataset-types'

async function resolveFormDataset(projectSlug: string, datasetSlug: string) {
  const projectSnap = await db
    .collection('projects')
    .where('slug', '==', projectSlug)
    .limit(1)
    .get()

  if (projectSnap.empty) return { error: 'Project not found', status: 404 as const }

  const projectId = projectSnap.docs[0].id

  const datasetSnap = await db
    .collection(`projects/${projectId}/datasets`)
    .where('slug', '==', datasetSlug)
    .limit(1)
    .get()

  if (datasetSnap.empty) return { error: 'Dataset not found', status: 404 as const }

  const datasetDoc = datasetSnap.docs[0]
  if (datasetDoc.data().kind !== 'form') {
    return { error: 'Dataset is not a form', status: 400 as const }
  }

  return {
    projectId,
    datasetId: datasetDoc.id,
    schema: datasetDoc.data().schema as Schema,
  }
}

export async function PATCH(req: NextRequest) {
  let body: {
    projectSlug?: string
    datasetSlug?: string
    submissionId?: string
    data?: Record<string, unknown>
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { projectSlug, datasetSlug, submissionId, data } = body

  if (!projectSlug || !datasetSlug || !submissionId || !data) {
    return NextResponse.json(
      { error: 'projectSlug, datasetSlug, submissionId, and data are required' },
      { status: 400 }
    )
  }

  if (!(await requireProjectSession(req, projectSlug))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const resolved = await resolveFormDataset(projectSlug, datasetSlug)
  if ('error' in resolved) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status })
  }

  const result = validateSubmission(resolved.schema.fields, data)
  if (!result.ok) {
    return NextResponse.json(
      { error: 'Validation failed', fields: result.errors },
      { status: 400 }
    )
  }

  const submissionRef = db.doc(
    `projects/${resolved.projectId}/datasets/${resolved.datasetId}/submissions/${submissionId}`
  )
  const submissionSnap = await submissionRef.get()
  if (!submissionSnap.exists) {
    return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
  }

  await submissionRef.update({
    data: result.data,
    updatedAt: new Date(),
  })

  return NextResponse.json({ ok: true, data: result.data })
}

export async function DELETE(req: NextRequest) {
  let body: {
    projectSlug?: string
    datasetSlug?: string
    submissionId?: string
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { projectSlug, datasetSlug, submissionId } = body

  if (!projectSlug || !datasetSlug || !submissionId) {
    return NextResponse.json(
      { error: 'projectSlug, datasetSlug, and submissionId are required' },
      { status: 400 }
    )
  }

  if (!(await requireProjectSession(req, projectSlug))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const resolved = await resolveFormDataset(projectSlug, datasetSlug)
  if ('error' in resolved) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status })
  }

  const submissionRef = db.doc(
    `projects/${resolved.projectId}/datasets/${resolved.datasetId}/submissions/${submissionId}`
  )
  const submissionSnap = await submissionRef.get()
  if (!submissionSnap.exists) {
    return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
  }

  await submissionRef.delete()

  return NextResponse.json({ ok: true })
}
