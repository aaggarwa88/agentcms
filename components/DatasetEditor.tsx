'use client'

import { useState, useEffect, useCallback } from 'react'

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

interface Props {
  projectSlug: string
  datasetSlug: string
  schema: Schema
  kind: 'collection' | 'singleton'
  currentValue: Record<string, unknown> | Record<string, unknown>[]
}

type Item = Record<string, unknown>

function FieldInput({
  field,
  value,
  onChange,
  error,
}: {
  field: SchemaField
  value: unknown
  onChange: (val: unknown) => void
  error?: string
}) {
  const baseInputClass =
    'border border-gray-300 rounded px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-violet-400'

  const renderInput = () => {
    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            rows={3}
            className={baseInputClass}
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
          />
        )
      case 'number':
        return (
          <input
            type="number"
            className={baseInputClass}
            value={(value as string) ?? ''}
            onChange={(e) =>
              onChange(e.target.value === '' ? '' : Number(e.target.value))
            }
          />
        )
      case 'boolean':
        return (
          <div className="flex items-center gap-2 mt-1">
            <input
              type="checkbox"
              id={field.key}
              checked={Boolean(value)}
              onChange={(e) => onChange(e.target.checked)}
              className="w-4 h-4 accent-violet-600"
            />
            <label htmlFor={field.key} className="text-sm text-gray-600">
              {field.label}
            </label>
          </div>
        )
      case 'date':
        return (
          <input
            type="date"
            className={baseInputClass}
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
          />
        )
      case 'url':
        return (
          <input
            type="url"
            className={baseInputClass}
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
          />
        )
      case 'email':
        return (
          <input
            type="email"
            className={baseInputClass}
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
          />
        )
      case 'enum':
        return (
          <select
            className={baseInputClass}
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
          >
            <option value="">Select…</option>
            {field.enumValues?.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        )
      case 'list':
        return (
          <input
            type="text"
            className={baseInputClass}
            placeholder="comma separated values"
            value={
              Array.isArray(value)
                ? (value as string[]).join(', ')
                : (value as string) ?? ''
            }
            onChange={(e) => onChange(e.target.value)}
          />
        )
      default:
        return (
          <input
            type="text"
            className={baseInputClass}
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
          />
        )
    }
  }

  return (
    <div className="mb-4">
      {field.type !== 'boolean' && (
        <label className="text-sm font-medium text-gray-700 mb-1 block">
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      {renderInput()}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

function ItemForm({
  schema,
  value,
  onChange,
  onSave,
  onCancel,
  saving,
  saveStatus,
  fieldErrors,
}: {
  schema: Schema
  value: Item
  onChange: (val: Item) => void
  onSave: () => void
  onCancel: () => void
  saving: boolean
  saveStatus: 'idle' | 'success' | 'error'
  fieldErrors: Record<string, string>
}) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 my-2 bg-gray-50">
      {schema.fields.map((field) => (
        <FieldInput
          key={field.key}
          field={field}
          value={value[field.key]}
          onChange={(val) => onChange({ ...value, [field.key]: val })}
          error={fieldErrors[field.key]}
        />
      ))}
      <div className="flex items-center gap-3 mt-2">
        <button
          onClick={onSave}
          disabled={saving}
          className="bg-violet-600 text-white px-4 py-2 rounded hover:bg-violet-700 disabled:opacity-50 text-sm"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          onClick={onCancel}
          className="border border-gray-300 px-3 py-1.5 rounded text-sm hover:bg-gray-50"
        >
          Cancel
        </button>
        {saveStatus === 'success' && (
          <span className="text-sm text-green-600">Saved</span>
        )}
        {saveStatus === 'error' && (
          <span className="text-sm text-red-500">Save failed — try again</span>
        )}
      </div>
    </div>
  )
}

function itemSummary(item: Item, fields: SchemaField[]): string {
  return fields
    .slice(0, 3)
    .map((f) => item[f.key])
    .filter(Boolean)
    .join(' · ')
}

function validate(fields: SchemaField[], value: Item): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const field of fields) {
    if (field.required) {
      const val = value[field.key]
      if (val === undefined || val === null || val === '') {
        errors[field.key] = `${field.label} is required`
      }
    }
  }
  return errors
}

