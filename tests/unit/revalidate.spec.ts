import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { revalidateViews } from '@/data/views'
import { revalidateChange, revalidateDelete, revalidateGlobal } from '@/hooks/revalidate'

vi.mock('@/data/views', () => ({ revalidateViews: vi.fn() }))

type Args = Parameters<typeof revalidateChange>[0]
const change = (context: object) => revalidateChange({ context, doc: {} } as Args)

describe('a content change', () => {
  // The hooks act only inside the Next.js server.
  beforeAll(() => vi.stubEnv('NEXT_RUNTIME', 'nodejs'))
  afterAll(() => vi.unstubAllEnvs())

  it.each([
    ['publishes or unpublishes a window', { draft: false }, 1],
    ['saves a draft', { draft: true }, 0],
    ['saves a file', {}, 1],
  ])('revalidates every view when it %s', async (_, context, times) => {
    vi.mocked(revalidateViews).mockClear()
    await change(context)
    expect(revalidateViews).toHaveBeenCalledTimes(times)
  })

  it('revalidates every view when a document leaves or Site changes', async () => {
    vi.mocked(revalidateViews).mockClear()
    await revalidateDelete({ doc: {} } as Parameters<typeof revalidateDelete>[0])
    await revalidateGlobal({ doc: {} } as Parameters<typeof revalidateGlobal>[0])
    expect(revalidateViews).toHaveBeenCalledTimes(2)
  })
})
