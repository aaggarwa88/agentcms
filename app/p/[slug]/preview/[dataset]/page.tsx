import { db } from '@/lib/firebase-admin'
import AdminShell from '@/components/AdminShell'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

interface PageProps {
  params: { slug: string; dataset: string }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return {
    title: `${params.dataset} · ${params.slug} · Preview · AgentCMS`,
  }
}

export default async function PreviewDatasetPage({ params }: PageProps) {
  const projectSnap = await db
    .collection('projects')
    .where('slug', '==', params.slug)
    .limit(1)
    .get()

  if (projectSnap.empty) notFound()

  const projectDoc = projectSnap.docs[0]
  const projectData = projectDoc.data()

  const demoMode = projectData.publicDemo === true ? 'readonly' : (projectData.publicDemo ?? 'off')
  if (!demoMode || demoMode === 'off') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-xl p-8 w-full max-w-sm text-center">
          <div className="text-3xl mb-4">🔒</div>
          <h1 className="text-lg font-semibold text-gray-100 mb-2">Demo not enabled</h1>
          <p className="text-sm text-gray-400">
            The owner of this project hasn&apos;t enabled public preview mode.
          </p>
        </div>
      </div>
    )
  }

  const projectId = projectDoc.id
  const projectName = projectData.name as string

  const allDatasetsSnap = await db
    .collection(`projects/${projectId}/datasets`)
    .orderBy('createdAt', 'asc')
    .get()

  const allDatasets = allDatasetsSnap.docs.map(d => ({
    name: d.data().name as string,
    slug: d.data().slug as string,
    kind: d.data().kind as 'collection' | 'singleton',
  }))

  const datasetSnap = await db
    .collection(`projects/${projectId}/datasets`)
    .where('slug', '==', params.dataset)
    .limit(1)
    .get()

  if (datasetSnap.empty) notFound()

  const datasetDoc = datasetSnap.docs[0]
  const datasetData = datasetDoc.data()
  const kind = datasetData.kind as 'collection' | 'singleton'
  const schema = datasetData.schema as {
    fields: { key: string; label: string; type: string; required?: boolean; enumValues?: string[] }[]
  }

  const contentsSnap = await db
    .collection(`projects/${projectId}/datasets/${datasetDoc.id}/contents`)
    .orderBy('updatedAt', 'desc')
    .limit(1)
    .get()

  const currentValue = contentsSnap.empty
    ? kind === 'collection' ? [] : {}
    : contentsSnap.docs[0].data().value

  return (
    <AdminShell
      projectSlug={params.slug}
      projectName={projectName}
      allDatasets={allDatasets}
      currentDatasetSlug={params.dataset}
      currentDatasetName={datasetData.name as string}
      schema={schema}
      kind={kind}
      currentValue={currentValue}
      readOnly={demoMode === 'readonly'}
      previewMode
    />
  )
}