export default function DatasetEditor({
  projectSlug,
  datasetSlug,
  schema,
  kind,
  currentValue,
}: Props) {
  const [items, setItems] = useState<Item[]>(
    kind === 'collection' ? (currentValue as Item[]) : []
  )
  const [singletonValue, setSingletonValue] = useState<Item>(
    kind === 'singleton' ? (currentValue as Item) : {}
  )
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editingValue, setEditingValue] = useState<Item>({})
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (saveStatus === 'success') {
      const t = setTimeout(() => setSaveStatus('idle'), 3000)
      return () => clearTimeout(t)
    }
  }, [saveStatus])

  const handleSave = useCallback(
    async (value: Item | Item[]) => {
      setSaving(true)
      setSaveStatus('idle')
      try {
        const res = await fetch('/api/admin/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectSlug, datasetSlug, value }),
        })
        if (!res.ok) throw new Error('Save failed')
        setSaveStatus('success')
      } catch {
        setSaveStatus('error')
      } finally {
        setSaving(false)
      }
    },
    [projectSlug, datasetSlug]
  )

  // --- SINGLETON ---
  if (kind === 'singleton') {
    return (
      <div>
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          {schema.fields.map((field) => (
            <FieldInput
              key={field.key}
              field={field}
              value={singletonValue[field.key]}
              onChange={(val) =>
                setSingletonValue((prev) => ({ ...prev, [field.key]: val }))
              }
              error={fieldErrors[field.key]}
            />
          ))}
          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={() => {
                const errors = validate(schema.fields, singletonValue)
                if (Object.keys(errors).length > 0) {
                  setFieldErrors(errors)
                  return
                }
                setFieldErrors({})
                handleSave(singletonValue)
              }}
              disabled={saving}
              className="bg-violet-600 text-white px-4 py-2 rounded hover:bg-violet-700 disabled:opacity-50 text-sm"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            {saveStatus === 'success' && (
              <span className="text-sm text-green-600">Saved</span>
            )}
            {saveStatus === 'error' && (
              <span className="text-sm text-red-500">
                Save failed — try again
              </span>
            )}
          </div>
        </div>
      </div>
    )
  }

  // --- COLLECTION ---
  const handleCollectionSave = (updatedItems: Item[]) => {
    const errors = validate(schema.fields, editingValue)
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }
    setFieldErrors({})
    setItems(updatedItems)
    setEditingIndex(null)
    setEditingValue({})
    handleSave(updatedItems)
  }

  const handleDelete = (index: number) => {
    const updated = items.filter((_, i) => i !== index)
    setItems(updated)
    handleSave(updated)
  }

  return (
    <div>
      {/* Top bar */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-gray-500">
          {items.length} {items.length === 1 ? 'item' : 'items'}
        </span>
        <button
          onClick={() => {
            setEditingIndex(-1)
            setEditingValue({})
            setFieldErrors({})
          }}
          className="border border-gray-300 px-3 py-1.5 rounded text-sm hover:bg-gray-50"
        >
          + Add New
        </button>
      </div>

      {/* New item form */}
      {editingIndex === -1 && (
        <ItemForm
          schema={schema}
          value={editingValue}
          onChange={setEditingValue}
          onSave={() => {
            const errors = validate(schema.fields, editingValue)
            if (Object.keys(errors).length > 0) {
              setFieldErrors(errors)
              return
            }
            handleCollectionSave([...items, editingValue])
          }}
          onCancel={() => {
            setEditingIndex(null)
            setEditingValue({})
            setFieldErrors({})
          }}
          saving={saving}
          saveStatus={saveStatus}
          fieldErrors={fieldErrors}
        />
      )}

      {/* Item list */}
      <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden">
        {items.length === 0 && editingIndex !== -1 && (
          <div className="py-8 text-center text-sm text-gray-400">
            No items yet — click &ldquo;Add New&rdquo; to get started
          </div>
        )}

        {items.map((item, index) => (
          <div key={index}>
            {editingIndex === index ? (
              <div className="p-2">
                <ItemForm
                  schema={schema}
                  value={editingValue}
                  onChange={setEditingValue}
                  onSave={() => {
                    const errors = validate(schema.fields, editingValue)
                    if (Object.keys(errors).length > 0) {
                      setFieldErrors(errors)
                      return
                    }
                    const updated = items.map((it, i) =>
                      i === index ? editingValue : it
                    )
                    handleCollectionSave(updated)
                  }}
                  onCancel={() => {
                    setEditingIndex(null)
                    setEditingValue({})
                    setFieldErrors({})
                  }}
                  saving={saving}
                  saveStatus={saveStatus}
                  fieldErrors={fieldErrors}
                />
              </div>
            ) : (
              <div className="border-b border-gray-100 py-3 px-4 flex items-center justify-between last:border-b-0">
                <span className="text-sm text-gray-800">
                  {itemSummary(item, schema.fields) || `Item ${index + 1}`}
                </span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setEditingIndex(index)
                      setEditingValue({ ...item })
                      setFieldErrors({})
                    }}
                    className="text-sm text-gray-500 hover:text-gray-800"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(index)}
                    className="text-sm text-gray-500 hover:text-red-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Global save status for delete actions */}
      <div className="mt-3 h-5">
        {saveStatus === 'success' && editingIndex === null && (
          <span className="text-sm text-green-600">Saved</span>
        )}
        {saveStatus === 'error' && editingIndex === null && (
          <span className="text-sm text-red-500">Save failed — try again</span>
        )}
      </div>
    </div>
  )
}
