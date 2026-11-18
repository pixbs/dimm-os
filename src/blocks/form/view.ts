import type { Form as FormDoc, FormBlock } from '@/payload-types'

import { framed } from '../framed'

type Base = { name: string; label: string; required: boolean; half: boolean }
type Choice = { label: string; value: string }

// What the form organism draws for each field of the form builder.
export type FormField =
  | (Base & { kind: 'text' | 'email' | 'number' | 'date' | 'area'; value: string | null })
  | (Base & { kind: 'select' | 'radio'; options: Choice[]; value: string | null })
  | (Base & { kind: 'check'; value: boolean })
  | { kind: 'words'; html: string }

export type FormView = ReturnType<typeof framed> & {
  type: 'form'
  surface: FormBlock['surface']
  id: number
  fields: FormField[]
  submit: string | null
  note: string | null
  // Where the message goes, which a slip shows, and the privacy policy every form leads to.
  to?: string
  privacy?: { href: string; title: string; lang?: 'en' | 'de' } | null
}

type Block = NonNullable<FormDoc['fields']>[number]

const kinds = { text: 'text', email: 'email', number: 'number', date: 'date', textarea: 'area' }

// The form builder's own width is a percentage of the row.
function field(block: Block, html: (words: unknown) => string): FormField | null {
  if (block.blockType === 'message') return { kind: 'words', html: html(block.message) }
  const base = {
    name: block.name,
    label: block.label || block.name,
    required: Boolean(block.required),
    half: (block.width ?? 100) <= 50,
  }
  switch (block.blockType) {
    case 'text':
    case 'email':
    case 'number':
    case 'date':
    case 'textarea':
      return {
        ...base,
        kind: kinds[block.blockType] as 'text',
        value:
          'defaultValue' in block && block.defaultValue != null ? String(block.defaultValue) : null,
      }
    case 'select':
    case 'radio': {
      const options = (block.options ?? []).map(({ label, value }) => ({ label, value }))
      // A choice is drawn and sent by its label, so the default the builder keeps as a value is named by its label.
      const chosen = options.find(({ value }) => value === block.defaultValue)
      return { ...base, kind: block.blockType, options, value: chosen?.label ?? null }
    }
    case 'checkbox':
      return { ...base, kind: 'check', value: Boolean(block.defaultValue) }
    default:
      return null
  }
}

// A form this viewer may not read leaves the section out.
export function form(block: FormBlock, html: (words: unknown) => string): FormView | null {
  const doc = block.form
  if (typeof doc !== 'object' || !doc) return null
  return {
    type: 'form',
    ...framed(block),
    surface: block.surface,
    id: doc.id,
    fields: (doc.fields ?? []).flatMap((one) => field(one, html) ?? []),
    submit: doc.submitButtonLabel || null,
    note: block.note || null,
  }
}
