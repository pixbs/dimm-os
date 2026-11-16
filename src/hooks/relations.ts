import { type CollectionAfterReadHook, traverseFields } from 'payload'

const isDoc = (value: unknown) => typeof value === 'object' && value !== null

// Payload answers a relation its reader may not see with its bare id, which looks like any other: for anyone but
// the two users, a bare id is absent.
export const dropBareIds: CollectionAfterReadHook = ({ collection, doc, overrideAccess, req }) => {
  if (req.user || overrideAccess) return doc
  traverseFields({
    callback: ({ field, ref }) => {
      if ((field.type !== 'relationship' && field.type !== 'upload') || !isDoc(ref)) return
      const data = ref as Record<string, unknown>
      const value = data[field.name]
      const present = (one: unknown) =>
        isDoc(Array.isArray(field.relationTo) ? (one as { value?: unknown })?.value : one)
      if (Array.isArray(value)) data[field.name] = value.filter(present)
      else if (value != null && !present(value)) data[field.name] = null
    },
    fields: collection.fields,
    fillEmpty: false,
    // A read in one language holds no locale keys, which the walker otherwise expects under a localised field.
    parentIsLocalized: req.locale !== 'all',
    ref: doc,
  })
  return doc
}
