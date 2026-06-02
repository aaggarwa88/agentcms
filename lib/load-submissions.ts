import { db } from '@/lib/firebase-admin'
import type { Submission } from '@/lib/dataset-types'

export async function loadSubmissions(
  projectId: string,
  datasetId: string
): Promise<Submission[]> {
  const snap = await db
    .collection(`projects/${projectId}/datasets/${datasetId}/submissions`)
    .orderBy('createdAt', 'desc')
    .limit(500)
    .get()

  return snap.docs.map(doc => {
    const data = doc.data()
    const createdAt = data.createdAt?.toDate?.() as Date | undefined
    return {
      id: doc.id,
      data: data.data as Record<string, unknown>,
      createdAt: createdAt?.toISOString() ?? new Date().toISOString(),
    }
  })
}
