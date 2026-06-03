'use client'

import { useState } from 'react'
import type { Schema, SchemaField, Submission } from '@/lib/dataset-types'

interface Props {
  projectSlug: string
  datasetName: string
  datasetSlug: string
  schema: Schema
  submissions: Submission[]
  readOnly?: boolean
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

function submissionSummary(submission: Submission, fields: SchemaField[]): string {
  return fields.slice(0, 2).map(f => submission.data[f.key]).filter(Boolean).join(' · ') || 'Submission'
}

function FieldEditor({
  field,
  value,
  onChange,
  error,
}: {
  field: SchemaField
  value: unknown
  onChange: (v: unknown) => void
  error?: string
}) {
  const base =
    'border border-gray-300 dark:border-gray-700 rounded px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100'

  let input: React.ReactNode
  switch (field.type) {
    case 'textarea':
    case 'longtext':
      input = (
        <textarea
          className={base}
          rows={4}
          value={(value as string) ?? ''}
          onChange={e => onChange(e.target.value)}
        />
      )
      break
    case 'number':
      input = (
        <input
          type="number"
          className={base}
          value={(value as string) ?? ''}
          onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        />
      )
      break
    case 'boolean':
      input = (
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={e => onChange(e.target.checked)}
          className="w-4 h-4 accent-violet-500"
        />
      )
      break
    case 'date':
      input = (
        <input
          type="date"
          className={base}
          value={(value as string) ?? ''}
          onChange={e => onChange(e.target.value)}
        />
      )
      break
    case 'url':
      input = (
        <input
          type="url"
          className={base}
          value={(value as string) ?? ''}
          onChange={e => onChange(e.target.value)}
        />
      )
      break
    case 'email':
      input = (
        <input
          type="email"
          className={base}
          value={(value as string) ?? ''}
          onChange={e => onChange(e.target.value)}
        />
      )
      break
    case 'enum':
      input = (
        <select
          className={base}
          value={(value as string) ?? ''}
          onChange={e => onChange(e.target.value)}
        >
          <option value="">Select…</option>
          {field.enumValues?.map(o => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      )
      break
    case 'list':
      input = (
        <textarea
          className={base}
          rows={3}
          value={Array.isArray(value) ? (value as string[]).join('\n') : (value as string) ?? ''}
          onChange={e =>
            onChange(e.target.value.split('\n').map(s => s.trim()).filter(Boolean))
          }
          placeholder="One item per line"
        />
      )
      break
    default:
      input = (
        <input
          type="text"
          className={base}
          value={(value as string) ?? ''}
          onChange={e => onChange(e.target.value)}
        />
      )
  }

  return (
    <div className="mb-4">
      {field.type !== 'boolean' && (
        <label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">
          {field.label}
          {field.required && <span className="text-red-500 dark:text-red-400 ml-0.5">*</span>}
        </label>
      )}
      {input}
      {error && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{error}</p>}
    </div>
  )
}

export default function FormInbox({
  projectSlug,
  datasetName,
  datasetSlug,
  schema,
  submissions: initialSubmissions,
  readOnly = false,
}: Props) {
  const [submissions, setSubmissions] = useState(initialSubmissions)
  const [selectedId, setSelectedId] = useState<string | null>(
    initialSubmissions.length > 0 ? initialSubmissions[0].id : null
  )
  const [formValue, setFormValue] = useState<Record<string, unknown>>(() => {
    const first = initialSubmissions[0]
    return first ? { ...first.data } : {}
  })
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [status, setStatus] = useState<'idle' | 'saved' | 'deleted' | 'error'>('idle')

  const selected = submissions.find(s => s.id === selectedId) ?? null

  function selectSubmission(submission: Submission) {
    setSelectedId(submission.id)
    setFormValue({ ...submission.data })
    setFieldErrors({})
    setStatus('idle')
  }

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

  async function handleSave() {
    if (!selected || readOnly) return
    setSaving(true)
    setStatus('idle')
    setFieldErrors({})

    try {
      const res = await fetch('/api/admin/submission', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectSlug,
          datasetSlug,
          submissionId: selected.id,
          data: formValue,
        }),
      })
      const json = await res.json()

      if (!res.ok) {
        if (json.fields) setFieldErrors(json.fields)
        setStatus('error')
        return
      }

      setSubmissions(prev =>
        prev.map(s =>
          s.id === selected.id ? { ...s, data: json.data as Record<string, unknown> } : s
        )
      )
      setStatus('saved')
    } catch {
      setStatus('error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!selected || readOnly) return
    if (!window.confirm('Delete this submission? This cannot be undone.')) return

    setDeleting(true)
    setStatus('idle')

    try {
      const res = await fetch('/api/admin/submission', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectSlug,
          datasetSlug,
          submissionId: selected.id,
        }),
      })

      if (!res.ok) {
        setStatus('error')
        return
      }

      const remaining = submissions.filter(s => s.id !== selected.id)
      setSubmissions(remaining)
      if (remaining.length > 0) {
        selectSubmission(remaining[0])
      } else {
        setSelectedId(null)
        setFormValue({})
      }
      setStatus('deleted')
    } catch {
      setStatus('error')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-gray-950">
      <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between gap-4 shrink-0">
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
        <div className="flex-1 flex min-h-0">
          <div className="w-72 shrink-0 border-r border-gray-200 dark:border-gray-800 overflow-y-auto bg-gray-50 dark:bg-gray-900">
            {submissions.map(s => (
              <button
                key={s.id}
                onClick={() => selectSubmission(s)}
                className={`w-full text-left px-4 py-3 border-b border-gray-200 dark:border-gray-800 transition-colors ${
                  selectedId === s.id
                    ? 'bg-violet-50 dark:bg-violet-900/20 border-l-2 border-l-violet-500'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <div className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                  {submissionSummary(s, schema.fields)}
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-600 mt-0.5">
                  {formatTimestamp(s.createdAt)}
                </div>
              </button>
            ))}
          </div>

          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {selected ? (
              <>
                <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-800 shrink-0">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Edit submission
                  </h3>
                  <p className="text-xs text-gray-500">
                    Submitted {formatTimestamp(selected.createdAt)}
                  </p>
                </div>
                <div className="flex-1 overflow-y-auto px-6 py-5 max-w-lg">
                  {schema.fields.map(f => (
                    <FieldEditor
                      key={f.key}
                      field={f}
                      value={formValue[f.key]}
                      onChange={v => setFormValue(prev => ({ ...prev, [f.key]: v }))}
                      error={fieldErrors[f.key]}
                    />
                  ))}

                  {!readOnly && (
                    <div className="flex items-center gap-3 pt-2 border-t border-gray-200 dark:border-gray-800 mt-2">
                      <button
                        onClick={handleSave}
                        disabled={saving || deleting}
                        className="bg-violet-600 text-white px-4 py-2 rounded text-sm hover:bg-violet-700 disabled:opacity-50"
                      >
                        {saving ? 'Saving…' : 'Save'}
                      </button>
                      <button
                        onClick={handleDelete}
                        disabled={saving || deleting}
                        className="text-sm text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 disabled:opacity-50"
                      >
                        {deleting ? 'Deleting…' : 'Delete'}
                      </button>
                      {status === 'saved' && (
                        <span className="text-sm text-green-600 dark:text-green-400">Saved</span>
                      )}
                      {status === 'deleted' && (
                        <span className="text-sm text-green-600 dark:text-green-400">Deleted</span>
                      )}
                      {status === 'error' && (
                        <span className="text-sm text-red-500 dark:text-red-400">Action failed</span>
                      )}
                    </div>
                  )}
                  {readOnly && (
                    <p className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 px-3 py-1.5 rounded mt-2">
                      Read-only preview — sign in to edit or delete
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-400 dark:text-gray-600">
                <p className="text-sm">Select a submission to edit</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
