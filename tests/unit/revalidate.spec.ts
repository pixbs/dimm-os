import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { revalidateViews } from '@/data/views'
import { revalidateChange, revalidateDelete, revalidateGlobal } from '@/hooks/revalidate'

vi.mock('@/data/views', () => ({ revalidateViews: vi.fn() }))

type Args = Parameters<typeof revalidateChange>[0]
const change = (doc: object, previousDoc?: object) => revalidateChange({ doc, previousDoc } as Args)

describe('a content change', () => {
  // The hooks act only inside the Next.js server.
  beforeAll(() => vi.stubEnv('NEXT_RUNTIME', 'nodejs'))
  afterAll(() => vi.unstubAllEnvs())

  it.each([
    ['publishes a window', { _status: 'published' }, undefined, 1],
    ['unpublishes a window', { _status: 'draft' }, { _status: 'published' }, 1],
    ['saves a window never published', { _status: 'draft' }, { _status: 'draft' }, 0],
    ['saves a file', {}, {}, 1],
  ])('revalidates every view when it %s', async (_, doc, previousDoc, times) => {
    vi.mocked(revalidateViews).mockClear()
    await change(doc, previousDoc)
    expect(revalidateViews).toHaveBeenCalledTimes(times)
  })

  it('revalidates every view when a document leaves or Site changes', async () => {
    vi.mocked(revalidateViews).mockClear()
    await revalidateDelete({ doc: {} } as Parameters<typeof revalidateDelete>[0])
    await revalidateGlobal({ doc: {} } as Parameters<typeof revalidateGlobal>[0])
    expect(revalidateViews).toHaveBeenCalledTimes(2)
  })
})
