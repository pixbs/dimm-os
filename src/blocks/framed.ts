type Framed = {
  title?: string | null
  text?: string | null
  split?: boolean | null
  join?: boolean | null
}

// What a section's view takes from its frame: a joined section has no heading of its own, and a heading stands beside
// the body unless the admin says otherwise.
export function framed(block: Framed) {
  const join = Boolean(block.join)
  const title = (!join && block.title) || null
  return {
    title,
    text: (title && block.text) || null,
    split: Boolean(title) && block.split !== false,
    join,
  }
}
