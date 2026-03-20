import { db } from '@/lib/firebase-admin'
import DatasetEditor from '@/components/DatasetEditor'
import Link from 'next/link'

interface PageProps {
  params: { slug: string; dataset: string }
}

export default async function DatasetPage({ params }: PageProps) {
  const projectSnap = await db
    .collection('projects')
    .where('slug', '==', params.slug)
    .limit(1)
    .get()

  if (projectSnap.empty) {
    return <div className="p-8 text-gray-500">Project not found</div>
  }

  const projectDoc = projectSnap.docs[0]
  const projectId = projectDoc.id
  const projectName = projectDoc.data().name as string

  const datasetSnap = await db
    .collection(`projects/${projectId}/datasets`)
    .where('slug', '==', params.dataset)
    .limit(1)
    .get()

  if (datasetSnap.empty) {
    return <div className="p-8 text-gray-500">Dataset not found</div>
  }

  const datasetDoc = datasetSnap.docs[0]
  const datasetId = datasetDoc.id
  const datasetData = datasetDoc.data()
  const kind = datasetData.kind as 'collection' | 'singleton'
  const schema = datasetData.schema as {
    fields: {
      key: string
      label: string
      type: string
      required?: boolean
      enumValues?: string[]
    }[]
  }

  const contentsSnap = await db
    .collection(`projects/${projectId}/datasets/${datasetId}/contents`)
    .orderBy('updatedAt', 'desc')
    .limit(1)
    .get()

  const currentValue = contentsSnap.empty
    ? kind === 'collection' ? [] : {}
    : contentsSnap.docs[0].data().value

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="mb-6">
          <Link
            href={`/p/${params.slug}`}
            className="text-sm text-violet-600 hover:text-violet-800 mb-2 inline-block"
          >
            ← Back to {projectName}
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            {projectName}{' '}
            <span className="text-gray-400 font-normal">/</span>{' '}
            {datasetData.name}
          </h1>
        </div>

        <DatasetEditor
          projectSlug={params.slug}
          datasetSlug={params.dataset}
          schema={schema}
          kind={kind}
          currentValue={currentValue}
        />
      </div>
    </div>
  )
}
