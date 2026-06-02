import type { SchemaField } from './dataset-types'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function isEmpty(value: unknown): boolean {
  return value === undefined || value === null || value === ''
}

function validateField(field: SchemaField, raw: unknown): { value?: unknown; error?: string } {
  if (isEmpty(raw)) {
    if (field.required) {
      return { error: `${field.label} is required` }
    }
    return { value: undefined }
  }

  switch (field.type) {
    case 'text':
    case 'textarea':
    case 'longtext':
      if (typeof raw !== 'string') {
        return { error: `${field.label} must be a string` }
      }
      return { value: raw }

    case 'email':
      if (typeof raw !== 'string' || !EMAIL_RE.test(raw)) {
        return { error: `${field.label} must be a valid email` }
      }
      return { value: raw }

    case 'url':
      if (typeof raw !== 'string') {
        return { error: `${field.label} must be a string` }
      }
      try {
        new URL(raw)
      } catch {
        return { error: `${field.label} must be a valid URL` }
      }
      return { value: raw }

    case 'number': {
      const n = typeof raw === 'number' ? raw : Number(raw)
      if (Number.isNaN(n)) {
        return { error: `${field.label} must be a number` }
      }
      return { value: n }
    }

    case 'boolean':
      if (typeof raw !== 'boolean') {
        return { error: `${field.label} must be a boolean` }
      }
      return { value: raw }

    case 'date':
      if (typeof raw !== 'string') {
        return { error: `${field.label} must be a date string` }
      }
      return { value: raw }

    case 'enum':
      if (typeof raw !== 'string') {
        return { error: `${field.label} must be a string` }
      }
      if (field.enumValues && !field.enumValues.includes(raw)) {
        return { error: `${field.label} must be one of: ${field.enumValues.join(', ')}` }
      }
      return { value: raw }

    case 'list':
      if (!Array.isArray(raw)) {
        return { error: `${field.label} must be an array` }
      }
      if (!raw.every(item => typeof item === 'string')) {
        return { error: `${field.label} must be an array of strings` }
      }
      return { value: raw }

    default:
      if (typeof raw === 'string') {
        return { value: raw }
      }
      return { error: `${field.label} has unsupported type "${field.type}"` }
  }
}

export type ValidateSubmissionResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; errors: Record<string, string> }

export function validateSubmission(
  fields: SchemaField[],
  body: Record<string, unknown>
): ValidateSubmissionResult {
  const allowedKeys = new Set(fields.map(f => f.key))
  const errors: Record<string, string> = {}
  const data: Record<string, unknown> = {}

  for (const key of Object.keys(body)) {
    if (!allowedKeys.has(key)) {
      errors[key] = `Unknown field "${key}"`
    }
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors }
  }

  for (const field of fields) {
    const result = validateField(field, body[field.key])
    if (result.error) {
      errors[field.key] = result.error
    } else if (result.value !== undefined) {
      data[field.key] = result.value
    }
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors }
  }

  return { ok: true, data }
}
