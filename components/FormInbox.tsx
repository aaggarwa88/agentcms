'use client'

import type { Schema, Submission } from '@/lib/dataset-types'

interface Props {
  datasetName: string
  datasetSlug: string
  schema: Schema
  submissions: Submission[]
}

function formatCell(value: unknown): string {
  if (value === undefined || value === null) return ''
  if (Array.isArray(value)) return value.join('; ')
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  return String(value)
}

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function buildCsv(submissions: Submission[], schema: Schema): string {
  const headers = ['Submitted', ...schema.fields.map(f => f.label)]
  const rows = submissions.map(s => {
    const submitted = new Date(s.createdAt).toISOString()
    const values = schema.fields.map(f => formatCell(s.data[f.key]))
    return [submitted, ...values].map(escapeCsvCell).join(',')
  })
  return [headers.map(escapeCsvCell).join(','), ...rows].join('\n')
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function FormInbox({
  datasetName,
  datasetSlug,
  schema,
  submissions,
}: Props) {
  function downloadCsv() {
    const csv = buildCsv(submissions, schema)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${datasetSlug}-submissions.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-gray-950">
      <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{datasetName}</h2>
          <p className="text-xs text-gray-500">
            {submissions.length} submission{submissions.length === 1 ? '' : 's'}
          </p>
        </div>
        {submissions.length > 0 && (
          <button
            onClick={downloadCsv}
            className="shrink-0 bg-violet-600 text-white px-3 py-1.5 rounded text-xs font-semibold hover:bg-violet-700 transition-colors"
          >
            Download CSV
          </button>
        )}
      </div>

      {submissions.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-gray-400 dark:text-gray-600">
          <div className="text-center">
            <div className="text-3xl mb-2">📭</div>
            <p className="text-sm">No submissions yet</p>
            <p className="text-xs mt-1 text-gray-400 dark:text-gray-600">
              Submissions from your site will appear here
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm text-left">
            <thead className="sticky top-0 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                  Submitted
                </th>
                {schema.fields.map(f => (
                  <th
                    key={f.key}
                    className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap"
                  >
                    {f.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {submissions.map(s => (
                <tr
                  key={s.id}
                  className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50"
                >
                  <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 whitespace-nowrap text-xs">
                    {formatTimestamp(s.createdAt)}
                  </td>
                  {schema.fields.map(f => (
                    <td
                      key={f.key}
                      className="px-4 py-2.5 text-gray-800 dark:text-gray-200 max-w-xs truncate"
                      title={formatCell(s.data[f.key])}
                    >
                      {formatCell(s.data[f.key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
