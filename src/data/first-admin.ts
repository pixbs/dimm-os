import 'server-only'

import type { Payload } from 'payload'

// The first admin comes from the environment, so no environment is ever seeded by hand.
export async function createFirstAdmin(payload: Payload): Promise<void> {
  const email = process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_PASSWORD
  if (!email || !password) return

  const { totalDocs } = await payload.count({
    collection: 'users',
    locale: 'en',
    overrideAccess: true,
  })
  if (totalDocs > 0) return

  try {
    await payload.create({
      collection: 'users',
      data: { email, password, role: 'admin' },
      depth: 0,
      fallbackLocale: false,
      locale: 'en',
      overrideAccess: true,
    })
  } catch (error) {
    // The workers of a build start together, and one of them may have made it first.
    const { totalDocs: now } = await payload.count({
      collection: 'users',
      locale: 'en',
      overrideAccess: true,
    })
    if (now > 0) return
    throw error
  }
  payload.logger.info('Created the first admin user from ADMIN_EMAIL')
}
