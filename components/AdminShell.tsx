'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SchemaField {
  key: string
  label: string
  type: string
  required?: boolean
  enumValues?: string[]
}

interface Schema {
  fields: SchemaField[]
}

interface DatasetMeta {
  name: string
  slug: string
  kind: 'collection' | 'singleton'
}

type DemoMode = 'off' | 'readonly' | 'editable'

interface Props {
  projectSlug: string
  projectName: string
  allDatasets: DatasetMeta[]
  currentDatasetSlug: string
  currentDatasetName: string
  schema: Schema
  kind: 'collection' | 'singleton'
  currentValue: Record<string, unknown> | Record<string, unknown>[]
  readOnly?: boolean
  previewMode?: boolean
  publicDemo?: DemoMode
}

type Item = Record<string, unknown>
type SaveStatus = 'idle' | 'success' | 'error'

// ─── Field input ─────────────────────────────────────────────────────────────

function FieldInput({
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
  const base = 'border border-gray-300 rounded px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-violet-400'

  const input = () => {
    switch (field.type) {
      case 'textarea':
        return <textarea rows={3} className={base} value={(value as string) ?? ''} onChange={e => onChange(e.target.value)} />
      case 'number':
        return <input type="number" className={base} value={(value as string) ?? ''} onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))} />
      case 'boolean':
        return (
          <div className="flex items-center gap-2 mt-1">
            <input type="checkbox" id={field.key} checked={Boolean(value)} onChange={e => onChange(e.target.checked)} className="w-4 h-4 accent-violet-600" />
            <label htmlFor={field.key} className="text-sm text-gray-600">{field.label}</label>
          </div>
        )
      case 'date':
        return <input type="date" className={base} value={(value as string) ?? ''} onChange={e => onChange(e.target.value)} />
      case 'url':
        return <input type="url" className={base} value={(value as string) ?? ''} onChange={e => onChange(e.target.value)} />
      case 'email':
        return <input type="email" className={base} value={(value as string) ?? ''} onChange={e => onChange(e.target.value)} />
      case 'enum':
        return (
          <select className={base} value={(value as string) ?? ''} onChange={e => onChange(e.target.value)}>
            <option value="">Select…</option>
            {field.enumValues?.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        )
      case 'list':
        return (
          <textarea
            rows={3}
            className={base}
            placeholder="One item per line"
            value={Array.isArray(value) ? (value as string[]).join('\n') : (value as string) ?? ''}
            onChange={e => onChange(e.target.value.split('\n').map(s => s.trim()).filter(Boolean))}
          />
        )
      default:
        return <input type="text" className={base} value={(value as string) ?? ''} onChange={e => onChange(e.target.value)} />
    }
  }

  return (
    <div className="mb-4">
      {field.type !== 'boolean' && (
        <label className="text-sm font-medium text-gray-700 mb-1 block">
          {field.label}{field.required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      {input()}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function summary(item: Item, fields: SchemaField[]): string {
  return fields.slice(0, 2).map(f => item[f.key]).filter(Boolean).join(' · ') as string || 'Untitled'
}

function validate(fields: SchemaField[], value: Item): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const f of fields) {
    if (f.required && (value[f.key] === undefined || value[f.key] === null || value[f.key] === '')) {
      errors[f.key] = `${f.label} is required`
    }
  }
  return errors
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AdminShell({
  projectSlug,
  projectName,
  allDatasets,
  currentDatasetSlug,
  currentDatasetName,
  schema,
  kind,
  currentValue,
  readOnly = false,
  previewMode = false,
  publicDemo: initialPublicDemo = 'off',
}: Props) {
  const [publicDemo, setPublicDemo] = useState<DemoMode>(initialPublicDemo)
  const [demoToggling, setDemoToggling] = useState(false)
  const [copied, setCopied] = useState(false)

  const previewUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/p/${projectSlug}/preview`
    : `https://www.agentcms.app/p/${projectSlug}/preview`

  const demoLabels: Record<DemoMode, string> = {
    off:      'Off',
    readonly: 'View only',
    editable: 'Editable',
  }
  const demoColors: Record<DemoMode, string> = {
    off:      'text-gray-400',
    readonly: 'text-blue-600',
    editable: 'text-green-600',
  }

  async function cycleDemo() {
    setDemoToggling(true)
    try {
      const res = await fetch('/api/admin/toggle-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectSlug }),
      })
      const data = await res.json()
      if (res.ok) setPublicDemo(data.publicDemo as DemoMode)
    } finally {
      setDemoToggling(false)
    }
  }

  async function copyPreviewLink() {
    await navigator.clipboard.writeText(previewUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  const [items, setItems] = useState<Item[]>(
    kind === 'collection' ? (currentValue as Item[]) : []
  )
  const [singletonValue, setSingletonValue] = useState<Item>(
    kind === 'singleton' ? (currentValue as Item) : {}
  )
  // null = nothing selected, -1 = new item, >=0 = editing item at index
  const initialItems = kind === 'collection' ? (currentValue as Item[]) : []
  const [selectedIndex, setSelectedIndex] = useState<number | null>(
    kind === 'collection' && initialItems.length > 0 ? 0 : null
  )
  const [formValue, setFormValue] = useState<Item>(
    kind === 'collection' && initialItems.length > 0 ? { ...initialItems[0] } : {}
  )
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [viewMode, setViewMode] = useState<'form' | 'table'>('form')
  // table view tracks a local copy of all rows for bulk editing
  const [tableRows, setTableRows] = useState<Item[]>(
    kind === 'collection' ? (currentValue as Item[]) : []
  )

  useEffect(() => {
    if (saveStatus === 'success') {
      const t = setTimeout(() => setSaveStatus('idle'), 3000)
      return () => clearTimeout(t)
    }
  }, [saveStatus])

  const saveEndpoint = previewMode ? '/api/admin/save-demo' : '/api/admin/save'

  const handleSave = useCallback(async (value: Item | Item[]) => {
    setSaving(true)
    setSaveStatus('idle')
    try {
      const res = await fetch(saveEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectSlug, datasetSlug: currentDatasetSlug, value }),
      })
      if (!res.ok) throw new Error()
      setSaveStatus('success')
    } catch {
      setSaveStatus('error')
    } finally {
      setSaving(false)
    }
  }, [projectSlug, currentDatasetSlug, saveEndpoint])

  // ── Column 1: Dataset nav ──────────────────────────────────────────────────

  const navBase = previewMode ? `/p/${projectSlug}/preview` : `/p/${projectSlug}`

  const col1 = (
    <div className="w-52 shrink-0 border-r border-gray-200 flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-violet-600 rounded flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-xs">A</span>
          </div>
          <span className="text-sm font-semibold text-gray-800 truncate">{projectName}</span>
        </div>
        {previewMode && (
          <div className={`mt-2 flex items-center gap-1.5 rounded px-2 py-1 ${
            readOnly
              ? 'bg-amber-50 border border-amber-200'
              : 'bg-green-50 border border-green-200'
          }`}>
            <span className={`text-xs ${readOnly ? 'text-amber-500' : 'text-green-500'}`}>●</span>
            <span className={`text-xs font-medium ${readOnly ? 'text-amber-700' : 'text-green-700'}`}>
              {readOnly ? 'View-only preview' : 'Editable preview'}
            </span>
          </div>
        )}
      </div>
      <nav className="flex-1 overflow-y-auto py-2">
        {allDatasets.map(ds => (
          <Link
            key={ds.slug}
            href={`${navBase}/${ds.slug}`}
            className={`flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${
              ds.slug === currentDatasetSlug
                ? 'bg-violet-50 text-violet-700 font-medium border-r-2 border-violet-600'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <div className="min-w-0">
              <div className="truncate">{ds.name}</div>
              <div className={`text-xs mt-0.5 truncate ${ds.slug === currentDatasetSlug ? 'text-violet-400' : 'text-gray-400'}`}>
                /{ds.slug}
              </div>
            </div>
            <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ml-2 ${
              ds.slug === currentDatasetSlug ? 'bg-violet-100 text-violet-600' : 'bg-gray-100 text-gray-400'
            }`}>
              {ds.kind === 'singleton' ? '1' : '…'}
            </span>
          </Link>
        ))}
      </nav>
      <div className="border-t border-gray-200 px-4 py-3 space-y-3">
        {/* Demo mode controls — only shown to authenticated admin */}
        {!previewMode && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-gray-500 font-medium">Share demo</span>
              <button
                onClick={cycleDemo}
                disabled={demoToggling}
                className={`text-xs font-semibold px-2 py-0.5 rounded-full border transition-colors disabled:opacity-50 ${demoColors[publicDemo]} ${
                  publicDemo === 'off'
                    ? 'border-gray-200 bg-gray-50'
                    : publicDemo === 'readonly'
                    ? 'border-blue-200 bg-blue-50'
                    : 'border-green-200 bg-green-50'
                }`}
                title="Click to cycle: Off → View only → Editable"
              >
                {demoLabels[publicDemo]}
              </button>
            </div>
            {publicDemo !== 'off' && (
              <>
                <div className="text-xs text-gray-400 mb-1.5">
                  {publicDemo === 'readonly'
                    ? 'Anyone with the link can view — not edit'
                    : 'Anyone with the link can view and edit'}
                </div>
                <button
                  onClick={copyPreviewLink}
                  className="w-full text-left text-xs text-violet-600 hover:text-violet-800 bg-violet-50 px-2 py-1 rounded truncate"
                  title={previewUrl}
                >
                  {copied ? '✓ Copied!' : '⎘ Copy preview link'}
                </button>
              </>
            )}
          </div>
        )}

        <div>
          <p className="text-xs text-gray-400 mb-1.5">Powered by AgentCMS</p>
          <div className="flex items-center gap-3">
            <a
              href={`https://www.agentcms.app/api/p/${projectSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-violet-600 hover:text-violet-800"
            >
              Visit link
            </a>
            {!previewMode && (
              <button
                onClick={async () => {
                  await fetch('/api/auth/logout', { method: 'POST' })
                  window.location.href = `/p/${projectSlug}/login`
                }}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                Logout
              </button>
            )}
            {previewMode && (
              <a
                href={`/p/${projectSlug}/login`}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                Sign in to edit
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  // ── Column 2: Item list (collection only, form mode) ─────────────────────

  const viewToggle = kind === 'collection' ? (
    <div className="flex items-center gap-0.5 bg-gray-100 rounded p-0.5">
      <button
        onClick={() => setViewMode('form')}
        className={`text-xs px-2 py-0.5 rounded transition-colors ${viewMode === 'form' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        title="Form view"
      >≡ Form</button>
      <button
        onClick={() => { setViewMode('table'); setTableRows([...items]) }}
        className={`text-xs px-2 py-0.5 rounded transition-colors ${viewMode === 'table' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        title="Table view"
      >⊞ Table</button>
    </div>
  ) : null

  const col2 = (kind === 'collection' && viewMode === 'form') ? (
    <div className="w-64 shrink-0 border-r border-gray-200 flex flex-col h-full overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          {items.length} {items.length === 1 ? 'item' : 'items'}
        </span>
        <div className="flex items-center gap-2">
          {viewToggle}
          {!readOnly && (
            <button
              onClick={() => { setSelectedIndex(-1); setFormValue({}); setFieldErrors({}) }}
              className={`text-xs px-2.5 py-1 rounded border transition-colors ${
                selectedIndex === -1
                  ? 'bg-violet-600 text-white border-violet-600'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              + New
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {items.length === 0 && selectedIndex !== -1 && (
          <p className="text-xs text-gray-400 text-center py-8 px-4">
            No items yet.<br />Click &ldquo;+ New&rdquo; to add one.
          </p>
        )}
        {items.map((item, i) => (
          <button
            key={i}
            onClick={() => { setSelectedIndex(i); setFormValue({ ...item }); setFieldErrors({}) }}
            className={`w-full text-left px-4 py-3 border-b border-gray-100 transition-colors ${
              selectedIndex === i
                ? 'bg-violet-50 border-l-2 border-l-violet-500'
                : 'hover:bg-gray-50'
            }`}
          >
            <div className="text-sm font-medium text-gray-800 truncate">
              {summary(item, schema.fields)}
            </div>
            {schema.fields[1] && Boolean(item[schema.fields[1].key]) && (
              <div className="text-xs text-gray-400 truncate mt-0.5">
                {String(item[schema.fields[1].key])}
              </div>
            )}
          </button>
        ))}
      </div>
      {saveStatus === 'success' && selectedIndex === null && (
        <div className="px-4 py-2 text-xs text-green-600 border-t border-gray-100">Saved</div>
      )}
    </div>
  ) : null

  // ── Table view (collection, table mode) ───────────────────────────────────

  function updateTableCell(rowIdx: number, key: string, val: unknown) {
    setTableRows(prev => prev.map((r, i) => i === rowIdx ? { ...r, [key]: val } : r))
  }

  const tableView = (kind === 'collection' && viewMode === 'table') ? (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-gray-800">{currentDatasetName}</h2>
          <span className="text-xs text-gray-400">{tableRows.length} {tableRows.length === 1 ? 'row' : 'rows'}</span>
          {viewToggle}
        </div>
        <div className="flex items-center gap-3">
          {saveStatus === 'success' && <span className="text-xs text-green-600">Saved</span>}
          {saveStatus === 'error'   && <span className="text-xs text-red-500">Save failed</span>}
          {!readOnly && (
            <button
              onClick={() => {
                setItems(tableRows)
                handleSave(tableRows)
              }}
              disabled={saving}
              className="bg-violet-600 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-violet-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save all'}
            </button>
          )}
          {readOnly && (
            <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded">Read-only preview</span>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm border-collapse min-w-max">
          <thead className="sticky top-0 z-10">
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 w-8">#</th>
              {schema.fields.map(f => (
                <th key={f.key} className="text-left px-3 py-2 text-xs font-semibold text-gray-500 whitespace-nowrap">
                  {f.label}{f.required && <span className="text-red-400 ml-0.5">*</span>}
                </th>
              ))}
              {!readOnly && <th className="w-8" />}
            </tr>
          </thead>
          <tbody>
            {tableRows.map((row, rowIdx) => (
              <tr key={rowIdx} className="border-b border-gray-100 hover:bg-gray-50 group">
                <td className="px-3 py-1.5 text-xs text-gray-400">{rowIdx + 1}</td>
                {schema.fields.map(f => (
                  <td key={f.key} className="px-2 py-1.5">
                    {f.type === 'boolean' ? (
                      <input
                        type="checkbox"
                        checked={Boolean(row[f.key])}
                        onChange={e => !readOnly && updateTableCell(rowIdx, f.key, e.target.checked)}
                        disabled={readOnly}
                        className="w-4 h-4 accent-violet-600"
                      />
                    ) : f.type === 'enum' ? (
                      <select
                        value={(row[f.key] as string) ?? ''}
                        onChange={e => !readOnly && updateTableCell(rowIdx, f.key, e.target.value)}
                        disabled={readOnly}
                        className="border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-violet-400 bg-white disabled:bg-gray-50 w-full min-w-[80px]"
                      >
                        <option value="">—</option>
                        {f.enumValues?.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (
                      <input
                        type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : f.type === 'url' ? 'url' : f.type === 'email' ? 'email' : 'text'}
                        value={
                          f.type === 'list'
                            ? (Array.isArray(row[f.key]) ? (row[f.key] as string[]).join(', ') : (row[f.key] as string) ?? '')
                            : (row[f.key] as string) ?? ''
                        }
                        onChange={e => {
                          if (readOnly) return
                          const val = f.type === 'number'
                            ? (e.target.value === '' ? '' : Number(e.target.value))
                            : f.type === 'list'
                            ? e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                            : e.target.value
                          updateTableCell(rowIdx, f.key, val)
                        }}
                        readOnly={readOnly}
                        placeholder={f.type === 'list' ? 'a, b, c' : ''}
                        className="border border-transparent hover:border-gray-200 focus:border-violet-400 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-violet-400 bg-transparent focus:bg-white w-full min-w-[100px] read-only:cursor-default"
                      />
                    )}
                  </td>
                ))}
                {!readOnly && (
                  <td className="px-2 py-1.5">
                    <button
                      onClick={() => {
                        const updated = tableRows.filter((_, i) => i !== rowIdx)
                        setTableRows(updated)
                      }}
                      className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all text-base leading-none"
                      title="Delete row"
                    >×</button>
                  </td>
                )}
              </tr>
            ))}
            {!readOnly && (
              <tr>
                <td colSpan={schema.fields.length + 2} className="px-3 py-2">
                  <button
                    onClick={() => setTableRows(prev => [...prev, {}])}
                    className="text-xs text-violet-600 hover:text-violet-800"
                  >
                    + Add row
                  </button>
                </td>
              </tr>
            )}
            {tableRows.length === 0 && readOnly && (
              <tr>
                <td colSpan={schema.fields.length + 1} className="px-3 py-8 text-xs text-gray-400 text-center">
                  No items yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  ) : null

  // ── Column 3: Form ────────────────────────────────────────────────────────

  const emptyState = (
    <div className="flex-1 flex items-center justify-center text-gray-400">
      <div className="text-center">
        <div className="text-3xl mb-2">←</div>
        <p className="text-sm">Select an item to edit<br />or click &ldquo;+ New&rdquo;</p>
      </div>
    </div>
  )

  const renderForm = (value: Item, onChange: (v: Item) => void, onSave: () => void, onDelete?: () => void) => (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-lg px-6 py-5">
        {schema.fields.map(f => (
          <FieldInput
            key={f.key}
            field={f}
            value={value[f.key]}
            onChange={v => onChange({ ...value, [f.key]: v })}
            error={fieldErrors[f.key]}
          />
        ))}

        <div className="flex items-center gap-3 pt-2 border-t border-gray-100 mt-2">
          {readOnly ? (
            <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded">
              Read-only preview — sign in to edit
            </span>
          ) : (
            <>
              <button
                onClick={onSave}
                disabled={saving}
                className="bg-violet-600 text-white px-4 py-2 rounded text-sm hover:bg-violet-700 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              {kind === 'collection' && selectedIndex !== -1 && selectedIndex !== null && (
                <button
                  onClick={() => { setSelectedIndex(null); setFormValue({}) }}
                  className="text-sm text-gray-500 hover:text-gray-800"
                >
                  Cancel
                </button>
              )}
              {onDelete && (
                <button
                  onClick={onDelete}
                  className="ml-auto text-sm text-red-400 hover:text-red-600"
                >
                  Delete
                </button>
              )}
              {saveStatus === 'success' && <span className="text-sm text-green-600">Saved</span>}
              {saveStatus === 'error' && <span className="text-sm text-red-500">Save failed — try again</span>}
            </>
          )}
        </div>
      </div>
    </div>
  )

  let col3: React.ReactNode = null

  const apiUrl = `https://www.agentcms.app/api/p/${projectSlug}/${currentDatasetSlug}`

  if (kind === 'singleton') {
    col3 = (
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <div className="px-6 py-3 border-b border-gray-200">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-800">{currentDatasetName}</h2>
              <p className="text-xs text-gray-400">Singleton — one record</p>
            </div>
            <a
              href={apiUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-mono text-violet-600 hover:text-violet-800 bg-violet-50 px-2 py-1 rounded truncate max-w-xs shrink-0"
              title={apiUrl}
            >
              GET /{projectSlug}/{currentDatasetSlug}
            </a>
          </div>
        </div>
        {renderForm(
          singletonValue,
          setSingletonValue,
          () => {
            const errors = validate(schema.fields, singletonValue)
            if (Object.keys(errors).length) { setFieldErrors(errors); return }
            setFieldErrors({})
            handleSave(singletonValue)
          }
        )}
      </div>
    )
  } else if (selectedIndex === null) {
    col3 = (
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <div className="px-6 py-3 border-b border-gray-200">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-800">{currentDatasetName}</h2>
              <p className="text-xs text-gray-400">Collection</p>
            </div>
            <a
              href={apiUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-mono text-violet-600 hover:text-violet-800 bg-violet-50 px-2 py-1 rounded truncate max-w-xs shrink-0"
            >
              GET /{projectSlug}/{currentDatasetSlug}
            </a>
          </div>
        </div>
        {emptyState}
      </div>
    )
  } else {
    const isNew = selectedIndex === -1
    const title = isNew ? `New ${currentDatasetName.replace(/s$/, '')}` : `Edit item ${selectedIndex + 1}`

    col3 = (
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <div className="px-6 py-3 border-b border-gray-200">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
              <p className="text-xs text-gray-400">{currentDatasetName}</p>
            </div>
            <a
              href={apiUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-mono text-violet-600 hover:text-violet-800 bg-violet-50 px-2 py-1 rounded truncate max-w-xs shrink-0"
            >
              GET /{projectSlug}/{currentDatasetSlug}
            </a>
          </div>
        </div>
        {renderForm(
          formValue,
          setFormValue,
          () => {
            const errors = validate(schema.fields, formValue)
            if (Object.keys(errors).length) { setFieldErrors(errors); return }
            setFieldErrors({})
            let updated: Item[]
            if (isNew) {
              updated = [...items, formValue]
            } else {
              updated = items.map((it, i) => i === selectedIndex ? formValue : it)
            }
            setItems(updated)
            setSelectedIndex(isNew ? updated.length - 1 : selectedIndex)
            handleSave(updated)
          },
          !isNew ? () => {
            const updated = items.filter((_, i) => i !== selectedIndex)
            setItems(updated)
            setSelectedIndex(null)
            setFormValue({})
            handleSave(updated)
          } : undefined
        )}
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      {col1}
      {viewMode === 'table' ? tableView : (
        <>
          {col2}
          {col3}
        </>
      )}
    </div>
  )
}
