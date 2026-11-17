import type { TextBlock } from '@/payload-types'

import { framed } from '../framed'

export type TextView = ReturnType<typeof framed> & {
  type: 'text'
  html: string
}

// The body arrives as HTML made on the server.
export function text(block: TextBlock, html: (body: TextBlock['body']) => string): TextView {
  return { type: 'text', ...framed(block), html: html(block.body) }
}
