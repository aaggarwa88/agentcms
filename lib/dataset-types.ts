export type DatasetKind = 'collection' | 'singleton' | 'form'

export interface SchemaField {
  key: string
  label: string
  type: string
  required?: boolean
  enumValues?: string[]
}

export interface Schema {
  fields: SchemaField[]
}

export interface Submission {
  id: string
  data: Record<string, unknown>
  createdAt: string
}
