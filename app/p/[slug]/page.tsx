import { db } from '@/lib/firebase-admin'
import { redirect } from 'next/navigation'

interface PageProps {
  params: { slug: string }
}

export default async function ProjectPage({ params }: PageProps) {
  const projectSnap = await db
    .collection('projects')
    .where('slug', '==', params.slug)
    .limit(1)
    .get()

  if (projectSnap.empty) {
    redirect('/')
  }

  const projectId = projectSnap.docs[0].id

  const datasetsSnap = await db
    .collection(`projects/${projectId}/datasets`)
    .orderBy('createdAt', 'asc')
    .limit(1)
    .get()

  if (datasetsSnap.empty) {
    redirect('/')
  }

  const firstSlug = datasetsSnap.docs[0].data().slug as string
  redirect(`/p/${params.slug}/${firstSlug}`)
}
