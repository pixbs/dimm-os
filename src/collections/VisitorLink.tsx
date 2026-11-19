'use client'

import { TextareaInput, useDocumentInfo } from '@payloadcms/ui'
import { useEffect, useSyncExternalStore } from 'react'

const KEPT = 'visitor-link'
const never = () => () => {}

// Payload opens a new visitor's page after the save that made it, which drops that save's answer: the link is
// carried over in this tab under the visitor's id, taken out once, and gone when its page is left.
const carried = new Map<string, string>()
function take(id: string) {
  try {
    const [of, link] = JSON.parse(sessionStorage.getItem(KEPT) ?? '[]') as string[]
    sessionStorage.removeItem(KEPT)
    if (of && link) carried.set(of, link)
  } catch {
    // A tab without storage shows the link after the next save with a password.
  }
  return carried.get(id) ?? null
}

// The personal link, which only the answer to the save that set the password holds.
export function PersonalLink() {
  const { id, data } = useDocumentInfo()
  const answered = typeof data?.link === 'string' ? data.link : null
  const kept = useSyncExternalStore(
    never,
    () => (id ? take(String(id)) : null),
    () => null,
  )

  useEffect(() => {
    if (!id && answered && data?.id)
      sessionStorage.setItem(KEPT, JSON.stringify([String(data.id), answered]))
    return () => void (id && carried.delete(String(id)))
  }, [id, answered, data?.id])

  const link = answered ?? kept
  return link ? (
    <TextareaInput
      description="Shown once. Send it with the privacy policy, the second line."
      label="Personal link"
      path="link"
      readOnly
      value={link}
    />
  ) : null
}
