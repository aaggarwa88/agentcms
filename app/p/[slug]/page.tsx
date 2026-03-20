import { db } from '@/lib/firebase-admin'
import Link from 'next/link'

interface PageProps {
  params: { slug: string }
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default async function ProjectPage({ params }: PageProps) {
  const projectSnap = await db
    .collection('projects')
    .where('slug', '==', params.slug)
    .limit(1)
    .get()

  if (projectSnap.empty) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 text-sm">Project not found</p>
          <Link href="/" className="text-violet-600 text-sm mt-2 inline-block hover:underline">
            ← Home
          </Link>
        </div>
      </div>
    )
  }

  const projectDoc = projectSnap.docs[0]
  const projectId = projectDoc.id
  const project = projectDoc.data()

  const datasetsSnap = await db
    .collection(`projects/${projectId}/datasets`)
    .orderBy('createdAt', 'asc')
    .get()

  // For each dataset, fetch the most recent content doc to get updatedAt
  const datasets = await Promise.all(
    datasetsSnap.docs.map(async (doc) => {
      const data = doc.data()
      const contentsSnap = await db
        .collection(`projects/${projectId}/datasets/${doc.id}/contents`)
        .orderBy('updatedAt', 'desc')
        .limit(1)
        .get()

      const lastUpdated = contentsSnap.empty
        ? data.createdAt?.toDate?.() ?? null
        : contentsSnap.docs[0].data().updatedAt?.toDate?.() ?? null

      return {
        id: doc.id,
        name: data.name as string,
        slug: data.slug as string,
        kind: data.kind as 'collection' | 'singleton',
        lastUpdated,
      }
    })
  )

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="text-sm text-violet-600 hover:text-violet-800 mb-3 inline-block">
            ← AgentCMS
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
          <p className="text-sm text-gray-400 mt-1">{params.slug}</p>
        </div>

        {/* Dataset list */}
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          {datasets.length === 0 && (
            <div className="py-12 text-center text-sm text-gray-400">
              No datasets registered yet.
            </div>
          )}

          {datasets.map((dataset, i) => (
            <Link
              key={dataset.id}
              href={`/p/${params.slug}/${dataset.slug}`}
              className={`flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors group ${
                i < datasets.length - 1 ? 'border-b border-gray-100' : ''
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900 group-hover:text-violet-700 transition-colors">
                    {dataset.name}
                  </span>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                    {dataset.kind}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">/{dataset.slug}</p>
              </div>
              <div className="flex items-center gap-3">
                {dataset.lastUpdated && (
                  <span className="text-xs text-gray-400">
                    {timeAgo(dataset.lastUpdated)}
                  </span>
                )}
                <span className="text-gray-300 group-hover:text-violet-400 transition-colors text-sm">
                  →
                </span>
              </div>
            </Link>
          ))}
        </div>

        {/* Footer info */}
        <div className="mt-6 flex items-center justify-between text-xs text-gray-400">
          <span>{datasets.length} dataset{datasets.length !== 1 ? 's' : ''}</span>
          <span>
            API base:{' '}
            <code className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">
              /api/p/{params.slug}
            </code>
          </span>
        </div>
      </div>
    </div>
  )
}
