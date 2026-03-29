import { db } from '@/lib/firebase-admin'
import { redirect, notFound } from 'next/navigation'

interface PageProps {
  params: { slug: string }
}

export default async function PreviewPage({ params }: PageProps) {
  const projectSnap = await db
    .collection('projects')
    .where('slug', '==', params.slug)
    .limit(1)
    .get()

  if (projectSnap.empty) notFound()

  const projectData = projectSnap.docs[0].data()

  if (!projectData.publicDemo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-8 w-full max-w-sm text-center">
          <div className="text-3xl mb-4">🔒</div>
          <h1 className="text-lg font-semibold text-gray-900 mb-2">Demo not enabled</h1>
          <p className="text-sm text-gray-500">
            The owner of this project hasn&apos;t enabled public preview mode.
          </p>
        </div>
      </div>
    )
  }

  const datasetsSnap = await db
    .collection(`projects/${projectSnap.docs[0].id}/datasets`)
    .orderBy('createdAt', 'asc')
    .limit(1)
    .get()

  if (datasetsSnap.empty) notFound()

  const firstSlug = datasetsSnap.docs[0].data().slug as string
  redirect(`/p/${params.slug}/preview/${firstSlug}`)
}
