import { db } from '@/lib/firebase-admin'
import AdminShell from '@/components/AdminShell'
import type { Metadata } from 'next'

interface PageProps {
  params: { slug: string; dataset: string }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return {
    title: `${params.dataset} · ${params.slug} · AgentCMS`,
  }
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
  const projectData = projectDoc.data()
  const projectName = projectData.name as string
  const rawDemo = projectData.publicDemo
  const publicDemo = rawDemo === true ? 'readonly' : (rawDemo === false || !rawDemo ? 'off' : rawDemo) as 'off' | 'readonly' | 'editable'

  // Fetch ALL datasets for column 1 nav
  const allDatasetsSnap = await db
    .collection(`projects/${projectId}/datasets`)
    .orderBy('createdAt', 'asc')
    .get()

  const allDatasets = allDatasetsSnap.docs.map(d => ({
    name: d.data().name as string,
    slug: d.data().slug as string,
    kind: d.data().kind as 'collection' | 'singleton',
  }))

  // Current dataset
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
    <AdminShell
      projectSlug={params.slug}
      projectName={projectName}
      allDatasets={allDatasets}
      currentDatasetSlug={params.dataset}
      currentDatasetName={datasetData.name as string}
      schema={schema}
      kind={kind}
      currentValue={currentValue}
      publicDemo={publicDemo}
    />
  )
}
