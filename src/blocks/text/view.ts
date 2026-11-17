import type { TextBlock } from '@/payload-types'

export type TextView = {
  type: 'text'
  title: string | null
  text: string | null
  split: boolean
  // It continues the section above, under that section's heading.
  join: boolean
  html: string
}

// The heading stands beside the body unless the admin says otherwise; the body arrives as HTML made on the server.
export function text(block: TextBlock, html: (body: TextBlock['body']) => string): TextView {
  const join = Boolean(block.join)
  const title = (!join && block.title) || null
  return {
    type: 'text',
    title,
    text: (title && block.text) || null,
    split: Boolean(title) && block.split !== false,
    join,
    html: html(block.body),
  }
}
