import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase-admin'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Cache-Control': 's-maxage=30, stale-while-revalidate=60',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS })
}

export async function GET(
  _req: NextRequest,
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
  const kind = datasetDoc.data().kind as 'collection' | 'singleton'

  const contentsSnap = await db
    .collection(`projects/${projectId}/datasets/${datasetId}/contents`)
    .orderBy('updatedAt', 'desc')
    .limit(1)
    .get()

  if (contentsSnap.empty) {
    const fallback = kind === 'collection' ? [] : {}
    return NextResponse.json(fallback, { headers: CORS_HEADERS })
  }

  const value = contentsSnap.docs[0].data().value

  return NextResponse.json(value, { headers: CORS_HEADERS })
}
