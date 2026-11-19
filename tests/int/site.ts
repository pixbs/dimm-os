import type { Payload } from 'payload'

// Keeps what the tests write of Site, and gives the way to put it back: the end-to-end tests read the fixture's.
export async function keepSite(payload: Payload) {
  const { name, email, place, timezone, counted } = await payload.findGlobal({
    slug: 'site',
    select: { name: true, email: true, place: true, timezone: true, counted: true },
    depth: 0,
    draft: false,
    fallbackLocale: false,
    locale: 'en',
    overrideAccess: true,
  })
  // Straight to the database, past the required checks: a fresh database had nothing to keep, and nothing is written.
  return () =>
    payload.db.updateGlobal({ slug: 'site', data: { name, email, place, timezone, counted } })
}
