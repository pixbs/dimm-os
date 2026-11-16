import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  GlobalAfterChangeHook,
} from 'payload'

// After Payload's website template, with one tag that every view carries. Only the Next.js server holds views
// to make stale, and only it may load src/data.
async function revalidate() {
  if (!process.env.NEXT_RUNTIME) return
  const { revalidateViews } = await import('../data/views')
  revalidateViews()
}

// A draft of a window that was never published changes no view.
export const revalidateChange: CollectionAfterChangeHook = async ({ doc, previousDoc }) => {
  if (doc._status !== 'draft' || previousDoc?._status === 'published') await revalidate()
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
