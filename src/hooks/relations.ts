import {
  type CollectionAfterReadHook,
  type Field,
  type GlobalAfterReadHook,
  type PayloadRequest,
  traverseFields,
} from 'payload'

const isDoc = (value: unknown) => typeof value === 'object' && value !== null

// Payload answers a relation its reader may not see with its bare id, which looks like any other: for anyone but
// the two users, a bare id is absent.
function drop(fields: Field[], doc: unknown, req: PayloadRequest) {
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
    config: req.payload.config,
    fields,
    fillEmpty: false,
    // A read in one language holds no locale keys, which the walker otherwise expects under a localised field.
    parentIsLocalized: req.locale !== 'all',
    ref: doc as Record<string, unknown>,
  })
}

export const dropBareIds: CollectionAfterReadHook = ({ collection, doc, overrideAccess, req }) => {
  if (!req.user && !overrideAccess) drop(collection.fields, doc, req)
  return doc
}

export const dropBareIdsOfGlobal: GlobalAfterReadHook = ({ doc, global, overrideAccess, req }) => {
  if (!req.user && !overrideAccess) drop(global.fields, doc, req)
  return doc
}
