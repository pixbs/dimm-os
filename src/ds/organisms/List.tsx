import type { ReactNode } from 'react'

// Rows under one another, running past the text on both sides so the hover fill has room.
export function List({ children }: { children: ReactNode }) {
  return <div className="list">{children}</div>
}
