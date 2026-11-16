import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  CollectionBeforeOperationHook,
  GlobalAfterChangeHook,
} from 'payload'

// After Payload's website template, with one tag that every view carries. Only the Next.js server holds views
// to make stale, and only it may load src/data.
async function revalidate() {
  if (!process.env.NEXT_RUNTIME) return
  const { revalidateViews } = await import('../data/views')
  revalidateViews()
}

// Only the operation knows a draft from an unpublish, whose saved status is the same.
export const noteDraft: CollectionBeforeOperationHook = ({ args, operation, req }) => {
  if (operation === 'create' || operation === 'update' || operation === 'restoreVersion')
    req.context.draft = Boolean((args as { draft?: boolean }).draft)
  return args
}

// A draft changes nothing a guest sees; every other save may.
export const revalidateChange: CollectionAfterChangeHook = async ({ context, doc }) => {
  if (!context.draft) await revalidate()
  return doc
}

export const revalidateDelete: CollectionAfterDeleteHook = async ({ doc }) => {
  await revalidate()
  return doc
}

export const revalidateGlobal: GlobalAfterChangeHook = async ({ doc }) => {
  await revalidate()
  return doc
}
