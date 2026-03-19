import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/firebase-admin'

const FieldSchema = z.object({
  key: z.string(),
  label: z.string(),
  type: z.string(),
  required: z.boolean().optional(),
  enumValues: z.array(z.string()).optional(),
})

const DatasetSchema = z.object({
  name: z.string(),
  slug: z.string(),
  kind: z.enum(['collection', 'singleton']),
  schema: z.object({
    fields: z.array(FieldSchema),
  }),
  initialContent: z.union([z.array(z.any()), z.record(z.any())]).optional(),
})

const RegisterSchema = z.object({
  project: z.object({
    name: z.string(),
    slug: z.string(),
  }),
  adminEmail: z.string().email(),
  datasets: z.array(DatasetSchema).min(1, 'datasets must be a non-empty array'),
})

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = RegisterSchema.safeParse(body)
  if (!parsed.success) {
    const message = parsed.error.errors[0]?.message ?? 'Invalid request'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const { project, adminEmail, datasets } = parsed.data

  // Resolve slug — check for existing project with same slug
  let resolvedSlug = project.slug
  let projectId: string | null = null

  const existing = await db
    .collection('projects')
    .where('slug', '==', project.slug)
    .limit(1)
    .get()

  if (!existing.empty) {
    const doc = existing.docs[0]
    if (doc.data().adminEmail === adminEmail) {
      // Same owner — update in place
      projectId = doc.id
      await doc.ref.update({ name: project.name, updatedAt: new Date() })
    } else {
      // Different owner — append suffix
      resolvedSlug = `${project.slug}-2`
    }
  }

  if (!projectId) {
    const newProject = await db.collection('projects').add({
      name: project.name,
      slug: resolvedSlug,
      adminEmail,
      createdAt: new Date(),
    })
    projectId = newProject.id
  }

  // Upsert datasets
  for (const dataset of datasets) {
    const existingDataset = await db
      .collection(`projects/${projectId}/datasets`)
      .where('slug', '==', dataset.slug)
      .limit(1)
      .get()

    let datasetId: string

    if (!existingDataset.empty) {
      datasetId = existingDataset.docs[0].id
      await existingDataset.docs[0].ref.update({
        name: dataset.name,
        kind: dataset.kind,
        schema: dataset.schema,
        updatedAt: new Date(),
      })
    } else {
      const newDataset = await db
        .collection(`projects/${projectId}/datasets`)
        .add({
          name: dataset.name,
          slug: dataset.slug,
          kind: dataset.kind,
          schema: dataset.schema,
          createdAt: new Date(),
        })
      datasetId = newDataset.id
    }

    const defaultContent =
      dataset.kind === 'collection' ? [] : {}

    await db
      .collection(`projects/${projectId}/datasets/${datasetId}/contents`)
      .add({
        value: dataset.initialContent ?? defaultContent,
        updatedAt: new Date(),
      })
  }

  return NextResponse.json({
    projectId,
    slug: resolvedSlug,
    adminUrl: `https://agentcms.app/p/${resolvedSlug}`,
    apiBase: `https://agentcms.app/api/p/${resolvedSlug}`,
  })
}
